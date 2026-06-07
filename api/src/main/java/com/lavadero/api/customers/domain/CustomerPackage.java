package com.lavadero.api.customers.domain;

import com.lavadero.api.catalog.domain.ServiceType;
import com.lavadero.api.catalog.domain.VehicleSize;
import com.lavadero.api.common.domain.AuditedEntity;
import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.TicketCurrency;
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

/**
 * A prepaid block of washes a customer buys up front, locked to one service +
 * vehicle size. Each visit burns one wash ({@code washesUsed}); when the car is
 * bigger than the locked size the cashier still redeems but charges the price
 * difference (handled at ticket capture). Distinct from {@code prepaid_packages}
 * (a shift-level sale record) — this one carries a remaining balance per customer.
 */
@Entity
@Table(name = "customer_packages")
public class CustomerPackage extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_type_id", nullable = false)
    private ServiceType serviceType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_size_id", nullable = false)
    private VehicleSize vehicleSize;

    @Column(name = "washes_total", nullable = false)
    private int washesTotal;

    @Column(name = "washes_used", nullable = false)
    private int washesUsed = 0;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "amount_paid", nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPaid;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private TicketCurrency currency = TicketCurrency.MXN;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PackageStatus status = PackageStatus.ACTIVE;

    @Column(length = 500)
    private String notes;

    @Column(name = "purchased_at", nullable = false)
    private Instant purchasedAt = Instant.now();

    protected CustomerPackage() {
    }

    public CustomerPackage(Customer customer, ServiceType serviceType, VehicleSize vehicleSize, int washesTotal,
            BigDecimal unitPrice, BigDecimal amountPaid, TicketCurrency currency, PaymentMethod paymentMethod,
            String notes, Instant purchasedAt) {
        this.customer = customer;
        this.serviceType = serviceType;
        this.vehicleSize = vehicleSize;
        this.washesTotal = washesTotal;
        this.unitPrice = unitPrice;
        this.amountPaid = amountPaid;
        this.currency = currency != null ? currency : TicketCurrency.MXN;
        this.paymentMethod = paymentMethod != null ? paymentMethod : PaymentMethod.CASH;
        this.notes = (notes == null || notes.isBlank()) ? null : notes.trim();
        this.purchasedAt = purchasedAt != null ? purchasedAt : Instant.now();
    }

    public int remaining() {
        return washesTotal - washesUsed;
    }

    /** Burns one wash. Caller must check {@link #remaining()} first. */
    public void redeemOne() {
        if (status != PackageStatus.ACTIVE || remaining() <= 0) {
            throw new IllegalStateException("Package has no washes left");
        }
        washesUsed++;
        if (remaining() == 0) {
            status = PackageStatus.EXHAUSTED;
        }
    }

    public void cancel() {
        this.status = PackageStatus.CANCELLED;
    }

    public Long getId() { return id; }
    public Customer getCustomer() { return customer; }
    public ServiceType getServiceType() { return serviceType; }
    public VehicleSize getVehicleSize() { return vehicleSize; }
    public int getWashesTotal() { return washesTotal; }
    public int getWashesUsed() { return washesUsed; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public TicketCurrency getCurrency() { return currency; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public PackageStatus getStatus() { return status; }
    public String getNotes() { return notes; }
    public Instant getPurchasedAt() { return purchasedAt; }
}
