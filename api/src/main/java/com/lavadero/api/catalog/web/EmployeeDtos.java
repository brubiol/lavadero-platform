package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.domain.Employee;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class EmployeeDtos {
    private EmployeeDtos() {
    }

    public record CreateEmployeeRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 40) String phone) {
    }

    public record UpdateEmployeeRequest(
            @Size(min = 1, max = 120) String fullName,
            @Size(max = 40) String phone,
            Boolean active) {
    }

    public record EmployeeResponse(Long id, String fullName, String phone, boolean active, Instant createdAt,
            Instant updatedAt) {
        public static EmployeeResponse from(Employee employee) {
            return new EmployeeResponse(employee.getId(), employee.getFullName(), employee.getPhone(),
                    employee.isActive(), employee.getCreatedAt(), employee.getUpdatedAt());
        }
    }
}
