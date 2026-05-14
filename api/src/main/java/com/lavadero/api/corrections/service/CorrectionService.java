package com.lavadero.api.corrections.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.cash.repository.ShiftCloseSummaryRepository;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.ShiftStatus;
import com.lavadero.api.operations.repository.ShiftRepository;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import com.lavadero.api.payroll.repository.PayrollPeriodRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CorrectionService {
    private final ShiftRepository shifts;
    private final ShiftCloseSummaryRepository closeSummaries;
    private final PayrollPeriodRepository payrollPeriods;
    private final AuditService audit;

    public CorrectionService(ShiftRepository shifts, ShiftCloseSummaryRepository closeSummaries,
            PayrollPeriodRepository payrollPeriods, AuditService audit) {
        this.shifts = shifts;
        this.closeSummaries = closeSummaries;
        this.payrollPeriods = payrollPeriods;
        this.audit = audit;
    }

    @Transactional
    public Shift reopenShift(Long shiftId, String reason) {
        Shift shift = shifts.findById(shiftId).orElseThrow(() -> new EntityNotFoundException("Shift not found"));
        if (shift.getStatus() != ShiftStatus.CLOSED) {
            throw new IllegalArgumentException("Only CLOSED shifts can be reopened");
        }
        closeSummaries.deleteByShiftId(shiftId);
        shift.reopenForCorrection();
        Shift saved = shifts.save(shift);
        audit.record("SHIFT_REOPENED", "SHIFT", shiftId, reason, shift.getBusinessDay().getBusinessDate().toString());
        return saved;
    }

    @Transactional
    public void unlockPayrollPeriod(Long periodId, String reason) {
        PayrollPeriod period = payrollPeriods.findById(periodId)
                .orElseThrow(() -> new EntityNotFoundException("Payroll period not found"));
        if (period.getStatus() != PayrollPeriodStatus.LOCKED) {
            throw new IllegalArgumentException("Only LOCKED payroll periods can be unlocked");
        }
        period.unlockForCorrection();
        payrollPeriods.save(period);
        audit.record("PAYROLL_UNLOCKED", "PAYROLL_PERIOD", periodId, reason,
                period.getStartDate() + " al " + period.getEndDate());
    }
}
