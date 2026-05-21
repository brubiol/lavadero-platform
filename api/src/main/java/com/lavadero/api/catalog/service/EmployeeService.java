package com.lavadero.api.catalog.service;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.catalog.web.EmployeeDtos.CreateEmployeeRequest;
import com.lavadero.api.catalog.web.EmployeeDtos.UpdateEmployeeRequest;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeService {
    private final EmployeeRepository employees;

    public EmployeeService(EmployeeRepository employees) {
        this.employees = employees;
    }

    @Transactional(readOnly = true)
    public List<Employee> list(Boolean active) {
        if (active == null) {
            return employees.findAllByOrderByFullNameAsc();
        }
        return employees.findByActiveOrderByFullNameAsc(active);
    }

    @Transactional
    public Employee create(CreateEmployeeRequest request) {
        return employees.save(new Employee(request.fullName(), request.phone(), request.baseWeeklySalary(),
                request.payrollType(), request.commissionRate(), request.productivityBonusRate()));
    }

    @Transactional(readOnly = true)
    public Employee get(Long id) {
        return employees.findById(id).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
    }

    @Transactional
    public Employee update(Long id, UpdateEmployeeRequest request) {
        Employee employee = get(id);
        employee.update(request.fullName(), request.phone(), request.active(), request.baseWeeklySalary(),
                request.payrollType(), request.commissionRate(), request.productivityBonusRate(),
                request.deactivationReason(), request.primaryShift(), request.outOfShiftCommissionRate(),
                request.restDayPremium(), request.absenceDayPenalty());
        return employee;
    }

    @Transactional
    public void deactivate(Long id) {
        Employee employee = get(id);
        employee.deactivate();
    }
}
