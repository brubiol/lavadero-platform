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
            @DecimalMin("0.01") BigDecimal priceOverride,
            @DecimalMin("0") BigDecimal surchargeAmount,
            @Size(max = 120) String surchargeReason,
            @Size(max = 120) String discountReason,
            @Size(max = 500) String notes) {
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
            @DecimalMin("0.01") BigDecimal priceOverride,
            @DecimalMin("0") BigDecimal surchargeAmount,
            @Size(max = 120) String surchargeReason,
            @Size(max = 120) String discountReason,
            @Size(max = 500) String notes) {
    }

    public record VoidTicketRequest(@NotNull @Size(min = 1, max = 500) String reason) {
    }

    public record AttachCustomerRequest(@NotNull Long customerId) {
    }

    public record TicketAssignmentResponse(Long employeeId, String employeeName, BigDecimal sharePct) {
        public static TicketAssignmentResponse from(TicketAssignment assignment) {
            return new TicketAssignmentResponse(assignment.getEmployee().getId(), assignment.getEmployee().getFullName(),
                    assignment.getSharePct());
        }
    }

    public record TicketResponse(Long id, Long businessDayId, Long shiftId, Long serviceTypeId, String serviceTypeName,
            Long vehicleSizeId, String vehicleSizeName, Integer dailySeq, String notaNumber,
            String vehicleDescription, BigDecimal priceAmount, BigDecimal discountPercent,
            BigDecimal originalPriceAmount, TicketCurrency currency, PaymentMethod paymentMethod,
            boolean courtesy, String courtesyReason, TicketStatus status, String voidReason, Instant voidedAt,
            List<TicketAssignmentResponse> assignments, Instant createdAt, Instant updatedAt,
            Long customerId, String customerName, Instant occurredAt, String internalRef, BigDecimal priceOverride,
            BigDecimal surchargeAmount, String surchargeReason, String discountReason, String notes) {
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
                    ticket.getNotes());
        }
    }
}
