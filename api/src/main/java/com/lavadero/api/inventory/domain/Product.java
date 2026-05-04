package com.lavadero.api.inventory.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 60)
    private String sku;

    @Column(name = "current_unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal currentUnitPrice;

    @Column(name = "track_inventory", nullable = false)
    private boolean trackInventory;

    @Column(nullable = false)
    private boolean active = true;

    protected Product() {
    }

    public Product(String name, String sku, BigDecimal currentUnitPrice, boolean trackInventory) {
        this.name = name;
        this.sku = sku;
        this.currentUnitPrice = currentUnitPrice;
        this.trackInventory = trackInventory;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSku() {
        return sku;
    }

    public BigDecimal getCurrentUnitPrice() {
        return currentUnitPrice;
    }

    public boolean isTrackInventory() {
        return trackInventory;
    }

    public boolean isActive() {
        return active;
    }

    public void update(String name, String sku, BigDecimal currentUnitPrice, Boolean trackInventory, Boolean active) {
        if (name != null) {
            this.name = name;
        }
        if (sku != null) {
            this.sku = sku;
        }
        if (currentUnitPrice != null) {
            this.currentUnitPrice = currentUnitPrice;
        }
        if (trackInventory != null) {
            this.trackInventory = trackInventory;
        }
        if (active != null) {
            this.active = active;
        }
    }
}
