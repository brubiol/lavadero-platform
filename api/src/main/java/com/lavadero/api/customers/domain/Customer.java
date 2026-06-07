package com.lavadero.api.customers.domain;

import com.lavadero.api.catalog.domain.VehicleSize;
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

    // Car on file: the vehicle this customer usually brings. Used to spot a
    // mismatch (especially a bigger car than a prepaid package was bought for).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_size_id")
    private VehicleSize vehicleSize;

    @Column(name = "vehicle_description", length = 160)
    private String vehicleDescription;

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
    public VehicleSize getVehicleSize() { return vehicleSize; }
    public String getVehicleDescription() { return vehicleDescription; }

    public void update(String name, String phone, String notes, LoyaltyStatus loyaltyStatus) {
        if (name != null) this.name = name;
        if (phone != null) this.phone = phone;
        if (notes != null) this.notes = notes;
        if (loyaltyStatus != null) this.loyaltyStatus = loyaltyStatus;
    }

    // Car on file is set explicitly (null size clears it; blank description clears).
    public void setCar(VehicleSize vehicleSize, String vehicleDescription) {
        this.vehicleSize = vehicleSize;
        this.vehicleDescription = (vehicleDescription == null || vehicleDescription.isBlank())
                ? null : vehicleDescription.trim();
    }

    public void deactivate() {
        this.active = false;
        this.deletedAt = Instant.now();
    }
}
