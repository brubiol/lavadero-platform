package com.lavadero.api.operations.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.domain.ServicePrice;
import com.lavadero.api.catalog.domain.ServiceType;
import com.lavadero.api.catalog.domain.VehicleSize;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.catalog.repository.ServicePriceRepository;
import com.lavadero.api.catalog.service.ServiceTypeService;
import com.lavadero.api.catalog.service.VehicleSizeService;
import com.lavadero.api.customers.domain.Customer;
import com.lavadero.api.customers.repository.CustomerRepository;
import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.domain.BusinessDayStatus;
import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.ShiftStatus;
import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.domain.TicketAssignment;
import com.lavadero.api.operations.domain.TicketCurrency;
import com.lavadero.api.operations.domain.TicketStatus;
import com.lavadero.api.operations.repository.ShiftRepository;
import com.lavadero.api.operations.repository.TicketRepository;
import com.lavadero.api.operations.web.TicketDtos.CreateTicketRequest;
import com.lavadero.api.operations.web.TicketDtos.UpdateTicketRequest;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    /** Tickets can be edited freely within this many minutes of creation. After that, only DUENO can edit. */
    private static final int EDIT_GRACE_MINUTES = 10;

    /** Audit-flag soft cap on cortesías per actor per day. Going over still allowed but the courtesy audit event is FLAGGED. */
    private static final int COURTESY_DAILY_CAP = 5;

    /** Discounts at or above this percentage on non-courtesy tickets are always flagged. */
    private static final int DISCOUNT_FLAG_THRESHOLD = 30;

    private static final ZoneId MX_ZONE = ZoneId.of("America/Monterrey");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final DateTimeFormatter NOTA_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final TicketRepository tickets;
    private final ShiftRepository shifts;
    private final EmployeeRepository employees;
    private final ServiceTypeService serviceTypes;
    private final VehicleSizeService vehicleSizes;
    private final BusinessDayService businessDays;
    private final ServicePriceRepository servicePrices;
    private final CustomerRepository customers;
    private final AuditService audit;

    public TicketService(TicketRepository tickets, ShiftRepository shifts, EmployeeRepository employees,
            ServiceTypeService serviceTypes, VehicleSizeService vehicleSizes, BusinessDayService businessDays,
            ServicePriceRepository servicePrices, CustomerRepository customers, AuditService audit) {
        this.tickets = tickets;
        this.shifts = shifts;
        this.employees = employees;
        this.serviceTypes = serviceTypes;
        this.vehicleSizes = vehicleSizes;
        this.businessDays = businessDays;
        this.servicePrices = servicePrices;
        this.customers = customers;
        this.audit = audit;
    }

    @Transactional
    public Ticket create(CreateTicketRequest request) {
        BusinessDay businessDay = businessDays.get(request.businessDayId());
        Shift shift = getShift(request.shiftId());
        validateOpenBusinessContext(businessDay, shift);

        ServiceType serviceType = serviceTypes.get(request.serviceTypeId());
        VehicleSize vehicleSize = vehicleSizes.get(request.vehicleSizeId());
        boolean courtesy = Boolean.TRUE.equals(request.courtesy());
        BigDecimal discount = courtesy ? ZERO
                : (request.discountPercent() != null ? request.discountPercent() : ZERO);
        BigDecimal[] resolved = resolvePrice(serviceType.getId(), vehicleSize.getId(), request.currency(), businessDay,
                courtesy, request.courtesyReason(), discount);
        BigDecimal originalPriceAmount = resolved[1];
        BigDecimal surcharge = surchargeOf(courtesy, request.surchargeAmount());
        BigDecimal priceAmount = (!courtesy && request.priceOverride() != null
                && request.priceOverride().compareTo(ZERO) >= 0)
                ? request.priceOverride().setScale(2, RoundingMode.HALF_UP)
                : resolved[0].add(surcharge).setScale(2, RoundingMode.HALF_UP);

        PaymentMethod paymentMethod = courtesy ? PaymentMethod.CASH
                : (request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.CASH);
        int dailySeq = tickets.maxDailySeq(businessDay.getId()) + 1;
        String notaNumber = businessDay.getBusinessDate().format(NOTA_DATE) + "-" + String.format("%04d", dailySeq);
        Ticket ticket = new Ticket(businessDay, shift, serviceType, vehicleSize, dailySeq, notaNumber,
                request.vehicleDescription(), priceAmount, discount, originalPriceAmount,
                request.currency(), paymentMethod, courtesy, request.courtesyReason());
        ticket.setOccurredAt(request.occurredAt() != null ? request.occurredAt() : Instant.now());
        if (request.internalRef() != null && !request.internalRef().isBlank()) {
            ticket.setInternalRef(request.internalRef().trim());
        }
        if (!courtesy && request.priceOverride() != null && request.priceOverride().compareTo(ZERO) >= 0) {
            ticket.setPriceOverride(request.priceOverride().setScale(2, RoundingMode.HALF_UP));
        }
        ticket.setSurchargeAmount(surcharge);
        ticket.setSurchargeReason(normalizeSurchargeReason(courtesy, request.surchargeReason()));
        ticket.setDiscountReason(normalizeDiscountReason(courtesy, discount, request.discountReason()));
        ticket.replaceAssignments(assignmentsFor(request.employeeIds()));
        if (request.customerId() != null) {
            // Optional at-creation customer link (loyalty punch advances automatically
            // via CustomerService.getProfile() which counts active tickets per customer).
            Customer customer = customers.findByIdAndActiveTrue(request.customerId())
                    .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Customer not found"));
            ticket.attachCustomer(customer);
        }
        Ticket saved = tickets.save(ticket);
        String actor = currentActor();
        audit.record("TICKET_CREATED", "TICKET", saved.getId(), null, saved.getNotaNumber());
        // Price override — always flag when operator manually sets a price
        if (!courtesy && saved.getPriceOverride() != null) {
            BigDecimal catalogPrice = originalPriceAmount;
            BigDecimal overridePrice = saved.getPriceOverride();
            BigDecimal difference = catalogPrice.subtract(overridePrice);
            audit.recordFlagged("TICKET_PRICE_OVERRIDE", "TICKET", saved.getId(),
                    "Precio manual: $" + overridePrice.toPlainString()
                            + " vs catálogo $" + catalogPrice.toPlainString()
                            + " (diferencia $" + difference.toPlainString() + ")",
                    "priceOverride=" + overridePrice.toPlainString()
                            + " catalogPrice=" + catalogPrice.toPlainString()
                            + " difference=" + difference.toPlainString()
                            + " actor=" + actor);
        }
        if (courtesy) {
            long courtesyToday = audit.countActorActionToday("TICKET_COURTESY");
            if (courtesyToday >= COURTESY_DAILY_CAP) {
                audit.recordFlagged("TICKET_COURTESY", "TICKET", saved.getId(),
                        "Excede el límite diario de cortesías (" + COURTESY_DAILY_CAP + ")",
                        saved.getNotaNumber() + " · " + (request.courtesyReason() == null ? "" : request.courtesyReason()));
            } else {
                audit.record("TICKET_COURTESY", "TICKET", saved.getId(),
                        request.courtesyReason(), saved.getNotaNumber());
            }
        } else if (discount.compareTo(ZERO) > 0) {
            // High discount flag — additional flag for discounts at or above threshold
            if (discount.intValue() >= DISCOUNT_FLAG_THRESHOLD) {
                audit.recordFlagged("TICKET_HIGH_DISCOUNT", "TICKET", saved.getId(),
                        "Descuento de " + discount.toPlainString() + "% en ticket #" + saved.getNotaNumber(),
                        "discountPercent=" + discount.toPlainString()
                                + " priceAmount=" + saved.getPriceAmount().toPlainString()
                                + " actor=" + actor);
            }
            audit.record("TICKET_DISCOUNT", "TICKET", saved.getId(),
                    discount + "%", saved.getNotaNumber());
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Ticket> list(Long businessDayId, Long shiftId, Long employeeId, String notaNumber, TicketStatus status) {
        TicketStatus effectiveStatus = status == null ? TicketStatus.ACTIVE : status;
        Specification<Ticket> spec = (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> predicates = new ArrayList<>();
            // nota_number lookup is cross-date; skip status filter so both ACTIVE and VOIDED are reachable
            if (notaNumber == null || notaNumber.isBlank()) {
                predicates.add(cb.equal(root.get("status"), effectiveStatus));
            }
            if (notaNumber != null && !notaNumber.isBlank()) {
                predicates.add(cb.equal(root.get("notaNumber"), notaNumber.trim()));
            } else {
                if (businessDayId != null) {
                    predicates.add(cb.equal(root.get("businessDay").get("id"), businessDayId));
                }
                if (shiftId != null) {
                    predicates.add(cb.equal(root.get("shift").get("id"), shiftId));
                }
                if (employeeId != null) {
                    predicates.add(cb.equal(root.join("assignments", JoinType.INNER).get("employee").get("id"), employeeId));
                }
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return tickets.findAll(spec, Sort.by("dailySeq").ascending());
    }

    @Transactional(readOnly = true)
    public Ticket get(Long id) {
        return tickets.findWithDetailsById(id).orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
    }

    @Transactional
    public Ticket update(Long id, UpdateTicketRequest request) {
        Ticket ticket = get(id);
        if (ticket.getStatus() == TicketStatus.VOIDED) {
            throw new IllegalArgumentException("Voided tickets cannot be edited");
        }

        // Edit grace window — after EDIT_GRACE_MINUTES, only the dueño can change
        // financially-relevant fields (price, courtesy, discount, payment method, service,
        // size, surcharge, price override). Description / notes / employee assignments /
        // hora can be corrected any time — they're not theft vectors.
        long minutesSinceCreation = Duration.between(ticket.getCreatedAt(), Instant.now()).toMinutes();
        if (minutesSinceCreation > EDIT_GRACE_MINUTES && !isDueno() && wouldChangeFinancialFields(request, ticket)) {
            throw new IllegalArgumentException(
                    "El precio, descuento, cortesía o forma de pago de este ticket ya no se pueden modificar ("
                            + EDIT_GRACE_MINUTES + " min). Sí puedes corregir descripción, notas y lavadores. "
                            + "Para cambios de precio, pide al dueño o cancela y crea uno nuevo.");
        }

        // Capture before-snapshot for audit trail
        String beforeSnap = snapshotOf(ticket);

        ServiceType serviceType = request.serviceTypeId() == null
                ? ticket.getServiceType()
                : serviceTypes.get(request.serviceTypeId());
        VehicleSize vehicleSize = request.vehicleSizeId() == null
                ? ticket.getVehicleSize()
                : vehicleSizes.get(request.vehicleSizeId());
        TicketCurrency currency = request.currency() == null ? ticket.getCurrency() : request.currency();
        boolean courtesy = request.courtesy() == null ? ticket.isCourtesy() : request.courtesy();
        String courtesyReason = request.courtesyReason() == null ? ticket.getCourtesyReason() : request.courtesyReason();
        String vehicleDescription = request.vehicleDescription() == null
                ? ticket.getVehicleDescription()
                : request.vehicleDescription();
        PaymentMethod paymentMethod = courtesy ? PaymentMethod.CASH
                : (request.paymentMethod() != null ? request.paymentMethod() : ticket.getPaymentMethod());
        BigDecimal discount = courtesy ? ZERO
                : (request.discountPercent() != null ? request.discountPercent() : ticket.getDiscountPercent());
        BigDecimal[] resolved = resolvePrice(serviceType.getId(), vehicleSize.getId(), currency, ticket.getBusinessDay(),
                courtesy, courtesyReason, discount);
        BigDecimal originalPriceAmount = resolved[1];
        // Surcharge: explicit field beats prior value; null leaves it untouched. Cortesía forces zero.
        BigDecimal surcharge = courtesy ? ZERO
                : (request.surchargeAmount() != null ? request.surchargeAmount().setScale(2, RoundingMode.HALF_UP)
                        : ticket.getSurchargeAmount());
        BigDecimal priceAmount = (!courtesy && request.priceOverride() != null
                && request.priceOverride().compareTo(ZERO) >= 0)
                ? request.priceOverride().setScale(2, RoundingMode.HALF_UP)
                : resolved[0].add(surcharge).setScale(2, RoundingMode.HALF_UP);
        BigDecimal override = (!courtesy && request.priceOverride() != null
                && request.priceOverride().compareTo(ZERO) >= 0)
                ? request.priceOverride().setScale(2, RoundingMode.HALF_UP) : ticket.getPriceOverride();
        ticket.update(serviceType, vehicleSize, vehicleDescription, priceAmount, discount, originalPriceAmount,
                currency, paymentMethod, courtesy, courtesyReason, request.occurredAt(), request.internalRef(),
                request.notes());
        ticket.setPriceOverride(override);
        ticket.setSurchargeAmount(surcharge);
        if (courtesy) {
            ticket.setSurchargeReason(null);
        } else if (request.surchargeReason() != null) {
            ticket.setSurchargeReason(request.surchargeReason().isBlank() ? null : request.surchargeReason().trim());
        }
        // Discount reason mirrors surcharge: null leaves untouched, blank clears,
        // and validateDiscountReason enforces non-blank when discount > 0.
        if (courtesy) {
            ticket.setDiscountReason(null);
        } else if (request.discountReason() != null) {
            ticket.setDiscountReason(request.discountReason().isBlank() ? null : request.discountReason().trim());
        }
        validateDiscountReason(courtesy, discount, ticket.getDiscountReason());
        if (request.employeeIds() != null) {
            ticket.replaceAssignments(assignmentsFor(request.employeeIds()));
        }
        String afterSnap = snapshotOf(ticket);
        String diff = beforeSnap.equals(afterSnap) ? null : "ANTES: " + beforeSnap + " | DESPUÉS: " + afterSnap;
        audit.record("TICKET_EDITED", "TICKET", ticket.getId(), ticket.getNotaNumber(), diff);
        // Price override on edit — flag whenever a manual price is set or changed
        if (!courtesy && override != null) {
            BigDecimal catalogPrice = originalPriceAmount;
            BigDecimal difference = catalogPrice.subtract(override);
            String actor = currentActor();
            audit.recordFlagged("TICKET_PRICE_OVERRIDE", "TICKET", ticket.getId(),
                    "Precio manual: $" + override.toPlainString()
                            + " vs catálogo $" + catalogPrice.toPlainString()
                            + " (diferencia $" + difference.toPlainString() + ")",
                    "priceOverride=" + override.toPlainString()
                            + " catalogPrice=" + catalogPrice.toPlainString()
                            + " difference=" + difference.toPlainString()
                            + " actor=" + actor);
        }
        return ticket;
    }

    private static String snapshotOf(Ticket t) {
        return String.format("nota=%s precio=%s cortesia=%s desc=%s pago=%s",
                t.getNotaNumber(),
                t.getPriceAmount() == null ? "-" : t.getPriceAmount().toPlainString(),
                t.isCourtesy(),
                t.getDiscountPercent() == null ? "-" : t.getDiscountPercent().toPlainString(),
                t.getPaymentMethod());
    }

    private static boolean isDueno() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> "ROLE_DUENO".equals(a.getAuthority()));
    }

    /** Returns true if the update would change any field that has fraud implications. */
    private static boolean wouldChangeFinancialFields(UpdateTicketRequest req, Ticket current) {
        if (req.serviceTypeId() != null && !req.serviceTypeId().equals(current.getServiceType().getId())) return true;
        if (req.vehicleSizeId() != null && !req.vehicleSizeId().equals(current.getVehicleSize().getId())) return true;
        if (req.courtesy() != null && req.courtesy() != current.isCourtesy()) return true;
        if (req.paymentMethod() != null && req.paymentMethod() != current.getPaymentMethod()) return true;
        BigDecimal currentDiscount = current.getDiscountPercent() == null ? ZERO : current.getDiscountPercent();
        if (req.discountPercent() != null && req.discountPercent().compareTo(currentDiscount) != 0) return true;
        BigDecimal currentOverride = current.getPriceOverride() == null ? null : current.getPriceOverride();
        if (req.priceOverride() != null && (currentOverride == null || req.priceOverride().compareTo(currentOverride) != 0)) return true;
        BigDecimal currentSurcharge = current.getSurchargeAmount() == null ? ZERO : current.getSurchargeAmount();
        if (req.surchargeAmount() != null && req.surchargeAmount().compareTo(currentSurcharge) != 0) return true;
        if (req.currency() != null && req.currency() != current.getCurrency()) return true;
        return false;
    }

    private static String currentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) return "system";
        return auth.getName();
    }

    private BigDecimal surchargeOf(boolean courtesy, BigDecimal raw) {
        if (courtesy || raw == null || raw.signum() <= 0) {
            return ZERO;
        }
        return raw.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeSurchargeReason(boolean courtesy, String raw) {
        if (courtesy || raw == null || raw.isBlank()) {
            return null;
        }
        return raw.trim();
    }

    /** Discount reason is required whenever the cashier applies a real discount.
     *  Courtesy zeros the discount out and skips the reason entirely. */
    private String normalizeDiscountReason(boolean courtesy, BigDecimal discount, String raw) {
        if (courtesy) {
            return null;
        }
        // A reason may accompany a zero-discount ticket (e.g. a Prepago redemption
        // marker). Only require one when an actual discount percent is applied.
        validateDiscountReason(courtesy, discount, raw);
        return raw == null || raw.isBlank() ? null : raw.trim();
    }

    private void validateDiscountReason(boolean courtesy, BigDecimal discount, String reason) {
        if (courtesy) return;
        if (discount == null || discount.signum() <= 0) return;
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Captura el motivo del descuento.");
        }
    }

    @Transactional
    public Ticket voidTicket(Long id, String reason) {
        Ticket ticket = get(id);
        if (ticket.getStatus() == TicketStatus.VOIDED) {
            throw new IllegalArgumentException("Ticket is already voided");
        }
        ticket.voidTicket(reason);
        audit.record("TICKET_VOIDED", "TICKET", ticket.getId(), reason, ticket.getNotaNumber());
        return ticket;
    }

    @Transactional
    public Ticket attachCustomer(Long ticketId, Long customerId) {
        Ticket ticket = get(ticketId);
        if (ticket.getStatus() == TicketStatus.VOIDED) {
            throw new IllegalArgumentException("Cannot attach customer to voided ticket");
        }
        Customer customer = customers.findByIdAndActiveTrue(customerId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Customer not found"));
        ticket.attachCustomer(customer);
        return ticket;
    }

    private Shift getShift(Long id) {
        return shifts.findById(id).orElseThrow(() -> new EntityNotFoundException("Shift not found"));
    }

    private void validateOpenBusinessContext(BusinessDay businessDay, Shift shift) {
        if (!shift.getBusinessDay().getId().equals(businessDay.getId())) {
            throw new IllegalArgumentException("Shift does not belong to business day");
        }
        if (businessDay.getStatus() != BusinessDayStatus.OPEN) {
            throw new IllegalArgumentException("Business day must be OPEN");
        }
        if (shift.getStatus() != ShiftStatus.OPEN) {
            throw new IllegalArgumentException("Shift must be OPEN");
        }
    }

    // Returns [finalPrice, originalPrice]. For courtesy tickets both are ZERO.
    private BigDecimal[] resolvePrice(Long serviceTypeId, Long vehicleSizeId, TicketCurrency currency,
            BusinessDay businessDay, boolean courtesy, String courtesyReason, BigDecimal discountPercent) {
        if (courtesy) {
            return new BigDecimal[]{ZERO, ZERO};
        }
        BigDecimal base = servicePrices.findCurrentPrices(serviceTypeId, vehicleSizeId, currency.name(),
                        businessDay.getBusinessDate(), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(ServicePrice::getAmount)
                .orElseThrow(() -> new IllegalArgumentException("No active service price found for ticket"));
        if (discountPercent == null || discountPercent.compareTo(ZERO) == 0) {
            return new BigDecimal[]{base, base};
        }
        BigDecimal factor = BigDecimal.ONE.subtract(discountPercent.divide(HUNDRED, 4, RoundingMode.HALF_UP));
        BigDecimal finalPrice = base.multiply(factor).setScale(2, RoundingMode.HALF_UP);
        return new BigDecimal[]{finalPrice, base};
    }

    private List<TicketAssignment> assignmentsFor(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException("At least one employee is required");
        }
        if (new HashSet<>(employeeIds).size() != employeeIds.size()) {
            throw new IllegalArgumentException("Duplicate employees are not allowed");
        }

        List<Employee> lavadores = employeeIds.stream()
                .map(this::getActiveEmployee)
                .toList();
        List<BigDecimal> shares = equalShares(lavadores.size());
        List<TicketAssignment> assignments = new ArrayList<>();
        for (int i = 0; i < lavadores.size(); i++) {
            assignments.add(new TicketAssignment(lavadores.get(i), shares.get(i)));
        }
        return assignments;
    }

    private Employee getActiveEmployee(Long id) {
        Employee employee = employees.findById(id).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        if (!employee.isActive()) {
            throw new IllegalArgumentException("Employee must be active");
        }
        return employee;
    }

    private List<BigDecimal> equalShares(int count) {
        BigDecimal countValue = BigDecimal.valueOf(count);
        BigDecimal base = new BigDecimal("100.00").divide(countValue, 2, RoundingMode.DOWN);
        List<BigDecimal> shares = new ArrayList<>();
        BigDecimal assigned = ZERO;
        for (int i = 0; i < count; i++) {
            if (i == count - 1) {
                shares.add(new BigDecimal("100.00").subtract(assigned));
            } else {
                shares.add(base);
                assigned = assigned.add(base);
            }
        }
        return shares;
    }
}
