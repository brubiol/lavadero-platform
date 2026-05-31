package com.lavadero.api.money.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.money.domain.Expense;
import com.lavadero.api.money.domain.ExpenseCategory;
import com.lavadero.api.money.repository.ExpenseRepository;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.money.web.ExpenseDtos.CreateExpenseRequest;
import com.lavadero.api.money.web.ExpenseDtos.UpdateExpenseRequest;
import jakarta.persistence.EntityNotFoundException;
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

    @Transactional
    public Expense update(Long id, UpdateExpenseRequest request) {
        Expense expense = expenses.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found"));
        // Nomina expenses are auto-generated from a payroll period and replaced
        // on recompute. Editing them here would silently drift from the period
        // and get clobbered next time payroll runs.
        if (expense.getPayrollPeriodId() != null) {
            throw new IllegalArgumentException("Los gastos de nómina se generan automáticamente al cerrar la semana — no se editan a mano.");
        }
        expense.update(request.expenseDate(), request.category(), request.amount(), request.description());
        audit.record("EXPENSE_EDITED", "EXPENSE", expense.getId(), expense.getDescription(),
                expense.getCategory() + " " + expense.getAmount());
        return expense;
    }

    @Transactional
    public void delete(Long id) {
        Expense expense = expenses.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found"));
        if (expense.getPayrollPeriodId() != null) {
            throw new IllegalArgumentException("Los gastos de nómina se generan automáticamente al cerrar la semana — no se eliminan a mano.");
        }
        expense.softDelete();
        audit.record("EXPENSE_DELETED", "EXPENSE", expense.getId(), expense.getDescription(),
                expense.getCategory() + " " + expense.getAmount());
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
