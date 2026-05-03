package com.lavadero.api.payroll.domain;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.common.domain.AuditedEntity;
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
@Table(name = "payroll_days")
public class PayrollDay extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_period_id", nullable = false)
    private PayrollPeriod payrollPeriod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "cars_washed", nullable = false, precision = 10, scale = 2)
    private BigDecimal carsWashed;

    @Column(name = "ticket_revenue", nullable = false, precision = 10, scale = 2)
    private BigDecimal ticketRevenue;

    protected PayrollDay() {
    }

    public PayrollDay(PayrollPeriod payrollPeriod, Employee employee, LocalDate workDate, BigDecimal carsWashed,
            BigDecimal ticketRevenue) {
        this.payrollPeriod = payrollPeriod;
        this.employee = employee;
        this.workDate = workDate;
        this.carsWashed = carsWashed;
        this.ticketRevenue = ticketRevenue;
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

    public LocalDate getWorkDate() {
        return workDate;
    }

    public BigDecimal getCarsWashed() {
        return carsWashed;
    }

    public BigDecimal getTicketRevenue() {
        return ticketRevenue;
    }
}
