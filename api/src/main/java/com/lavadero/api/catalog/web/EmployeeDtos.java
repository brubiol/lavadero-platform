package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.domain.PayrollType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class EmployeeDtos {
    private EmployeeDtos() {
    }

    public record CreateEmployeeRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 40) String phone,
            @DecimalMin("0.00") BigDecimal baseWeeklySalary,
            PayrollType payrollType,
            @DecimalMin("0.00") BigDecimal commissionRate,
            @DecimalMin("0.00") BigDecimal productivityBonusRate) {
    }

    public record UpdateEmployeeRequest(
            @Size(min = 1, max = 120) String fullName,
            @Size(max = 40) String phone,
            Boolean active,
            @DecimalMin("0.00") BigDecimal baseWeeklySalary,
            PayrollType payrollType,
            @DecimalMin("0.00") BigDecimal commissionRate,
            @DecimalMin("0.00") BigDecimal productivityBonusRate,
            @Size(max = 500) String deactivationReason,
            @Size(max = 20) String primaryShift,
            @DecimalMin("0.00") BigDecimal outOfShiftCommissionRate) {
    }

    public record EmployeeResponse(Long id, String fullName, String phone, boolean active,
            BigDecimal baseWeeklySalary, PayrollType payrollType, BigDecimal commissionRate,
            BigDecimal productivityBonusRate, String deactivationReason, String primaryShift,
            BigDecimal outOfShiftCommissionRate, Instant createdAt, Instant updatedAt) {
        public static EmployeeResponse from(Employee employee) {
            return new EmployeeResponse(employee.getId(), employee.getFullName(), employee.getPhone(),
                    employee.isActive(), employee.getBaseWeeklySalary(), employee.getPayrollType(),
                    employee.getCommissionRate(), employee.getProductivityBonusRate(),
                    employee.getDeactivationReason(), employee.getPrimaryShift(),
                    employee.getOutOfShiftCommissionRate(), employee.getCreatedAt(), employee.getUpdatedAt());
        }
    }
}
