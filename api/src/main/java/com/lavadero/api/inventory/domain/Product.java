package com.lavadero.api.inventory.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProductCategory category = ProductCategory.OTRO;

    // Per-product low-stock thresholds. NULL on either field means the caller
    // (frontend) falls back to its global default — see V58 migration notes.
    @Column(name = "min_stock", precision = 10, scale = 2)
    private BigDecimal minStock;

    @Column(name = "crit_stock", precision = 10, scale = 2)
    private BigDecimal critStock;

    protected Product() {
    }

    public Product(String name, String sku, BigDecimal currentUnitPrice, boolean trackInventory, ProductCategory category) {
        this.name = name;
        this.sku = sku;
        this.currentUnitPrice = currentUnitPrice;
        this.trackInventory = trackInventory;
        this.category = category != null ? category : ProductCategory.OTRO;
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

    public ProductCategory getCategory() {
        return category;
    }

    public BigDecimal getMinStock() {
        return minStock;
    }

    public BigDecimal getCritStock() {
        return critStock;
    }

    public void update(String name, String sku, BigDecimal currentUnitPrice, Boolean trackInventory, Boolean active,
                       ProductCategory category, BigDecimal minStock, BigDecimal critStock) {
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
        if (category != null) {
            this.category = category;
        }
        // Pass minStock/critStock as null to leave them untouched. Set them to
        // -1 explicitly (out-of-band sentinel) to clear back to NULL.
        if (minStock != null) {
            this.minStock = minStock.signum() < 0 ? null : minStock;
        }
        if (critStock != null) {
            this.critStock = critStock.signum() < 0 ? null : critStock;
        }
    }
}
