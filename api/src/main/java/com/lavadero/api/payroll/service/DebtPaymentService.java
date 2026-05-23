package com.lavadero.api.payroll.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.money.service.BusinessContextResolver;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.payroll.domain.DebtPayment;
import com.lavadero.api.payroll.repository.DebtPaymentRepository;
import com.lavadero.api.payroll.web.PayrollDtos.CreateDebtPaymentRequest;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DebtPaymentService {
    private final DebtPaymentRepository payments;
    private final EmployeeRepository employees;
    private final BusinessContextResolver contextResolver;
    private final DebtLedgerService debtLedger;
    private final AuditService audit;

    public DebtPaymentService(DebtPaymentRepository payments, EmployeeRepository employees,
            BusinessContextResolver contextResolver, DebtLedgerService debtLedger, AuditService audit) {
        this.payments = payments;
        this.employees = employees;
        this.contextResolver = contextResolver;
        this.debtLedger = debtLedger;
        this.audit = audit;
    }

    @Transactional
    public DebtPayment create(Long employeeId, CreateDebtPaymentRequest request) {
        Employee employee = employees.findById(employeeId)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        if (request.amount() == null || request.amount().signum() <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        BigDecimal currentBalance = debtLedger.balance(employee);
        if (currentBalance.signum() <= 0) {
            throw new IllegalArgumentException("Employee has no outstanding debt");
        }
        if (request.amount().compareTo(currentBalance) > 0) {
            throw new IllegalArgumentException(
                    "amount exceeds current debt balance of " + currentBalance);
        }
        Context context = contextResolver.resolve(request.businessDayId(), request.shiftId(), request.paymentDate());
        DebtPayment payment = new DebtPayment(context.businessDay(), context.shift(), employee,
                context.recordDate(), request.amount(), request.note());
        DebtPayment saved = payments.save(payment);
        debtLedger.recordCashPayment(employee, saved.getPaymentDate(), saved.getAmount(), saved.getNote());
        audit.record("DEBT_PAYMENT_CREATED", "DEBT_PAYMENT", saved.getId(), saved.getNote(),
                employee.getFullName() + " " + saved.getAmount());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<DebtPayment> list(Long employeeId, LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be on or after from");
        }
        if (employeeId == null) {
            return payments.findByPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(from, to);
        }
        return payments.findByEmployeeIdAndPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(employeeId, from, to);
    }
}
