package com.lavadero.api.reports.service;

import com.lavadero.api.cash.domain.ShiftCloseSummary;
import com.lavadero.api.cash.repository.ShiftCloseSummaryRepository;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.money.repository.ExpenseRepository;
import com.lavadero.api.money.repository.WithdrawalRepository;
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
    private final ExpenseRepository expenses;
    private final WithdrawalRepository withdrawals;
    private final EmployeeAdvanceRepository advances;
    private final ShiftCloseSummaryRepository closeSummaries;

    public DailySummaryService(TicketRepository tickets, ExpenseRepository expenses, WithdrawalRepository withdrawals,
            EmployeeAdvanceRepository advances, ShiftCloseSummaryRepository closeSummaries) {
        this.tickets = tickets;
        this.expenses = expenses;
        this.withdrawals = withdrawals;
        this.advances = advances;
        this.closeSummaries = closeSummaries;
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

        BigDecimal expensesTotal = expenses.sumForDate(date)
                .add(withdrawals.sumForDate(date))
                .add(advances.sumForDate(date));
        BigDecimal result = ticketRevenue.subtract(expensesTotal);
        List<Ticket> recentTickets = dailyTickets.stream().limit(10).toList();
        List<ShiftCloseSummary> closes = closeSummaries.findByShiftBusinessDayBusinessDate(date);
        BigDecimal cashVariance = closes.isEmpty()
                ? null
                : closes.stream().map(ShiftCloseSummary::getVariance).reduce(ZERO, BigDecimal::add);

        return DailySummaryResponse.from(date, carsWashed, ticketRevenue, expensesTotal, result,
                courtesyCount, voidedCount, recentTickets, cashVariance);
    }

    private Specification<Ticket> forDate(LocalDate date) {
        return (root, query, cb) -> cb.equal(root.get("businessDay").get("businessDate"), date);
    }
}
