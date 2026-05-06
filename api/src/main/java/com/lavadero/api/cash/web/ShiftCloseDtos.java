package com.lavadero.api.cash.web;

import com.lavadero.api.cash.domain.CashCount;
import com.lavadero.api.cash.domain.ShiftCloseSummary;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.ShiftStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class ShiftCloseDtos {
    private ShiftCloseDtos() {
    }

    public record CloseShiftRequest(@NotNull Long cashCountId, @Size(max = 500) String closingReason) {
    }

    public record ShiftCloseSummaryResponse(Long id, Long shiftId, Long businessDayId, ShiftStatus shiftStatus,
            BigDecimal ticketRevenue, BigDecimal cashRevenue, BigDecimal cardRevenue,
            BigDecimal expensesTotal, BigDecimal withdrawalsTotal, BigDecimal expectedCash,
            BigDecimal totalCounted, BigDecimal variance, String closingReason, Instant closedAt,
            CashCountDtos.CashCountResponse cashCount, boolean closed) {
        public static ShiftCloseSummaryResponse open(Shift shift, BigDecimal ticketRevenue, BigDecimal cashRevenue,
                BigDecimal cardRevenue, BigDecimal expensesTotal, BigDecimal withdrawalsTotal, BigDecimal expectedCash,
                CashCount cashCount) {
            BigDecimal totalCounted = cashCount == null ? null : cashCount.getTotalCounted();
            BigDecimal variance = totalCounted == null ? null : totalCounted.subtract(expectedCash);
            return new ShiftCloseSummaryResponse(null, shift.getId(), shift.getBusinessDay().getId(), shift.getStatus(),
                    ticketRevenue, cashRevenue, cardRevenue, expensesTotal, withdrawalsTotal, expectedCash,
                    totalCounted, variance, null, null,
                    cashCount == null ? null : CashCountDtos.CashCountResponse.from(cashCount), false);
        }

        public static ShiftCloseSummaryResponse closed(ShiftCloseSummary summary, BigDecimal cashRevenue,
                BigDecimal cardRevenue) {
            Shift shift = summary.getShift();
            return new ShiftCloseSummaryResponse(summary.getId(), shift.getId(), shift.getBusinessDay().getId(),
                    shift.getStatus(), summary.getTicketRevenue(), cashRevenue, cardRevenue,
                    summary.getExpensesTotal(), summary.getWithdrawalsTotal(), summary.getExpectedCash(),
                    summary.getTotalCounted(), summary.getVariance(), summary.getClosingReason(), summary.getClosedAt(),
                    CashCountDtos.CashCountResponse.from(summary.getCashCount()), true);
        }
    }
}
