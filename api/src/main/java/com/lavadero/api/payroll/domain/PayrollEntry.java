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

    @Column(name = "net_pay", nullable = false, precision = 10, scale = 2)
    private BigDecimal netPay;

    protected PayrollEntry() {
    }

    public PayrollEntry(PayrollPeriod payrollPeriod, Employee employee, BigDecimal carsWashed, BigDecimal baseSalary,
            BigDecimal carsBonusRate, BigDecimal carsBonus, BigDecimal commissions, BigDecimal tipsPoolShare,
            BigDecimal advancesDeducted, BigDecimal netPay) {
        this.payrollPeriod = payrollPeriod;
        this.employee = employee;
        this.carsWashed = carsWashed;
        this.baseSalary = baseSalary;
        this.carsBonusRate = carsBonusRate;
        this.carsBonus = carsBonus;
        this.commissions = commissions;
        this.tipsPoolShare = tipsPoolShare;
        this.advancesDeducted = advancesDeducted;
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

    public BigDecimal getNetPay() {
        return netPay;
    }
}
