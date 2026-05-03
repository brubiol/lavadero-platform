package com.lavadero.api.reports.service;

import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.domain.TicketStatus;
import com.lavadero.api.operations.repository.TicketRepository;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DailySummaryService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final TicketRepository tickets;

    public DailySummaryService(TicketRepository tickets) {
        this.tickets = tickets;
    }

    @Transactional(readOnly = true)
    public DailySummaryResponse get(LocalDate date) {
        List<Ticket> dailyTickets = tickets.findAll(forDate(date), Sort.by("createdAt").descending());

        long carsWashed = dailyTickets.stream()
                .filter(ticket -> ticket.getStatus() != TicketStatus.VOIDED)
                .count();
        long courtesyCount = dailyTickets.stream()
                .filter(ticket -> ticket.getStatus() != TicketStatus.VOIDED)
                .filter(Ticket::isCourtesy)
                .count();
        long voidedCount = dailyTickets.stream()
                .filter(ticket -> ticket.getStatus() == TicketStatus.VOIDED)
                .count();
        BigDecimal ticketRevenue = dailyTickets.stream()
                .filter(ticket -> ticket.getStatus() != TicketStatus.VOIDED)
                .filter(ticket -> !ticket.isCourtesy())
                .map(Ticket::getPriceAmount)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal expensesTotal = ZERO;
        BigDecimal result = ticketRevenue.subtract(expensesTotal);
        List<Ticket> recentTickets = dailyTickets.stream().limit(10).toList();

        return DailySummaryResponse.from(date, carsWashed, ticketRevenue, expensesTotal, result,
                courtesyCount, voidedCount, recentTickets, null);
    }

    private Specification<Ticket> forDate(LocalDate date) {
        return (root, query, cb) -> cb.equal(root.get("businessDay").get("businessDate"), date);
    }
}
