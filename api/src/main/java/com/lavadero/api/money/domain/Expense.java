package com.lavadero.api.money.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.domain.Shift;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "expenses")
@SQLRestriction("deleted_at IS NULL")
public class Expense extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_day_id")
    private BusinessDay businessDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ExpenseCategory category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 500)
    private String description;

    // Set only on nomina expenses auto-generated from a payroll period, so they
    // can be replaced on recompute. Null for manually-entered gastos.
    @Column(name = "payroll_period_id")
    private Long payrollPeriodId;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Expense() {
    }

    public Expense(BusinessDay businessDay, Shift shift, LocalDate expenseDate, ExpenseCategory category,
            BigDecimal amount, String description) {
        this(businessDay, shift, expenseDate, category, amount, description, null);
    }

    public Expense(BusinessDay businessDay, Shift shift, LocalDate expenseDate, ExpenseCategory category,
            BigDecimal amount, String description, Long payrollPeriodId) {
        this.businessDay = businessDay;
        this.shift = shift;
        this.expenseDate = expenseDate;
        this.category = category;
        this.amount = amount;
        this.description = description;
        this.payrollPeriodId = payrollPeriodId;
    }

    public Long getId() {
        return id;
    }

    public BusinessDay getBusinessDay() {
        return businessDay;
    }

    public Shift getShift() {
        return shift;
    }

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public ExpenseCategory getCategory() {
        return category;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }

    public Long getPayrollPeriodId() {
        return payrollPeriodId;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void update(LocalDate expenseDate, ExpenseCategory category, BigDecimal amount, String description) {
        if (expenseDate != null) {
            this.expenseDate = expenseDate;
        }
        if (category != null) {
            this.category = category;
        }
        if (amount != null) {
            this.amount = amount;
        }
        // Description is nullable — caller passes empty string to clear it,
        // or null to leave it alone. Empty string normalizes to null.
        if (description != null) {
            String trimmed = description.trim();
            this.description = trimmed.isEmpty() ? null : trimmed;
        }
    }

    public void softDelete() {
        if (this.deletedAt == null) {
            this.deletedAt = Instant.now();
        }
    }
}
