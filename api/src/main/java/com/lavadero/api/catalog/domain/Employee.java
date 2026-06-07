package com.lavadero.api.catalog.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "employees")
public class Employee extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(length = 40)
    private String phone;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "deactivation_reason", length = 500)
    private String deactivationReason;

    @Column(name = "base_weekly_salary", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseWeeklySalary = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payroll_type", nullable = false, length = 20)
    private PayrollType payrollType = PayrollType.SALARY;

    @Column(name = "commission_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal commissionRate = new BigDecimal("30.00");

    @Column(name = "productivity_bonus_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal productivityBonusRate = new BigDecimal("10.00");

    @Column(name = "primary_shift", length = 20)
    private String primaryShift;

    @Column(name = "out_of_shift_commission_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal outOfShiftCommissionRate = BigDecimal.ZERO;

    @Column(name = "rest_day_premium", nullable = false, precision = 10, scale = 2)
    private BigDecimal restDayPremium = BigDecimal.ZERO;

    @Column(name = "absence_day_penalty", nullable = false, precision = 10, scale = 2)
    private BigDecimal absenceDayPenalty = BigDecimal.ZERO;

    // "Bad" / do-not-rehire marker. Survives deactivation so a washer who left on
    // bad terms is remembered if they come back. The note records why.
    @Column(name = "do_not_rehire", nullable = false)
    private boolean doNotRehire = false;

    @Column(name = "do_not_rehire_note", length = 500)
    private String doNotRehireNote;

    protected Employee() {
    }

    public Employee(String fullName, String phone) {
        this.fullName = fullName;
        this.phone = phone;
    }

    public Employee(String fullName, String phone, BigDecimal baseWeeklySalary) {
        this(fullName, phone, baseWeeklySalary, PayrollType.SALARY, null, null);
    }

    public Employee(String fullName, String phone, BigDecimal baseWeeklySalary, PayrollType payrollType,
            BigDecimal commissionRate, BigDecimal productivityBonusRate) {
        this.fullName = fullName;
        this.phone = phone;
        this.baseWeeklySalary = baseWeeklySalary == null ? BigDecimal.ZERO : baseWeeklySalary;
        this.payrollType = payrollType == null ? PayrollType.SALARY : payrollType;
        if (commissionRate != null) {
            this.commissionRate = commissionRate;
        }
        if (productivityBonusRate != null) {
            this.productivityBonusRate = productivityBonusRate;
        }
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public boolean isActive() {
        return active;
    }

    public String getDeactivationReason() {
        return deactivationReason;
    }

    public BigDecimal getBaseWeeklySalary() {
        return baseWeeklySalary;
    }

    public PayrollType getPayrollType() {
        return payrollType;
    }

    public BigDecimal getCommissionRate() {
        return commissionRate;
    }

    public BigDecimal getProductivityBonusRate() {
        return productivityBonusRate;
    }

    public String getPrimaryShift() {
        return primaryShift;
    }

    public BigDecimal getOutOfShiftCommissionRate() {
        return outOfShiftCommissionRate;
    }

    public BigDecimal getRestDayPremium() {
        return restDayPremium;
    }

    public BigDecimal getAbsenceDayPenalty() {
        return absenceDayPenalty;
    }

    public boolean isDoNotRehire() {
        return doNotRehire;
    }

    public String getDoNotRehireNote() {
        return doNotRehireNote;
    }

    public void update(String fullName, String phone, Boolean active, BigDecimal baseWeeklySalary,
            PayrollType payrollType, BigDecimal commissionRate, BigDecimal productivityBonusRate,
            String deactivationReason, String primaryShift, BigDecimal outOfShiftCommissionRate,
            BigDecimal restDayPremium, BigDecimal absenceDayPenalty,
            Boolean doNotRehire, String doNotRehireNote) {
        if (fullName != null) {
            this.fullName = fullName;
        }
        if (phone != null) {
            this.phone = phone;
        }
        if (active != null) {
            this.active = active;
            if (!active && deactivationReason != null && !deactivationReason.isBlank()) {
                this.deactivationReason = deactivationReason.trim();
            }
            if (Boolean.TRUE.equals(active)) {
                this.deactivationReason = null;
            }
        }
        if (baseWeeklySalary != null) {
            this.baseWeeklySalary = baseWeeklySalary;
        }
        if (payrollType != null) {
            this.payrollType = payrollType;
        }
        if (commissionRate != null) {
            this.commissionRate = commissionRate;
        }
        if (productivityBonusRate != null) {
            this.productivityBonusRate = productivityBonusRate;
        }
        this.primaryShift = (primaryShift == null || primaryShift.isBlank()) ? null : primaryShift.trim();
        if (outOfShiftCommissionRate != null) {
            this.outOfShiftCommissionRate = outOfShiftCommissionRate;
        }
        if (restDayPremium != null) {
            this.restDayPremium = restDayPremium;
        }
        if (absenceDayPenalty != null) {
            this.absenceDayPenalty = absenceDayPenalty;
        }
        if (doNotRehire != null) {
            this.doNotRehire = doNotRehire;
            if (!doNotRehire) {
                this.doNotRehireNote = null;
            }
        }
        if (doNotRehireNote != null) {
            this.doNotRehireNote = doNotRehireNote.isBlank() ? null : doNotRehireNote.trim();
        }
    }

    public void deactivate() {
        this.active = false;
    }
}
