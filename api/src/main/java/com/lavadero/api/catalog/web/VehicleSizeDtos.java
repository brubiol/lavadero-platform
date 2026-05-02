package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.domain.VehicleSize;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class VehicleSizeDtos {
    private VehicleSizeDtos() {
    }

    public record CreateVehicleSizeRequest(
            @NotBlank @Size(max = 40) @Pattern(regexp = "^[A-Z0-9_]+$") String code,
            @NotBlank @Size(max = 120) String name,
            @Min(0) Integer sortOrder) {
    }

    public record UpdateVehicleSizeRequest(
            @Size(max = 120) String name,
            @Min(0) Integer sortOrder,
            Boolean active) {
    }

    public record VehicleSizeResponse(Long id, String code, String name, Integer sortOrder, boolean active,
            Instant createdAt, Instant updatedAt) {
        public static VehicleSizeResponse from(VehicleSize vehicleSize) {
            return new VehicleSizeResponse(vehicleSize.getId(), vehicleSize.getCode(), vehicleSize.getName(),
                    vehicleSize.getSortOrder(), vehicleSize.isActive(), vehicleSize.getCreatedAt(),
                    vehicleSize.getUpdatedAt());
        }
    }
}
