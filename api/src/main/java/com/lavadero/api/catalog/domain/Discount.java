package com.lavadero.api.catalog.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * A pre-defined discount in the catalog. Discounts are configured by managers
 * (GERENTE) instead of being typed ad-hoc per ticket — the cashier never sets a
 * discount during capture. A discount may turn on automatically at the start of
 * an applicable shift, or be applied by a manager to a single ticket.
 */
@Entity
@Table(name = "discounts")
public class Discount extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    /** Percentage off, 0–100. */
    @Column(name = "percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal percent = BigDecimal.ZERO;

    /** Free-form applicability chips, comma-separated (e.g. "LUN" or "12 MAY" or "Jun - Ago"). */
    @Column(name = "days_label", nullable = false, length = 200)
    private String daysLabel = "";

    /** When true the discount turns on automatically at the start of an applicable shift. */
    @Column(name = "apply_at_shift_start", nullable = false)
    private boolean applyAtShiftStart = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "uses_this_month", nullable = false)
    private int usesThisMonth = 0;

    /** Card tint hint for the UI: warn | purple | good | info | amber. */
    @Column(name = "color", nullable = false, length = 20)
    private String color = "warn";

    protected Discount() {
    }

    public Discount(String code, String name, BigDecimal percent, String daysLabel,
            boolean applyAtShiftStart, String color) {
        this.code = code;
        this.name = name;
        this.percent = percent != null ? percent : BigDecimal.ZERO;
        this.daysLabel = daysLabel == null ? "" : daysLabel;
        this.applyAtShiftStart = applyAtShiftStart;
        this.color = color == null || color.isBlank() ? "warn" : color;
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

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getPercent() {
        return percent;
    }

    public void setPercent(BigDecimal percent) {
        this.percent = percent;
    }

    public String getDaysLabel() {
        return daysLabel;
    }

    public void setDaysLabel(String daysLabel) {
        this.daysLabel = daysLabel;
    }

    public boolean isApplyAtShiftStart() {
        return applyAtShiftStart;
    }

    public void setApplyAtShiftStart(boolean applyAtShiftStart) {
        this.applyAtShiftStart = applyAtShiftStart;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getUsesThisMonth() {
        return usesThisMonth;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}
