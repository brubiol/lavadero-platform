package com.lavadero.api.operations.web;

import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.domain.TicketAssignment;
import com.lavadero.api.operations.domain.TicketCurrency;
import com.lavadero.api.operations.domain.TicketStatus;
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
            @Size(max = 160) String vehicleDescription,
            Boolean courtesy,
            @Size(max = 500) String courtesyReason,
            @NotEmpty List<@NotNull Long> employeeIds) {
    }

    public record UpdateTicketRequest(
            Long serviceTypeId,
            Long vehicleSizeId,
            TicketCurrency currency,
            @Size(max = 160) String vehicleDescription,
            Boolean courtesy,
            @Size(max = 500) String courtesyReason,
            List<@NotNull Long> employeeIds) {
    }

    public record VoidTicketRequest(@NotNull @Size(min = 1, max = 500) String reason) {
    }

    public record TicketAssignmentResponse(Long employeeId, String employeeName, BigDecimal sharePct) {
        public static TicketAssignmentResponse from(TicketAssignment assignment) {
            return new TicketAssignmentResponse(assignment.getEmployee().getId(), assignment.getEmployee().getFullName(),
                    assignment.getSharePct());
        }
    }

    public record TicketResponse(Long id, Long businessDayId, Long shiftId, Long serviceTypeId, String serviceTypeName,
            Long vehicleSizeId, String vehicleSizeName, Integer dailySeq, String notaNumber,
            String vehicleDescription, BigDecimal priceAmount, TicketCurrency currency, boolean courtesy,
            String courtesyReason, TicketStatus status, String voidReason, Instant voidedAt,
            List<TicketAssignmentResponse> assignments, Instant createdAt, Instant updatedAt) {
        public static TicketResponse from(Ticket ticket) {
            return new TicketResponse(ticket.getId(), ticket.getBusinessDay().getId(), ticket.getShift().getId(),
                    ticket.getServiceType().getId(), ticket.getServiceType().getName(), ticket.getVehicleSize().getId(),
                    ticket.getVehicleSize().getName(), ticket.getDailySeq(), ticket.getNotaNumber(),
                    ticket.getVehicleDescription(), ticket.getPriceAmount(), ticket.getCurrency(), ticket.isCourtesy(),
                    ticket.getCourtesyReason(), ticket.getStatus(), ticket.getVoidReason(), ticket.getVoidedAt(),
                    ticket.getAssignments().stream().map(TicketAssignmentResponse::from).toList(),
                    ticket.getCreatedAt(), ticket.getUpdatedAt());
        }
    }
}
