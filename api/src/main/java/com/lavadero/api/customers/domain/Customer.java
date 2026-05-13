package com.lavadero.api.customers.domain;

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

@Entity
@Table(name = "customers")
public class Customer extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 20)
    private String phone;

    @Column(length = 500)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "loyalty_status", nullable = false, length = 20)
    private LoyaltyStatus loyaltyStatus = LoyaltyStatus.REGULAR;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Customer() {
    }

    public Customer(String name, String phone, String notes) {
        this.name = name;
        this.phone = phone;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public String getNotes() { return notes; }
    public LoyaltyStatus getLoyaltyStatus() { return loyaltyStatus; }
    public boolean isActive() { return active; }
    public Instant getDeletedAt() { return deletedAt; }

    public void update(String name, String phone, String notes, LoyaltyStatus loyaltyStatus) {
        if (name != null) this.name = name;
        if (phone != null) this.phone = phone;
        if (notes != null) this.notes = notes;
        if (loyaltyStatus != null) this.loyaltyStatus = loyaltyStatus;
    }

    public void deactivate() {
        this.active = false;
        this.deletedAt = Instant.now();
    }
}
