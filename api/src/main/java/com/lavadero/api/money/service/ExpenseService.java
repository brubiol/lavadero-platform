package com.lavadero.api.money.service;

import com.lavadero.api.money.domain.Expense;
import com.lavadero.api.money.domain.ExpenseCategory;
import com.lavadero.api.money.repository.ExpenseRepository;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.money.web.ExpenseDtos.CreateExpenseRequest;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {
    private final ExpenseRepository expenses;
    private final BusinessContextResolver contextResolver;

    public ExpenseService(ExpenseRepository expenses, BusinessContextResolver contextResolver) {
        this.expenses = expenses;
        this.contextResolver = contextResolver;
    }

    @Transactional
    public Expense create(CreateExpenseRequest request) {
        Context context = contextResolver.resolve(request.businessDayId(), request.shiftId(), request.expenseDate());
        Expense expense = new Expense(context.businessDay(), context.shift(), context.recordDate(), request.category(),
                request.amount(), request.description());
        return expenses.save(expense);
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
