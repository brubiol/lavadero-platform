package com.lavadero.api.operations.domain;

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
import java.time.Instant;

@Entity
@Table(name = "prepaid_packages")
public class PrepaidPackage extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_day_id", nullable = false)
    private BusinessDay businessDay;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @Column(name = "washes_included", nullable = false)
    private int washesIncluded = 10;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private TicketCurrency currency = TicketCurrency.MXN;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Column(length = 500)
    private String notes;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    public PrepaidPackage() {}

    public PrepaidPackage(BusinessDay businessDay, Shift shift, int washesIncluded,
            BigDecimal amount, TicketCurrency currency, PaymentMethod paymentMethod,
            String notes, Instant occurredAt) {
        this.businessDay = businessDay;
        this.shift = shift;
        this.washesIncluded = washesIncluded;
        this.amount = amount;
        this.currency = currency;
        this.paymentMethod = paymentMethod;
        this.notes = notes;
        this.occurredAt = occurredAt != null ? occurredAt : Instant.now();
    }

    public Long getId() { return id; }
    public BusinessDay getBusinessDay() { return businessDay; }
    public Shift getShift() { return shift; }
    public int getWashesIncluded() { return washesIncluded; }
    public BigDecimal getAmount() { return amount; }
    public TicketCurrency getCurrency() { return currency; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public String getNotes() { return notes; }
    public Instant getOccurredAt() { return occurredAt; }
}
