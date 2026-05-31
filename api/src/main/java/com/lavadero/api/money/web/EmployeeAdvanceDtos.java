package com.lavadero.api.money.web;

import com.lavadero.api.money.domain.EmployeeAdvance;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class EmployeeAdvanceDtos {
    private EmployeeAdvanceDtos() {
    }

    public record CreateEmployeeAdvanceRequest(
            Long businessDayId,
            Long shiftId,
            @NotNull Long employeeId,
            @NotNull LocalDate advanceDate,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @Size(max = 500) String reason) {
    }

    public record UpdateEmployeeAdvanceRequest(
            Long employeeId,
            LocalDate advanceDate,
            @DecimalMin(value = "0.01") BigDecimal amount,
            @Size(max = 500) String reason) {
    }

    public record EmployeeAdvanceResponse(Long id, Long businessDayId, Long shiftId, Long employeeId,
            String employeeName, LocalDate advanceDate, BigDecimal amount, String reason,
            Instant createdAt, Instant updatedAt) {
        public static EmployeeAdvanceResponse from(EmployeeAdvance advance) {
            return new EmployeeAdvanceResponse(
                    advance.getId(),
                    advance.getBusinessDay() == null ? null : advance.getBusinessDay().getId(),
                    advance.getShift() == null ? null : advance.getShift().getId(),
                    advance.getEmployee().getId(),
                    advance.getEmployee().getFullName(),
                    advance.getAdvanceDate(),
                    advance.getAmount(),
                    advance.getReason(),
                    advance.getCreatedAt(),
                    advance.getUpdatedAt());
        }
    }
}
