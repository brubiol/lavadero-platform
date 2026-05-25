package com.lavadero.api.operations.domain;

import com.lavadero.api.catalog.domain.ServiceType;
import com.lavadero.api.catalog.domain.VehicleSize;
import com.lavadero.api.common.domain.AuditedEntity;
import com.lavadero.api.customers.domain.Customer;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets")
public class Ticket extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_day_id", nullable = false)
    private BusinessDay businessDay;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_type_id", nullable = false)
    private ServiceType serviceType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_size_id", nullable = false)
    private VehicleSize vehicleSize;

    @Column(name = "daily_seq", nullable = false)
    private Integer dailySeq;

    @Column(name = "nota_number", nullable = false, length = 40)
    private String notaNumber;

    @Column(name = "vehicle_description", length = 160)
    private String vehicleDescription;

    @Column(name = "price_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceAmount;

    @Column(name = "discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent = BigDecimal.ZERO;

    @Column(name = "original_price_amount", precision = 12, scale = 2)
    private BigDecimal originalPriceAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private TicketCurrency currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 10)
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Column(nullable = false)
    private boolean courtesy;

    @Column(name = "courtesy_reason", length = 500)
    private String courtesyReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketStatus status = TicketStatus.ACTIVE;

    @Column(name = "void_reason", length = 500)
    private String voidReason;

    @Column(name = "voided_at")
    private Instant voidedAt;

    @Column(name = "occurred_at")
    private Instant occurredAt;

    @Column(name = "internal_ref", length = 40)
    private String internalRef;

    @Column(name = "price_override", precision = 10, scale = 2)
    private BigDecimal priceOverride;

    @Column(name = "surcharge_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal surchargeAmount = BigDecimal.ZERO;

    @Column(name = "surcharge_reason", length = 120)
    private String surchargeReason;

    @Column(name = "discount_reason", length = 120)
    private String discountReason;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TicketAssignment> assignments = new ArrayList<>();

    protected Ticket() {
    }

    public Ticket(BusinessDay businessDay, Shift shift, ServiceType serviceType, VehicleSize vehicleSize,
            Integer dailySeq, String notaNumber, String vehicleDescription, BigDecimal priceAmount,
            BigDecimal discountPercent, BigDecimal originalPriceAmount,
            TicketCurrency currency, PaymentMethod paymentMethod, boolean courtesy, String courtesyReason) {
        this.businessDay = businessDay;
        this.shift = shift;
        this.serviceType = serviceType;
        this.vehicleSize = vehicleSize;
        this.dailySeq = dailySeq;
        this.notaNumber = notaNumber;
        this.vehicleDescription = vehicleDescription;
        this.priceAmount = priceAmount;
        this.discountPercent = discountPercent != null ? discountPercent : BigDecimal.ZERO;
        this.originalPriceAmount = originalPriceAmount;
        this.currency = currency;
        this.paymentMethod = paymentMethod != null ? paymentMethod : PaymentMethod.CASH;
        this.courtesy = courtesy;
        this.courtesyReason = courtesyReason;
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

    public ServiceType getServiceType() {
        return serviceType;
    }

    public VehicleSize getVehicleSize() {
        return vehicleSize;
    }

    public Integer getDailySeq() {
        return dailySeq;
    }

    public String getNotaNumber() {
        return notaNumber;
    }

    public String getVehicleDescription() {
        return vehicleDescription;
    }

    public BigDecimal getPriceAmount() {
        return priceAmount;
    }

    public BigDecimal getDiscountPercent() {
        return discountPercent;
    }

    public BigDecimal getOriginalPriceAmount() {
        return originalPriceAmount;
    }

    public BigDecimal getSurchargeAmount() {
        return surchargeAmount == null ? BigDecimal.ZERO : surchargeAmount;
    }

    public void setSurchargeAmount(BigDecimal surchargeAmount) {
        this.surchargeAmount = surchargeAmount == null ? BigDecimal.ZERO : surchargeAmount;
    }

    public String getSurchargeReason() {
        return surchargeReason;
    }

    public void setSurchargeReason(String surchargeReason) {
        this.surchargeReason = surchargeReason;
    }

    public String getDiscountReason() {
        return discountReason;
    }

    public void setDiscountReason(String discountReason) {
        this.discountReason = discountReason;
    }

    public TicketCurrency getCurrency() {
        return currency;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public boolean isCourtesy() {
        return courtesy;
    }

    public String getCourtesyReason() {
        return courtesyReason;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public String getVoidReason() {
        return voidReason;
    }

    public Instant getVoidedAt() {
        return voidedAt;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }

    public String getInternalRef() {
        return internalRef;
    }

    public void setInternalRef(String internalRef) {
        this.internalRef = internalRef;
    }

    public BigDecimal getPriceOverride() {
        return priceOverride;
    }

    public void setPriceOverride(BigDecimal priceOverride) {
        this.priceOverride = priceOverride;
    }

    public String getNotes() {
        return notes;
    }

    public List<TicketAssignment> getAssignments() {
        return assignments;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void attachCustomer(Customer customer) {
        this.customer = customer;
    }

    public void update(ServiceType serviceType, VehicleSize vehicleSize, String vehicleDescription,
            BigDecimal priceAmount, BigDecimal discountPercent, BigDecimal originalPriceAmount,
            TicketCurrency currency, PaymentMethod paymentMethod, boolean courtesy, String courtesyReason,
            Instant occurredAt, String internalRef, String notes) {
        this.serviceType = serviceType;
        this.vehicleSize = vehicleSize;
        this.vehicleDescription = vehicleDescription;
        this.priceAmount = priceAmount;
        this.discountPercent = discountPercent != null ? discountPercent : BigDecimal.ZERO;
        this.originalPriceAmount = originalPriceAmount;
        this.currency = currency;
        this.paymentMethod = paymentMethod != null ? paymentMethod : this.paymentMethod;
        this.courtesy = courtesy;
        this.courtesyReason = courtesyReason;
        if (occurredAt != null) {
            this.occurredAt = occurredAt;
        }
        if (internalRef != null) {
            this.internalRef = internalRef;
        }
        if (notes != null) {
            this.notes = notes.isBlank() ? null : notes.trim();
        }
    }

    public void replaceAssignments(List<TicketAssignment> nextAssignments) {
        assignments.clear();
        nextAssignments.forEach(assignment -> {
            assignment.attachTo(this);
            assignments.add(assignment);
        });
    }

    public void voidTicket(String reason) {
        status = TicketStatus.VOIDED;
        voidReason = reason;
        voidedAt = Instant.now();
    }
}
