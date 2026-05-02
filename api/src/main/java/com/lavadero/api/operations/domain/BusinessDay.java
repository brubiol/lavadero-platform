package com.lavadero.api.operations.domain;

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
@Table(name = "business_days")
public class BusinessDay extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BusinessDayStatus status = BusinessDayStatus.OPEN;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt = Instant.now();

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "locked_at")
    private Instant lockedAt;

    protected BusinessDay() {
    }

    public BusinessDay(LocalDate businessDate) {
        this.businessDate = businessDate;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getBusinessDate() {
        return businessDate;
    }

    public BusinessDayStatus getStatus() {
        return status;
    }

    public Instant getOpenedAt() {
        return openedAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public Instant getLockedAt() {
        return lockedAt;
    }
}
