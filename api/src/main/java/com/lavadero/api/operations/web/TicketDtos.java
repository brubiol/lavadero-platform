package com.lavadero.api.operations.web;

import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.domain.TicketAssignment;
import com.lavadero.api.operations.domain.TicketCurrency;
import com.lavadero.api.operations.domain.TicketStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class TicketDtos {
    private TicketDtos() {
    }

    public record CreateTicketRequest(
            @NotNull Long businessDayId,
            @NotNull Long shiftId,
            @NotNull Long serviceTypeId,
            @NotNull Long vehicleSizeId,
            @NotNull TicketCurrency currency,
            PaymentMethod paymentMethod,
            @Size(max = 160) String vehicleDescription,
            Boolean courtesy,
            @Size(max = 500) String courtesyReason,
            @DecimalMin("0") @DecimalMax("100") BigDecimal discountPercent,
            @NotEmpty List<@NotNull Long> employeeIds,
            Instant occurredAt,
            @Size(max = 40) String internalRef,
            @DecimalMin("0") BigDecimal priceOverride,
            @DecimalMin("0") BigDecimal surchargeAmount,
            @Size(max = 120) String surchargeReason,
            @Size(max = 120) String discountReason,
            @Size(max = 500) String notes,
            Long customerId,
            List<@NotNull Long> extraServiceTypeIds,
            Long redeemCustomerPackageId) {
    }

    public record UpdateTicketRequest(
            Long serviceTypeId,
            Long vehicleSizeId,
            TicketCurrency currency,
            PaymentMethod paymentMethod,
            @Size(max = 160) String vehicleDescription,
            Boolean courtesy,
            @Size(max = 500) String courtesyReason,
            @DecimalMin("0") @DecimalMax("100") BigDecimal discountPercent,
            List<@NotNull Long> employeeIds,
            Instant occurredAt,
            @Size(max = 40) String internalRef,
            @DecimalMin("0") BigDecimal priceOverride,
            @DecimalMin("0") BigDecimal surchargeAmount,
            @Size(max = 120) String surchargeReason,
            @Size(max = 120) String discountReason,
            @Size(max = 500) String notes,
            List<@NotNull Long> extraServiceTypeIds) {
    }

    public record VoidTicketRequest(@NotNull @Size(min = 1, max = 500) String reason) {
    }

    public record AttachCustomerRequest(@NotNull Long customerId) {
    }

    public record TicketExtraResponse(Long serviceTypeId, String name, BigDecimal amount) {
        public static TicketExtraResponse from(com.lavadero.api.operations.domain.TicketExtra extra) {
            return new TicketExtraResponse(extra.getServiceType().getId(), extra.getName(), extra.getAmount());
        }
    }

    /**
     * A lavador's slice of the ticket plus an estimate of what they earn from
     * this one car. Pay is a flat amount per car (not a % of the sale): for
     * COMMISSION washers it's their in/out-of-shift per-car rate, for SALARY
     * washers their per-car productivity bonus on top of base. The estimate
     * does not apply end-of-week falta penalties (which can drop a COMMISSION
     * rate to $15/$10 a car), so it is labeled as such in the UI.
     */
    public record TicketAssignmentResponse(Long employeeId, String employeeName, BigDecimal sharePct,
            BigDecimal estimatedEarning, BigDecimal perCarRate, String payrollType) {
        private static final java.math.BigDecimal ONE_HUNDRED = new BigDecimal("100");

        public static TicketAssignmentResponse from(TicketAssignment assignment) {
            com.lavadero.api.catalog.domain.Employee employee = assignment.getEmployee();
            BigDecimal share = assignment.getSharePct()
                    .divide(ONE_HUNDRED, 4, java.math.RoundingMode.HALF_UP);
            boolean inShift = employee.getPrimaryShift() == null
                    || employee.getPrimaryShift().equals(assignment.getTicket().getShift().getShiftType().name());
            BigDecimal perCarRate = switch (employee.getPayrollType()) {
                case COMMISSION -> nz(inShift ? employee.getCommissionRate() : employee.getOutOfShiftCommissionRate());
                case SALARY -> nz(employee.getProductivityBonusRate());
            };
            BigDecimal earning = share.multiply(perCarRate).setScale(2, java.math.RoundingMode.HALF_UP);
            return new TicketAssignmentResponse(employee.getId(), employee.getFullName(), assignment.getSharePct(),
                    earning, perCarRate.setScale(2, java.math.RoundingMode.HALF_UP), employee.getPayrollType().name());
        }

        private static BigDecimal nz(BigDecimal value) {
            return value == null ? BigDecimal.ZERO : value;
        }
    }

    public record TicketResponse(Long id, Long businessDayId, Long shiftId, Long serviceTypeId, String serviceTypeName,
            Long vehicleSizeId, String vehicleSizeName, Integer dailySeq, String notaNumber,
            String vehicleDescription, BigDecimal priceAmount, BigDecimal discountPercent,
            BigDecimal originalPriceAmount, TicketCurrency currency, PaymentMethod paymentMethod,
            boolean courtesy, String courtesyReason, TicketStatus status, String voidReason, Instant voidedAt,
            List<TicketAssignmentResponse> assignments, Instant createdAt, Instant updatedAt,
            Long customerId, String customerName, Instant occurredAt, String internalRef, BigDecimal priceOverride,
            BigDecimal surchargeAmount, String surchargeReason, String discountReason, String notes,
            List<TicketExtraResponse> extras, Long customerPackageId) {
        public static TicketResponse from(Ticket ticket) {
            return new TicketResponse(ticket.getId(), ticket.getBusinessDay().getId(), ticket.getShift().getId(),
                    ticket.getServiceType().getId(), ticket.getServiceType().getName(), ticket.getVehicleSize().getId(),
                    ticket.getVehicleSize().getName(), ticket.getDailySeq(), ticket.getNotaNumber(),
                    ticket.getVehicleDescription(), ticket.getPriceAmount(), ticket.getDiscountPercent(),
                    ticket.getOriginalPriceAmount(), ticket.getCurrency(),
                    ticket.getPaymentMethod(), ticket.isCourtesy(), ticket.getCourtesyReason(), ticket.getStatus(),
                    ticket.getVoidReason(), ticket.getVoidedAt(),
                    ticket.getAssignments().stream().map(TicketAssignmentResponse::from).toList(),
                    ticket.getCreatedAt(), ticket.getUpdatedAt(),
                    ticket.getCustomer() != null ? ticket.getCustomer().getId() : null,
                    ticket.getCustomer() != null ? ticket.getCustomer().getName() : null,
                    ticket.getOccurredAt(), ticket.getInternalRef(), ticket.getPriceOverride(),
                    ticket.getSurchargeAmount(), ticket.getSurchargeReason(), ticket.getDiscountReason(),
                    ticket.getNotes(),
                    ticket.getExtras().stream().map(TicketExtraResponse::from).toList(),
                    ticket.getCustomerPackage() != null ? ticket.getCustomerPackage().getId() : null);
        }
    }
}
