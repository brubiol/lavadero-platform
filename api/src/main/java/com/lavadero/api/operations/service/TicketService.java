package com.lavadero.api.operations.service;

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
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final DateTimeFormatter NOTA_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final TicketRepository tickets;
    private final ShiftRepository shifts;
    private final EmployeeRepository employees;
    private final ServiceTypeService serviceTypes;
    private final VehicleSizeService vehicleSizes;
    private final BusinessDayService businessDays;
    private final ServicePriceRepository servicePrices;
    private final CustomerRepository customers;

    public TicketService(TicketRepository tickets, ShiftRepository shifts, EmployeeRepository employees,
            ServiceTypeService serviceTypes, VehicleSizeService vehicleSizes, BusinessDayService businessDays,
            ServicePriceRepository servicePrices, CustomerRepository customers) {
        this.tickets = tickets;
        this.shifts = shifts;
        this.employees = employees;
        this.serviceTypes = serviceTypes;
        this.vehicleSizes = vehicleSizes;
        this.businessDays = businessDays;
        this.servicePrices = servicePrices;
        this.customers = customers;
    }

    @Transactional
    public Ticket create(CreateTicketRequest request) {
        BusinessDay businessDay = businessDays.get(request.businessDayId());
        Shift shift = getShift(request.shiftId());
        validateOpenBusinessContext(businessDay, shift);

        ServiceType serviceType = serviceTypes.get(request.serviceTypeId());
        VehicleSize vehicleSize = vehicleSizes.get(request.vehicleSizeId());
        boolean courtesy = Boolean.TRUE.equals(request.courtesy());
        BigDecimal priceAmount = resolvePrice(serviceType.getId(), vehicleSize.getId(), request.currency(), businessDay,
                courtesy, request.courtesyReason());

        PaymentMethod paymentMethod = courtesy ? PaymentMethod.CASH
                : (request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.CASH);
        int dailySeq = tickets.maxDailySeq(businessDay.getId()) + 1;
        String notaNumber = businessDay.getBusinessDate().format(NOTA_DATE) + "-" + String.format("%04d", dailySeq);
        Ticket ticket = new Ticket(businessDay, shift, serviceType, vehicleSize, dailySeq, notaNumber,
                request.vehicleDescription(), priceAmount, request.currency(), paymentMethod, courtesy, request.courtesyReason());
        ticket.replaceAssignments(assignmentsFor(request.employeeIds()));
        return tickets.save(ticket);
    }

    @Transactional(readOnly = true)
    public List<Ticket> list(Long businessDayId, Long shiftId, Long employeeId, TicketStatus status) {
        TicketStatus effectiveStatus = status == null ? TicketStatus.ACTIVE : status;
        Specification<Ticket> spec = (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), effectiveStatus));
            if (businessDayId != null) {
                predicates.add(cb.equal(root.get("businessDay").get("id"), businessDayId));
            }
            if (shiftId != null) {
                predicates.add(cb.equal(root.get("shift").get("id"), shiftId));
            }
            if (employeeId != null) {
                predicates.add(cb.equal(root.join("assignments", JoinType.INNER).get("employee").get("id"), employeeId));
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
        if (ticket.getShift().getStatus() != ShiftStatus.OPEN) {
            throw new IllegalArgumentException("Ticket can only be edited while shift is OPEN");
        }

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

        BigDecimal priceAmount = resolvePrice(serviceType.getId(), vehicleSize.getId(), currency, ticket.getBusinessDay(),
                courtesy, courtesyReason);
        ticket.update(serviceType, vehicleSize, vehicleDescription, priceAmount, currency, paymentMethod, courtesy, courtesyReason);
        if (request.employeeIds() != null) {
            ticket.replaceAssignments(assignmentsFor(request.employeeIds()));
        }
        return ticket;
    }

    @Transactional
    public Ticket voidTicket(Long id, String reason) {
        Ticket ticket = get(id);
        if (ticket.getStatus() == TicketStatus.VOIDED) {
            throw new IllegalArgumentException("Ticket is already voided");
        }
        ticket.voidTicket(reason);
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

    private BigDecimal resolvePrice(Long serviceTypeId, Long vehicleSizeId, TicketCurrency currency,
            BusinessDay businessDay, boolean courtesy, String courtesyReason) {
        if (courtesy) {
            if (courtesyReason == null || courtesyReason.isBlank()) {
                throw new IllegalArgumentException("courtesyReason is required for courtesy tickets");
            }
            return ZERO;
        }
        return servicePrices.findCurrentPrices(serviceTypeId, vehicleSizeId, currency.name(), businessDay.getBusinessDate(),
                        PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(ServicePrice::getAmount)
                .orElseThrow(() -> new IllegalArgumentException("No active service price found for ticket"));
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
