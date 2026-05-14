package com.lavadero.api.payroll.domain;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.common.domain.AuditedEntity;
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

@Entity
@Table(name = "payroll_adjustments")
public class PayrollAdjustment extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_period_id", nullable = false)
    private PayrollPeriod payrollPeriod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayrollAdjustmentType type;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 120)
    private String concept;

    @Column(length = 500)
    private String note;

    protected PayrollAdjustment() {
    }

    public PayrollAdjustment(PayrollPeriod payrollPeriod, Employee employee, PayrollAdjustmentType type,
            BigDecimal amount, String concept, String note) {
        this.payrollPeriod = payrollPeriod;
        this.employee = employee;
        this.type = type;
        this.amount = amount;
        this.concept = concept;
        this.note = note;
    }

    public Long getId() {
        return id;
    }

    public PayrollPeriod getPayrollPeriod() {
        return payrollPeriod;
    }

    public Employee getEmployee() {
        return employee;
    }

    public PayrollAdjustmentType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getConcept() {
        return concept;
    }

    public String getNote() {
        return note;
    }
}
