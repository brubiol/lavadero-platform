package com.lavadero.api.money.web;

import com.lavadero.api.money.domain.Withdrawal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class WithdrawalDtos {
    private WithdrawalDtos() {
    }

    public record CreateWithdrawalRequest(
            Long businessDayId,
            Long shiftId,
            @NotNull LocalDate withdrawalDate,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @Size(max = 500) String reason) {
    }

    public record UpdateWithdrawalRequest(
            LocalDate withdrawalDate,
            @DecimalMin(value = "0.01") BigDecimal amount,
            @Size(max = 500) String reason) {
    }

    public record WithdrawalResponse(Long id, Long businessDayId, Long shiftId, LocalDate withdrawalDate,
            BigDecimal amount, String reason, Instant createdAt, Instant updatedAt) {
        public static WithdrawalResponse from(Withdrawal withdrawal) {
            return new WithdrawalResponse(
                    withdrawal.getId(),
                    withdrawal.getBusinessDay() == null ? null : withdrawal.getBusinessDay().getId(),
                    withdrawal.getShift() == null ? null : withdrawal.getShift().getId(),
                    withdrawal.getWithdrawalDate(),
                    withdrawal.getAmount(),
                    withdrawal.getReason(),
                    withdrawal.getCreatedAt(),
                    withdrawal.getUpdatedAt());
        }
    }
}
