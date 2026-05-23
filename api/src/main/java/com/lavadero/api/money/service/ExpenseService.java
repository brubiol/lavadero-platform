package com.lavadero.api.money.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.money.domain.Expense;
import com.lavadero.api.money.domain.ExpenseCategory;
import com.lavadero.api.money.repository.ExpenseRepository;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.money.web.ExpenseDtos.CreateExpenseRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {
    /** Expenses above this amount auto-flag for owner review. */
    private static final BigDecimal LARGE_EXPENSE_THRESHOLD = new BigDecimal("3000.00");

    private final ExpenseRepository expenses;
    private final BusinessContextResolver contextResolver;
    private final AuditService audit;

    public ExpenseService(ExpenseRepository expenses, BusinessContextResolver contextResolver, AuditService audit) {
        this.expenses = expenses;
        this.contextResolver = contextResolver;
        this.audit = audit;
    }

    @Transactional
    public Expense create(CreateExpenseRequest request) {
        Context context = contextResolver.resolve(request.businessDayId(), request.shiftId(), request.expenseDate());
        Expense expense = new Expense(context.businessDay(), context.shift(), context.recordDate(), request.category(),
                request.amount(), request.description());
        Expense saved = expenses.save(expense);

        boolean largeAmount = request.amount() != null
                && request.amount().compareTo(LARGE_EXPENSE_THRESHOLD) >= 0;
        if (largeAmount) {
            audit.recordFlagged("EXPENSE_CREATED", "EXPENSE", saved.getId(),
                    "Gasto alto: $" + saved.getAmount(),
                    saved.getCategory() + " · " + (saved.getDescription() == null ? "" : saved.getDescription()));
        } else {
            audit.record("EXPENSE_CREATED", "EXPENSE", saved.getId(), saved.getDescription(),
                    saved.getCategory() + " " + saved.getAmount());
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Expense> list(LocalDate from, LocalDate to, ExpenseCategory category) {
        validateRange(from, to);
        if (category == null) {
            return expenses.findByExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(from, to);
        }
        return expenses.findByExpenseDateBetweenAndCategoryOrderByExpenseDateDescCreatedAtDesc(from, to, category);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be on or after from");
        }
    }
}
