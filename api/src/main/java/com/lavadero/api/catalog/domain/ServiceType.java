package com.lavadero.api.catalog.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "service_types")
public class ServiceType extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    /** STANDARD for primary wash services, EXTRA for add-ons (Encerado, Pulido, Lav. Interior). */
    @Column(nullable = false, length = 20)
    private String category = "STANDARD";

    protected ServiceType() {
    }

    public ServiceType(String code, String name, String description) {
        this(code, name, description, "STANDARD");
    }

    public ServiceType(String code, String name, String description, String category) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.category = category == null || category.isBlank() ? "STANDARD" : category;
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

    public String getDescription() {
        return description;
    }

    public boolean isActive() {
        return active;
    }

    public String getCategory() {
        return category;
    }
}
