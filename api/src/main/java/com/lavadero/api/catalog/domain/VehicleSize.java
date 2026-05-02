package com.lavadero.api.catalog.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "vehicle_sizes")
public class VehicleSize extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    protected VehicleSize() {
    }

    public VehicleSize(String code, String name, Integer sortOrder) {
        this.code = code;
        this.name = name;
        this.sortOrder = sortOrder == null ? 0 : sortOrder;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public boolean isActive() {
        return active;
    }
}
