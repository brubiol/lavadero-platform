package com.lavadero.api.money.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.money.domain.EmployeeAdvance;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.money.web.EmployeeAdvanceDtos.CreateEmployeeAdvanceRequest;
import com.lavadero.api.money.web.EmployeeAdvanceDtos.UpdateEmployeeAdvanceRequest;
import com.lavadero.api.payroll.service.DebtLedgerService;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeAdvanceService {
    /** Flag when the same employee receives this many advances in one calendar day. */
    private static final int DAILY_ADVANCE_CAP_PER_EMPLOYEE = 2;
    /** Single advance at or above this amount is always flagged. */
    private static final BigDecimal LARGE_ADVANCE_THRESHOLD = new BigDecimal("500");

    private final EmployeeAdvanceRepository advances;
    private final EmployeeRepository employees;
    private final BusinessContextResolver contextResolver;
    private final DebtLedgerService debtLedger;
    private final AuditService audit;

    public EmployeeAdvanceService(EmployeeAdvanceRepository advances, EmployeeRepository employees,
            BusinessContextResolver contextResolver, DebtLedgerService debtLedger, AuditService audit) {
        this.advances = advances;
        this.employees = employees;
        this.contextResolver = contextResolver;
        this.debtLedger = debtLedger;
        this.audit = audit;
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
        EmployeeAdvance saved = advances.save(advance);
        debtLedger.recordAdvance(saved);
        audit.record("ADVANCE_CREATED", "EMPLOYEE_ADVANCE", saved.getId(), saved.getReason(),
                employee.getFullName() + " " + saved.getAmount());

        // Flag heuristics — still allowed, just surfaced for owner review
        long advancesToday = advances.countByEmployeeIdAndAdvanceDate(employee.getId(), context.recordDate());
        boolean overCap = advancesToday > DAILY_ADVANCE_CAP_PER_EMPLOYEE;
        boolean largeAmount = saved.getAmount().compareTo(LARGE_ADVANCE_THRESHOLD) >= 0;
        if (overCap || largeAmount) {
            String why = largeAmount
                    ? "Anticipo grande: $" + saved.getAmount() + (overCap ? " · " : "")
                    : "";
            why += overCap ? "Excede el límite diario de anticipos por empleado ("
                    + DAILY_ADVANCE_CAP_PER_EMPLOYEE + ")" : "";
            audit.recordFlagged("EMPLOYEE_ADVANCE_FLAGGED", "EMPLOYEE_ADVANCE", saved.getId(),
                    why, employee.getFullName() + " " + saved.getAmount()
                            + (saved.getReason() == null ? "" : " · " + saved.getReason()));
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<EmployeeAdvance> list(Long employeeId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        if (employeeId == null) {
            return advances.findByAdvanceDateBetweenOrderByAdvanceDateDescCreatedAtDesc(from, to);
        }
        return advances.findByEmployeeIdAndAdvanceDateBetweenOrderByAdvanceDateDescCreatedAtDesc(employeeId, from, to);
    }

    @Transactional
    public EmployeeAdvance update(Long id, UpdateEmployeeAdvanceRequest request) {
        EmployeeAdvance advance = advances.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Advance not found"));
        Employee employee = request.employeeId() == null
                ? null
                : employees.findById(request.employeeId())
                        .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        if (employee != null && !employee.isActive()) {
            throw new IllegalArgumentException("Employee must be active");
        }
        advance.update(employee, request.advanceDate(), request.amount(), request.reason());
        // Edit can change employee, amount, or date — easier to drop and re-insert
        // the debt ledger entry than try to patch it. replayAdvance handles that.
        debtLedger.replayAdvance(advance);
        audit.record("ADVANCE_EDITED", "EMPLOYEE_ADVANCE", advance.getId(), advance.getReason(),
                advance.getEmployee().getFullName() + " " + advance.getAmount());
        return advance;
    }

    @Transactional
    public void delete(Long id) {
        EmployeeAdvance advance = advances.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Advance not found"));
        advance.softDelete();
        // Wipe the debt ledger entry so the employee's running balance stops
        // including this advance immediately. replayAdvance no-ops on a deleted
        // advance after the delete, so the entry doesn't come back.
        debtLedger.replayAdvance(advance);
        audit.record("ADVANCE_DELETED", "EMPLOYEE_ADVANCE", advance.getId(), advance.getReason(),
                advance.getEmployee().getFullName() + " " + advance.getAmount());
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
