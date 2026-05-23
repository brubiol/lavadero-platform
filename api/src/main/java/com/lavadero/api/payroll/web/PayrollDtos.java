package com.lavadero.api.payroll.web;

import com.lavadero.api.payroll.domain.DebtPayment;
import com.lavadero.api.payroll.domain.PayrollAdjustment;
import com.lavadero.api.payroll.domain.PayrollAdjustmentType;
import com.lavadero.api.payroll.domain.PayrollDay;
import com.lavadero.api.payroll.domain.PayrollEntry;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class PayrollDtos {
    private PayrollDtos() {
    }

    public record CreatePayrollPeriodRequest(@NotNull LocalDate startDate) {
    }

    public record CreatePayrollAdjustmentRequest(
            @NotNull Long employeeId,
            @NotNull PayrollAdjustmentType type,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotBlank @Size(max = 120) String concept,
            @Size(max = 500) String note) {
    }

    public record PayrollPeriodResponse(Long id, LocalDate startDate, LocalDate endDate, PayrollPeriodStatus status,
            Instant computedAt, Instant lockedAt, List<PayrollEntryResponse> entries, List<PayrollDayResponse> days,
            List<PayrollAdjustmentResponse> adjustments) {
        public static PayrollPeriodResponse from(PayrollPeriod period, List<PayrollEntry> entries,
                List<PayrollDay> days, List<PayrollAdjustment> adjustments) {
            return new PayrollPeriodResponse(period.getId(), period.getStartDate(), period.getEndDate(),
                    period.getStatus(), period.getComputedAt(), period.getLockedAt(),
                    entries.stream().map(PayrollEntryResponse::from).toList(),
                    days.stream().map(PayrollDayResponse::from).toList(),
                    adjustments.stream().map(PayrollAdjustmentResponse::from).toList());
        }

        public static PayrollPeriodResponse summary(PayrollPeriod period) {
            return from(period, List.of(), List.of(), List.of());
        }
    }

    public record PayrollEntryResponse(Long id, Long employeeId, String employeeName, BigDecimal carsWashed,
            BigDecimal baseSalary, BigDecimal restDayPay, BigDecimal absenceDeduction, BigDecimal carsBonusRate,
            BigDecimal carsBonus, BigDecimal commissions, BigDecimal tipsPoolShare, BigDecimal manualEarnings,
            BigDecimal manualDeductions, BigDecimal advancesDeducted, BigDecimal grossPay, BigDecimal netPay) {
        public static PayrollEntryResponse from(PayrollEntry entry) {
            return new PayrollEntryResponse(entry.getId(), entry.getEmployee().getId(), entry.getEmployee().getFullName(),
                    entry.getCarsWashed(), entry.getBaseSalary(), entry.getRestDayPay(), entry.getAbsenceDeduction(),
                    entry.getCarsBonusRate(), entry.getCarsBonus(), entry.getCommissions(), entry.getTipsPoolShare(),
                    entry.getManualEarnings(), entry.getManualDeductions(), entry.getAdvancesDeducted(),
                    entry.getGrossPay(), entry.getNetPay());
        }
    }

    public record PayrollDayResponse(Long id, Long employeeId, String employeeName, LocalDate workDate,
            BigDecimal carsWashed, BigDecimal ticketRevenue) {
        public static PayrollDayResponse from(PayrollDay day) {
            return new PayrollDayResponse(day.getId(), day.getEmployee().getId(), day.getEmployee().getFullName(),
                    day.getWorkDate(), day.getCarsWashed(), day.getTicketRevenue());
        }
    }

    public record DebtBalanceResponse(Long employeeId, BigDecimal balance) {
    }

    public record CreateDebtPaymentRequest(
            @NotNull LocalDate paymentDate,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            Long businessDayId,
            Long shiftId,
            @Size(max = 500) String note) {
    }

    public record DebtPaymentResponse(Long id, Long employeeId, String employeeName, LocalDate paymentDate,
            BigDecimal amount, String note, BigDecimal newBalance, Instant createdAt) {
        public static DebtPaymentResponse from(DebtPayment payment, BigDecimal newBalance) {
            return new DebtPaymentResponse(payment.getId(), payment.getEmployee().getId(),
                    payment.getEmployee().getFullName(), payment.getPaymentDate(), payment.getAmount(),
                    payment.getNote(), newBalance, payment.getCreatedAt());
        }
    }

    public record PayrollAdjustmentResponse(Long id, Long payrollPeriodId, Long employeeId, String employeeName,
            PayrollAdjustmentType type, BigDecimal amount, String concept, String note, Instant createdAt,
            Instant updatedAt) {
        public static PayrollAdjustmentResponse from(PayrollAdjustment adjustment) {
            return new PayrollAdjustmentResponse(adjustment.getId(), adjustment.getPayrollPeriod().getId(),
                    adjustment.getEmployee().getId(), adjustment.getEmployee().getFullName(), adjustment.getType(),
                    adjustment.getAmount(), adjustment.getConcept(), adjustment.getNote(), adjustment.getCreatedAt(),
                    adjustment.getUpdatedAt());
        }
    }
}
