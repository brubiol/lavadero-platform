package com.lavadero.api.reports.web;

import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.web.TicketDtos.TicketResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class DailySummaryDtos {
    private DailySummaryDtos() {
    }

    public record DailySummaryResponse(LocalDate date, long carsWashed, BigDecimal ticketRevenue,
            BigDecimal expensesTotal, BigDecimal result, long courtesyCount, long voidedCount,
            List<TicketResponse> recentTickets, BigDecimal cashVariance) {
        public static DailySummaryResponse from(LocalDate date, long carsWashed, BigDecimal ticketRevenue,
                BigDecimal expensesTotal, BigDecimal result, long courtesyCount, long voidedCount,
                List<Ticket> recentTickets, BigDecimal cashVariance) {
            return new DailySummaryResponse(date, carsWashed, ticketRevenue, expensesTotal, result,
                    courtesyCount, voidedCount, recentTickets.stream().map(TicketResponse::from).toList(),
                    cashVariance);
        }
    }
}
