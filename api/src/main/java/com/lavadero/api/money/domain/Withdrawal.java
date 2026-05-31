package com.lavadero.api.money.domain;

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
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "withdrawals")
@SQLRestriction("deleted_at IS NULL")
public class Withdrawal extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_day_id")
    private BusinessDay businessDay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "withdrawal_date", nullable = false)
    private LocalDate withdrawalDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 500)
    private String reason;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Withdrawal() {
    }

    public Withdrawal(BusinessDay businessDay, Shift shift, LocalDate withdrawalDate, BigDecimal amount, String reason) {
        this.businessDay = businessDay;
        this.shift = shift;
        this.withdrawalDate = withdrawalDate;
        this.amount = amount;
        this.reason = reason;
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

    public LocalDate getWithdrawalDate() {
        return withdrawalDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getReason() {
        return reason;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void update(LocalDate withdrawalDate, BigDecimal amount, String reason) {
        if (withdrawalDate != null) {
            this.withdrawalDate = withdrawalDate;
        }
        if (amount != null) {
            this.amount = amount;
        }
        if (reason != null) {
            String trimmed = reason.trim();
            this.reason = trimmed.isEmpty() ? null : trimmed;
        }
    }

    public void softDelete() {
        if (this.deletedAt == null) {
            this.deletedAt = Instant.now();
        }
    }
}
