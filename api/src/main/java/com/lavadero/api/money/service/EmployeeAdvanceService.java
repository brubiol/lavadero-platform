package com.lavadero.api.money.service;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.money.domain.EmployeeAdvance;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.money.web.EmployeeAdvanceDtos.CreateEmployeeAdvanceRequest;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeAdvanceService {
    private final EmployeeAdvanceRepository advances;
    private final EmployeeRepository employees;
    private final BusinessContextResolver contextResolver;

    public EmployeeAdvanceService(EmployeeAdvanceRepository advances, EmployeeRepository employees,
            BusinessContextResolver contextResolver) {
        this.advances = advances;
        this.employees = employees;
        this.contextResolver = contextResolver;
    }

    @Transactional
    public EmployeeAdvance create(CreateEmployeeAdvanceRequest request) {
        Employee employee = employees.findById(request.employeeId())
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        if (!employee.isActive()) {
            throw new IllegalArgumentException("Employee must be active");
        }
        Context context = contextResolver.resolve(request.businessDayId(), request.shiftId(), request.advanceDate());
        EmployeeAdvance advance = new EmployeeAdvance(context.businessDay(), context.shift(), employee,
                context.recordDate(), request.amount(), request.reason());
        return advances.save(advance);
    }

    @Transactional(readOnly = true)
    public List<EmployeeAdvance> list(Long employeeId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        if (employeeId == null) {
            return advances.findByAdvanceDateBetweenOrderByAdvanceDateDescCreatedAtDesc(from, to);
        }
        return advances.findByEmployeeIdAndAdvanceDateBetweenOrderByAdvanceDateDescCreatedAtDesc(employeeId, from, to);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be on or after from");
        }
    }
}
