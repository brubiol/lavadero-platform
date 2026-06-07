package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.domain.Discount;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class DiscountDtos {
    private DiscountDtos() {
    }

    public record CreateDiscountRequest(
            @NotBlank @Size(max = 40) @Pattern(regexp = "^[A-Z0-9_]+$") String code,
            @NotBlank @Size(max = 120) String name,
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal percent,
            @Size(max = 200) String daysLabel,
            Boolean applyAtShiftStart,
            @Pattern(regexp = "warn|purple|good|info|amber") String color) {
    }

    public record UpdateDiscountRequest(
            @Size(max = 120) String name,
            @DecimalMin("0") @DecimalMax("100") BigDecimal percent,
            @Size(max = 200) String daysLabel,
            Boolean applyAtShiftStart,
            Boolean active,
            @Pattern(regexp = "warn|purple|good|info|amber") String color) {
    }

    public record DiscountResponse(Long id, String code, String name, BigDecimal percent, String daysLabel,
            boolean applyAtShiftStart, boolean active, int usesThisMonth, String color,
            Instant createdAt, Instant updatedAt) {
        public static DiscountResponse from(Discount d) {
            return new DiscountResponse(d.getId(), d.getCode(), d.getName(), d.getPercent(), d.getDaysLabel(),
                    d.isApplyAtShiftStart(), d.isActive(), d.getUsesThisMonth(), d.getColor(),
                    d.getCreatedAt(), d.getUpdatedAt());
        }
    }
}
