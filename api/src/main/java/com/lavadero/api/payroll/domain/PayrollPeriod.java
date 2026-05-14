package com.lavadero.api.payroll.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "payroll_periods")
public class PayrollPeriod extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayrollPeriodStatus status = PayrollPeriodStatus.OPEN;

    @Column(name = "computed_at")
    private Instant computedAt;

    @Column(name = "locked_at")
    private Instant lockedAt;

    protected PayrollPeriod() {
    }

    public PayrollPeriod(LocalDate startDate, LocalDate endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public PayrollPeriodStatus getStatus() {
        return status;
    }

    public Instant getComputedAt() {
        return computedAt;
    }

    public Instant getLockedAt() {
        return lockedAt;
    }

    public void markComputed() {
        status = PayrollPeriodStatus.COMPUTED;
        computedAt = Instant.now();
    }

    public void lock() {
        status = PayrollPeriodStatus.LOCKED;
        lockedAt = Instant.now();
    }

    public void unlockForCorrection() {
        status = PayrollPeriodStatus.COMPUTED;
        lockedAt = null;
    }
}
