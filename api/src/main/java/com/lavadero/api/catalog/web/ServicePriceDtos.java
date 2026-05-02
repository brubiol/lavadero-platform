package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.domain.ServicePrice;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class ServicePriceDtos {
    private ServicePriceDtos() {
    }

    public record CreateServicePriceRequest(
            @NotNull Long serviceTypeId,
            @NotNull Long vehicleSizeId,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @Pattern(regexp = "^[A-Z]{3}$") String currency,
            @NotNull LocalDate effectiveFrom,
            LocalDate effectiveTo) {
    }

    public record UpdateServicePriceRequest(
            @DecimalMin(value = "0.01") BigDecimal amount,
            @Pattern(regexp = "^[A-Z]{3}$") String currency,
            LocalDate effectiveTo) {
    }

    public record ServicePriceResponse(Long id, Long serviceTypeId, String serviceTypeName, Long vehicleSizeId,
            String vehicleSizeName, BigDecimal amount, String currency, LocalDate effectiveFrom, LocalDate effectiveTo,
            Instant createdAt, Instant updatedAt) {
        public static ServicePriceResponse from(ServicePrice servicePrice) {
            return new ServicePriceResponse(servicePrice.getId(), servicePrice.getServiceType().getId(),
                    servicePrice.getServiceType().getName(), servicePrice.getVehicleSize().getId(),
                    servicePrice.getVehicleSize().getName(), servicePrice.getAmount(), servicePrice.getCurrency(),
                    servicePrice.getEffectiveFrom(), servicePrice.getEffectiveTo(), servicePrice.getCreatedAt(),
                    servicePrice.getUpdatedAt());
        }
    }
}
