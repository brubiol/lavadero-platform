package com.lavadero.api.payroll.web;

import com.lavadero.api.payroll.domain.PayrollDay;
import com.lavadero.api.payroll.domain.PayrollEntry;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class PayrollDtos {
    private PayrollDtos() {
    }

    public record CreatePayrollPeriodRequest(@NotNull LocalDate startDate) {
    }

    public record PayrollPeriodResponse(Long id, LocalDate startDate, LocalDate endDate, PayrollPeriodStatus status,
            Instant computedAt, Instant lockedAt, List<PayrollEntryResponse> entries, List<PayrollDayResponse> days) {
        public static PayrollPeriodResponse from(PayrollPeriod period, List<PayrollEntry> entries,
                List<PayrollDay> days) {
            return new PayrollPeriodResponse(period.getId(), period.getStartDate(), period.getEndDate(),
                    period.getStatus(), period.getComputedAt(), period.getLockedAt(),
                    entries.stream().map(PayrollEntryResponse::from).toList(),
                    days.stream().map(PayrollDayResponse::from).toList());
        }

        public static PayrollPeriodResponse summary(PayrollPeriod period) {
            return from(period, List.of(), List.of());
        }
    }

    public record PayrollEntryResponse(Long id, Long employeeId, String employeeName, BigDecimal carsWashed,
            BigDecimal baseSalary, BigDecimal carsBonusRate, BigDecimal carsBonus, BigDecimal commissions,
            BigDecimal tipsPoolShare, BigDecimal advancesDeducted, BigDecimal netPay) {
        public static PayrollEntryResponse from(PayrollEntry entry) {
            return new PayrollEntryResponse(entry.getId(), entry.getEmployee().getId(), entry.getEmployee().getFullName(),
                    entry.getCarsWashed(), entry.getBaseSalary(), entry.getCarsBonusRate(), entry.getCarsBonus(),
                    entry.getCommissions(), entry.getTipsPoolShare(), entry.getAdvancesDeducted(), entry.getNetPay());
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
}
