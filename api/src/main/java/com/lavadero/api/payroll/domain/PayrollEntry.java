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

@Entity
@Table(name = "payroll_entries")
public class PayrollEntry extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_period_id", nullable = false)
    private PayrollPeriod payrollPeriod;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "cars_washed", nullable = false, precision = 10, scale = 2)
    private BigDecimal carsWashed;

    @Column(name = "base_salary", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseSalary;

    @Column(name = "rest_day_pay", nullable = false, precision = 10, scale = 2)
    private BigDecimal restDayPay = BigDecimal.ZERO;

    @Column(name = "absence_deduction", nullable = false, precision = 10, scale = 2)
    private BigDecimal absenceDeduction = BigDecimal.ZERO;

    @Column(name = "cars_bonus_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal carsBonusRate;

    @Column(name = "cars_bonus", nullable = false, precision = 10, scale = 2)
    private BigDecimal carsBonus;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal commissions;

    @Column(name = "tips_pool_share", nullable = false, precision = 10, scale = 2)
    private BigDecimal tipsPoolShare;

    @Column(name = "advances_deducted", nullable = false, precision = 10, scale = 2)
    private BigDecimal advancesDeducted;

    @Column(name = "manual_earnings", nullable = false, precision = 10, scale = 2)
    private BigDecimal manualEarnings = BigDecimal.ZERO;

    @Column(name = "manual_deductions", nullable = false, precision = 10, scale = 2)
    private BigDecimal manualDeductions = BigDecimal.ZERO;

    @Column(name = "gross_pay", nullable = false, precision = 10, scale = 2)
    private BigDecimal grossPay = BigDecimal.ZERO;

    @Column(name = "net_pay", nullable = false, precision = 10, scale = 2)
    private BigDecimal netPay;

    protected PayrollEntry() {
    }

    public PayrollEntry(PayrollPeriod payrollPeriod, Employee employee, BigDecimal carsWashed, BigDecimal baseSalary,
            BigDecimal restDayPay, BigDecimal absenceDeduction, BigDecimal carsBonusRate, BigDecimal carsBonus,
            BigDecimal commissions, BigDecimal tipsPoolShare, BigDecimal manualEarnings, BigDecimal manualDeductions,
            BigDecimal advancesDeducted, BigDecimal grossPay, BigDecimal netPay) {
        this.payrollPeriod = payrollPeriod;
        this.employee = employee;
        this.carsWashed = carsWashed;
        this.baseSalary = baseSalary;
        this.restDayPay = restDayPay;
        this.absenceDeduction = absenceDeduction;
        this.carsBonusRate = carsBonusRate;
        this.carsBonus = carsBonus;
        this.commissions = commissions;
        this.tipsPoolShare = tipsPoolShare;
        this.manualEarnings = manualEarnings;
        this.manualDeductions = manualDeductions;
        this.advancesDeducted = advancesDeducted;
        this.grossPay = grossPay;
        this.netPay = netPay;
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

    public BigDecimal getCarsWashed() {
        return carsWashed;
    }

    public BigDecimal getBaseSalary() {
        return baseSalary;
    }

    public BigDecimal getRestDayPay() {
        return restDayPay;
    }

    public BigDecimal getAbsenceDeduction() {
        return absenceDeduction;
    }

    public BigDecimal getCarsBonusRate() {
        return carsBonusRate;
    }

    public BigDecimal getCarsBonus() {
        return carsBonus;
    }

    public BigDecimal getCommissions() {
        return commissions;
    }

    public BigDecimal getTipsPoolShare() {
        return tipsPoolShare;
    }

    public BigDecimal getAdvancesDeducted() {
        return advancesDeducted;
    }

    public BigDecimal getManualEarnings() {
        return manualEarnings;
    }

    public BigDecimal getManualDeductions() {
        return manualDeductions;
    }

    public BigDecimal getGrossPay() {
        return grossPay;
    }

    public BigDecimal getNetPay() {
        return netPay;
    }
}
