package com.lavadero.api.catalog.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.catalog.web.EmployeeDtos.CreateEmployeeRequest;
import com.lavadero.api.catalog.web.EmployeeDtos.UpdateEmployeeRequest;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeService {
    // A pay number that moves by more than 30% is treated as irregular and
    // flagged for the owner to review.
    private static final BigDecimal IRREGULAR_CHANGE_RATIO = new BigDecimal("0.30");

    private final EmployeeRepository employees;
    private final AuditService audit;

    public EmployeeService(EmployeeRepository employees, AuditService audit) {
        this.employees = employees;
        this.audit = audit;
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
        Employee saved = employees.save(new Employee(request.fullName(), request.phone(), request.baseWeeklySalary(),
                request.payrollType(), request.commissionRate(), request.productivityBonusRate()));
        if (request.baseWeeklySalary() != null && request.baseWeeklySalary().signum() > 0) {
            audit.recordFlagged("EMPLOYEE_CREATED_SALARIED", "EMPLOYEE", saved.getId(),
                    "Nuevo empleado con sueldo: " + saved.getFullName(),
                    "Sueldo semanal " + request.baseWeeklySalary().toPlainString());
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public Employee get(Long id) {
        return employees.findById(id).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
    }

    @Transactional
    public Employee update(Long id, UpdateEmployeeRequest request) {
        Employee employee = get(id);
        List<String> irregular = detectIrregularChanges(employee, request);
        boolean newlyFlaggedBad = Boolean.TRUE.equals(request.doNotRehire()) && !employee.isDoNotRehire();
        employee.update(request.fullName(), request.phone(), request.active(), request.baseWeeklySalary(),
                request.payrollType(), request.commissionRate(), request.productivityBonusRate(),
                request.deactivationReason(), request.primaryShift(), request.outOfShiftCommissionRate(),
                request.restDayPremium(), request.absenceDayPenalty(),
                request.doNotRehire(), request.doNotRehireNote());
        if (newlyFlaggedBad) {
            audit.recordFlagged("EMPLOYEE_DO_NOT_REHIRE", "EMPLOYEE", id,
                    "Marcado como no recontratar: " + employee.getFullName(),
                    employee.getDoNotRehireNote() == null ? "" : employee.getDoNotRehireNote());
        }
        if (!irregular.isEmpty()) {
            audit.recordFlagged("EMPLOYEE_COMP_CHANGED", "EMPLOYEE", id,
                    "Cambio inusual de pago: " + employee.getFullName(), String.join("; ", irregular));
        }
        return employee;
    }

    // Compares each pay number in the request against the current value and
    // returns a description for every change large enough to need owner review.
    private List<String> detectIrregularChanges(Employee employee, UpdateEmployeeRequest request) {
        List<String> flags = new ArrayList<>();
        checkComp(flags, "sueldo semanal", employee.getBaseWeeklySalary(), request.baseWeeklySalary());
        checkComp(flags, "pago por carro", employee.getCommissionRate(), request.commissionRate());
        checkComp(flags, "bono de productividad", employee.getProductivityBonusRate(),
                request.productivityBonusRate());
        checkComp(flags, "pago por carro fuera de turno", employee.getOutOfShiftCommissionRate(),
                request.outOfShiftCommissionRate());
        checkComp(flags, "premio de dia de descanso", employee.getRestDayPremium(), request.restDayPremium());
        checkComp(flags, "penalizacion por falta", employee.getAbsenceDayPenalty(), request.absenceDayPenalty());
        return flags;
    }

    private void checkComp(List<String> flags, String label, BigDecimal oldValue, BigDecimal newValue) {
        if (oldValue == null || newValue == null || newValue.compareTo(oldValue) == 0) {
            return;
        }
        boolean irregular = oldValue.signum() == 0
                ? newValue.signum() > 0
                : newValue.subtract(oldValue).abs().divide(oldValue, 4, RoundingMode.HALF_UP)
                        .compareTo(IRREGULAR_CHANGE_RATIO) > 0;
        if (irregular) {
            flags.add(label + " " + oldValue.toPlainString() + " -> " + newValue.toPlainString());
        }
    }

    @Transactional
    public void deactivate(Long id) {
        Employee employee = get(id);
        employee.deactivate();
    }
}
