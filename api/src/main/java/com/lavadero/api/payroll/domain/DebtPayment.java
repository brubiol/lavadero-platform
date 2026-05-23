package com.lavadero.api.payroll.domain;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.common.domain.AuditedEntity;
import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.domain.Shift;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "debt_payments")
public class DebtPayment extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_day_id")
    private BusinessDay businessDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @ManyToOne(optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 500)
    private String note;

    protected DebtPayment() {
    }

    public DebtPayment(BusinessDay businessDay, Shift shift, Employee employee, LocalDate paymentDate,
            BigDecimal amount, String note) {
        this.businessDay = businessDay;
        this.shift = shift;
        this.employee = employee;
        this.paymentDate = paymentDate;
        this.amount = amount;
        this.note = note;
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

    public Employee getEmployee() {
        return employee;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getNote() {
        return note;
    }
}
