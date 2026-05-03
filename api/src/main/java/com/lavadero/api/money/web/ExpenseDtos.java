package com.lavadero.api.money.web;

import com.lavadero.api.money.domain.Expense;
import com.lavadero.api.money.domain.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class ExpenseDtos {
    private ExpenseDtos() {
    }

    public record CreateExpenseRequest(
            Long businessDayId,
            Long shiftId,
            @NotNull LocalDate expenseDate,
            @NotNull ExpenseCategory category,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @Size(max = 500) String description) {
    }

    public record ExpenseResponse(Long id, Long businessDayId, Long shiftId, LocalDate expenseDate,
            ExpenseCategory category, BigDecimal amount, String description, Instant createdAt, Instant updatedAt) {
        public static ExpenseResponse from(Expense expense) {
            return new ExpenseResponse(
                    expense.getId(),
                    expense.getBusinessDay() == null ? null : expense.getBusinessDay().getId(),
                    expense.getShift() == null ? null : expense.getShift().getId(),
                    expense.getExpenseDate(),
                    expense.getCategory(),
                    expense.getAmount(),
                    expense.getDescription(),
                    expense.getCreatedAt(),
                    expense.getUpdatedAt());
        }
    }
}
