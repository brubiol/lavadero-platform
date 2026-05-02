package com.lavadero.api.catalog.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "employees")
public class Employee extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(length = 40)
    private String phone;

    @Column(nullable = false)
    private boolean active = true;

    protected Employee() {
    }

    public Employee(String fullName, String phone) {
        this.fullName = fullName;
        this.phone = phone;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public boolean isActive() {
        return active;
    }

    public void update(String fullName, String phone, Boolean active) {
        if (fullName != null) {
            this.fullName = fullName;
        }
        if (phone != null) {
            this.phone = phone;
        }
        if (active != null) {
            this.active = active;
        }
    }

    public void deactivate() {
        this.active = false;
    }
}
