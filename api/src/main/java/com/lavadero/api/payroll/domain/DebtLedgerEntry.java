package com.lavadero.api.payroll.domain;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.common.domain.AuditedEntity;
import com.lavadero.api.money.domain.EmployeeAdvance;
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
import java.time.LocalDate;

@Entity
@Table(name = "debt_ledger")
public class DebtLedgerEntry extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DebtLedgerType type;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_advance_id")
    private EmployeeAdvance employeeAdvance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_period_id")
    private PayrollPeriod payrollPeriod;

    @Column(length = 500)
    private String note;

    protected DebtLedgerEntry() {
    }

    public DebtLedgerEntry(Employee employee, LocalDate entryDate, DebtLedgerType type, BigDecimal amount,
            EmployeeAdvance employeeAdvance, PayrollPeriod payrollPeriod, String note) {
        this.employee = employee;
        this.entryDate = entryDate;
        this.type = type;
        this.amount = amount;
        this.employeeAdvance = employeeAdvance;
        this.payrollPeriod = payrollPeriod;
        this.note = note;
    }

    public Long getId() {
        return id;
    }

    public Employee getEmployee() {
        return employee;
    }

    public LocalDate getEntryDate() {
        return entryDate;
    }

    public DebtLedgerType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }
}
