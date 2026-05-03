package com.lavadero.api.money.repository;

import com.lavadero.api.money.domain.Expense;
import com.lavadero.api.money.domain.ExpenseCategory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(LocalDate from, LocalDate to);

    List<Expense> findByExpenseDateBetweenAndCategoryOrderByExpenseDateDescCreatedAtDesc(
            LocalDate from, LocalDate to, ExpenseCategory category);

    @Query("select coalesce(sum(e.amount), 0) from Expense e where e.expenseDate = :date")
    BigDecimal sumForDate(@Param("date") LocalDate date);

    @Query("select coalesce(sum(e.amount), 0) from Expense e where e.shift.id = :shiftId")
    BigDecimal sumForShift(@Param("shiftId") Long shiftId);
}
