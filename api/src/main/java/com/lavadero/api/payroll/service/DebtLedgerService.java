package com.lavadero.api.payroll.service;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.money.domain.EmployeeAdvance;
import com.lavadero.api.payroll.domain.DebtLedgerEntry;
import com.lavadero.api.payroll.domain.DebtLedgerType;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.repository.DebtLedgerRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DebtLedgerService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final DebtLedgerRepository debtLedger;
    private final EmployeeRepository employees;

    public DebtLedgerService(DebtLedgerRepository debtLedger, EmployeeRepository employees) {
        this.debtLedger = debtLedger;
        this.employees = employees;
    }

    @Transactional
    public void recordAdvance(EmployeeAdvance advance) {
        if (debtLedger.existsByEmployeeAdvanceIdAndType(advance.getId(), DebtLedgerType.ADVANCE)) {
            return;
        }
        debtLedger.save(new DebtLedgerEntry(advance.getEmployee(), advance.getAdvanceDate(), DebtLedgerType.ADVANCE,
                advance.getAmount(), advance, null, advance.getReason()));
    }

    /**
     * Drops the ADVANCE ledger entry for a given advance and re-records it with
     * the current amount/date — used when the advance is edited or soft-deleted
     * so the running debt balance stays in sync. Pass a deleted advance to drop
     * the entry without recording a replacement.
     */
    @Transactional
    public void replayAdvance(EmployeeAdvance advance) {
        debtLedger.deleteByEmployeeAdvanceIdAndType(advance.getId(), DebtLedgerType.ADVANCE);
        if (advance.getDeletedAt() == null) {
            debtLedger.save(new DebtLedgerEntry(advance.getEmployee(), advance.getAdvanceDate(), DebtLedgerType.ADVANCE,
                    advance.getAmount(), advance, null, advance.getReason()));
        }
    }

    @Transactional
    public void recordPayrollDeduction(Employee employee, PayrollPeriod period, BigDecimal amount) {
        if (amount.signum() <= 0) {
            return;
        }
        debtLedger.save(new DebtLedgerEntry(employee, period.getEndDate(), DebtLedgerType.PAYROLL_DEDUCTION, amount,
                null, period, "Descuento de nomina"));
    }

    /**
     * Records a cash repayment of an existing debt balance. Called by
     * DebtPaymentService after the corresponding debt_payments row is saved.
     * Caller is responsible for validating the amount against the current
     * balance — this method does not re-check.
     */
    @Transactional
    public void recordCashPayment(Employee employee, LocalDate date, BigDecimal amount, String note) {
        if (amount.signum() <= 0) {
            return;
        }
        debtLedger.save(new DebtLedgerEntry(employee, date, DebtLedgerType.PAYMENT, amount, null, null,
                note == null || note.isBlank() ? "Pago en efectivo" : note));
    }

    @Transactional(readOnly = true)
    public BigDecimal balance(Long employeeId) {
        employees.findById(employeeId).orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        return balanceFrom(debtLedger.findByEmployeeIdOrderByEntryDateAscCreatedAtAsc(employeeId));
    }

    @Transactional(readOnly = true)
    public BigDecimal balance(Employee employee) {
        return balanceFrom(debtLedger.findByEmployeeIdOrderByEntryDateAscCreatedAtAsc(employee.getId()));
    }

    private BigDecimal balanceFrom(List<DebtLedgerEntry> entries) {
        BigDecimal balance = ZERO;
        for (DebtLedgerEntry entry : entries) {
            if (entry.getType() == DebtLedgerType.ADVANCE) {
                balance = balance.add(entry.getAmount());
            } else {
                balance = balance.subtract(entry.getAmount());
            }
        }
        return balance;
    }
}
