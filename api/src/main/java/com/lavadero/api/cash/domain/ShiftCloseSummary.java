package com.lavadero.api.cash.domain;

import com.lavadero.api.common.domain.AuditedEntity;
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

@Entity
@Table(name = "shift_close_summaries")
public class ShiftCloseSummary extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cash_count_id", nullable = false)
    private CashCount cashCount;

    @Column(name = "ticket_revenue", nullable = false, precision = 10, scale = 2)
    private BigDecimal ticketRevenue;

    @Column(name = "expenses_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal expensesTotal;

    @Column(name = "withdrawals_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal withdrawalsTotal;

    @Column(name = "expected_cash", nullable = false, precision = 10, scale = 2)
    private BigDecimal expectedCash;

    @Column(name = "total_counted", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCounted;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal variance;

    @Column(name = "closing_reason", length = 500)
    private String closingReason;

    @Column(name = "closed_at", nullable = false)
    private Instant closedAt;

    protected ShiftCloseSummary() {
    }

    public ShiftCloseSummary(Shift shift, CashCount cashCount, BigDecimal ticketRevenue, BigDecimal expensesTotal,
            BigDecimal withdrawalsTotal, BigDecimal expectedCash, BigDecimal totalCounted, BigDecimal variance,
            String closingReason) {
        this.shift = shift;
        this.cashCount = cashCount;
        this.ticketRevenue = ticketRevenue;
        this.expensesTotal = expensesTotal;
        this.withdrawalsTotal = withdrawalsTotal;
        this.expectedCash = expectedCash;
        this.totalCounted = totalCounted;
        this.variance = variance;
        this.closingReason = closingReason;
        this.closedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Shift getShift() {
        return shift;
    }

    public CashCount getCashCount() {
        return cashCount;
    }

    public BigDecimal getTicketRevenue() {
        return ticketRevenue;
    }

    public BigDecimal getExpensesTotal() {
        return expensesTotal;
    }

    public BigDecimal getWithdrawalsTotal() {
        return withdrawalsTotal;
    }

    public BigDecimal getExpectedCash() {
        return expectedCash;
    }

    public BigDecimal getTotalCounted() {
        return totalCounted;
    }

    public BigDecimal getVariance() {
        return variance;
    }

    public String getClosingReason() {
        return closingReason;
    }

    public Instant getClosedAt() {
        return closedAt;
    }
}
