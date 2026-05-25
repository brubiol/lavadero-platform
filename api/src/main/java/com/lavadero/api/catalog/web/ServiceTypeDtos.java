package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.domain.ServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class ServiceTypeDtos {
    private ServiceTypeDtos() {
    }

    public record CreateServiceTypeRequest(
            @NotBlank @Size(max = 40) @Pattern(regexp = "^[A-Z0-9_]+$") String code,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 500) String description) {
    }

    public record UpdateServiceTypeRequest(
            @Size(max = 120) String name,
            @Size(max = 500) String description,
            Boolean active) {
    }

    public record ServiceTypeResponse(Long id, String code, String name, String description, boolean active,
            String category, Instant createdAt, Instant updatedAt) {
        public static ServiceTypeResponse from(ServiceType serviceType) {
            return new ServiceTypeResponse(serviceType.getId(), serviceType.getCode(), serviceType.getName(),
                    serviceType.getDescription(), serviceType.isActive(), serviceType.getCategory(),
                    serviceType.getCreatedAt(), serviceType.getUpdatedAt());
        }
    }
}
