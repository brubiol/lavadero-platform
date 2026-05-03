package com.lavadero.api.catalog.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

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

    @Column(name = "base_weekly_salary", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseWeeklySalary = BigDecimal.ZERO;

    protected Employee() {
    }

    public Employee(String fullName, String phone) {
        this.fullName = fullName;
        this.phone = phone;
    }

    public Employee(String fullName, String phone, BigDecimal baseWeeklySalary) {
        this.fullName = fullName;
        this.phone = phone;
        this.baseWeeklySalary = baseWeeklySalary == null ? BigDecimal.ZERO : baseWeeklySalary;
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

    public BigDecimal getBaseWeeklySalary() {
        return baseWeeklySalary;
    }

    public void update(String fullName, String phone, Boolean active, BigDecimal baseWeeklySalary) {
        if (fullName != null) {
            this.fullName = fullName;
        }
        if (phone != null) {
            this.phone = phone;
        }
        if (active != null) {
            this.active = active;
        }
        if (baseWeeklySalary != null) {
            this.baseWeeklySalary = baseWeeklySalary;
        }
    }

    public void deactivate() {
        this.active = false;
    }
}
