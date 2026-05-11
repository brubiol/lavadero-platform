package com.lavadero.api.reports.service;

import com.lavadero.api.cash.domain.ShiftCloseSummary;
import com.lavadero.api.cash.repository.ShiftCloseSummaryRepository;
import com.lavadero.api.inventory.repository.ProductMovementRepository;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.money.repository.ExpenseRepository;
import com.lavadero.api.money.repository.WithdrawalRepository;
import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.domain.TicketAssignment;
import com.lavadero.api.operations.domain.TicketStatus;
import com.lavadero.api.operations.repository.TicketAssignmentRepository;
import com.lavadero.api.operations.repository.TicketRepository;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.repository.PayrollPeriodRepository;
import com.lavadero.api.reports.domain.HistoricalDailySnapshot;
import com.lavadero.api.reports.repository.HistoricalDailySnapshotRepository;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.CashVarianceResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.CashVarianceRow;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryRangeResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.EmployeePerformanceResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.EmployeePerformanceRow;
import com.lavadero.api.reports.web.DailySummaryDtos.ExportPreviewResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.HistoricalRangeResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.HistoricalSnapshotRow;
import com.lavadero.api.reports.web.DailySummaryDtos.MonthlySummaryResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DailySummaryService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100.00");

    private final TicketRepository tickets;
    private final ExpenseRepository expenses;
    private final WithdrawalRepository withdrawals;
    private final EmployeeAdvanceRepository advances;
    private final ShiftCloseSummaryRepository closeSummaries;
    private final TicketAssignmentRepository assignments;
    private final ProductMovementRepository inventoryMovements;
    private final PayrollPeriodRepository payrollPeriods;
    private final HistoricalDailySnapshotRepository historicalSnapshots;

    public DailySummaryService(TicketRepository tickets, ExpenseRepository expenses, WithdrawalRepository withdrawals,
            EmployeeAdvanceRepository advances, ShiftCloseSummaryRepository closeSummaries,
            TicketAssignmentRepository assignments, ProductMovementRepository inventoryMovements,
            PayrollPeriodRepository payrollPeriods, HistoricalDailySnapshotRepository historicalSnapshots) {
        this.tickets = tickets;
        this.expenses = expenses;
        this.withdrawals = withdrawals;
        this.advances = advances;
        this.closeSummaries = closeSummaries;
        this.assignments = assignments;
        this.inventoryMovements = inventoryMovements;
        this.payrollPeriods = payrollPeriods;
        this.historicalSnapshots = historicalSnapshots;
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

    @Transactional(readOnly = true)
    public DailySummaryRangeResponse getRange(LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<DailySummaryResponse> days = from.datesUntil(to.plusDays(1))
                .map(this::get)
                .toList();
        long carsWashed = days.stream().mapToLong(DailySummaryResponse::carsWashed).sum();
        long courtesyCount = days.stream().mapToLong(DailySummaryResponse::courtesyCount).sum();
        long voidedCount = days.stream().mapToLong(DailySummaryResponse::voidedCount).sum();
        BigDecimal ticketRevenue = sum(days.stream().map(DailySummaryResponse::ticketRevenue).toList());
        BigDecimal moneyOut = sum(days.stream().map(DailySummaryResponse::expensesTotal).toList());
        BigDecimal withdrawalsTotal = sum(withdrawals.findByWithdrawalDateBetweenOrderByWithdrawalDateDescCreatedAtDesc(from, to)
                .stream().map(item -> item.getAmount()).toList());
        BigDecimal advancesTotal = sum(advances.findByAdvanceDateBetween(from, to)
                .stream().map(item -> item.getAmount()).toList());
        BigDecimal cashVariance = sumNullable(days.stream().map(DailySummaryResponse::cashVariance).toList());

        return new DailySummaryRangeResponse(from, to, carsWashed, ticketRevenue, moneyOut,
                withdrawalsTotal, advancesTotal, ticketRevenue.subtract(moneyOut), courtesyCount,
                voidedCount, cashVariance, days);
    }

    @Transactional(readOnly = true)
    public MonthlySummaryResponse getMonthly(int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        DailySummaryRangeResponse range = getRange(yearMonth.atDay(1), yearMonth.atEndOfMonth());
        return new MonthlySummaryResponse(year, month, range.from(), range.to(), range.carsWashed(),
                range.ticketRevenue(), range.expensesTotal(), range.withdrawalsTotal(), range.advancesTotal(),
                range.result(), range.courtesyCount(), range.voidedCount(), range.cashVariance(), range.days());
    }

    @Transactional(readOnly = true)
    public CashVarianceResponse cashVariance(LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<CashVarianceRow> rows = closeSummaries
                .findByShiftBusinessDayBusinessDateBetweenOrderByShiftBusinessDayBusinessDateAsc(from, to)
                .stream()
                .map(summary -> new CashVarianceRow(
                        summary.getShift().getBusinessDay().getBusinessDate(),
                        summary.getShift().getId(),
                        summary.getShift().getShiftType().name(),
                        summary.getExpectedCash(),
                        summary.getTotalCounted(),
                        summary.getVariance(),
                        summary.getClosingReason()))
                .toList();
        return new CashVarianceResponse(from, to, sum(rows.stream().map(CashVarianceRow::expectedCash).toList()),
                sum(rows.stream().map(CashVarianceRow::totalCounted).toList()),
                sum(rows.stream().map(CashVarianceRow::variance).toList()), rows);
    }

    @Transactional(readOnly = true)
    public EmployeePerformanceResponse employeePerformance(LocalDate from, LocalDate to) {
        validateRange(from, to);
        Map<Long, EmployeeTotals> totals = new HashMap<>();
        for (TicketAssignment assignment : assignments.findActiveInDateRange(from, to)) {
            Ticket ticket = assignment.getTicket();
            BigDecimal share = assignment.getSharePct().divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
            BigDecimal revenueShare = ticket.isCourtesy()
                    ? ZERO
                    : ticket.getPriceAmount().multiply(share);
            totals.computeIfAbsent(assignment.getEmployee().getId(),
                            id -> new EmployeeTotals(assignment.getEmployee().getFullName()))
                    .add(share, revenueShare);
        }
        List<EmployeePerformanceRow> rows = totals.entrySet().stream()
                .map(entry -> new EmployeePerformanceRow(entry.getKey(), entry.getValue().name,
                        entry.getValue().carsWashed, entry.getValue().ticketRevenue, entry.getValue().ticketCount))
                .sorted(Comparator.comparing(EmployeePerformanceRow::carsWashed).reversed())
                .toList();
        return new EmployeePerformanceResponse(from, to, rows);
    }

    @Transactional(readOnly = true)
    public ExportPreviewResponse exportPreview(String type, LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<Ticket> rangeTickets = tickets.findAll(forRange(from, to), Sort.by("createdAt").ascending());
        BigDecimal ticketRevenue = rangeTickets.stream()
                .filter(ticket -> ticket.getStatus() != TicketStatus.VOIDED)
                .filter(ticket -> !ticket.isCourtesy())
                .map(Ticket::getPriceAmount)
                .reduce(ZERO, BigDecimal::add);
        BigDecimal expensesTotal = sum(expenses.findByExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(from, to)
                .stream().map(item -> item.getAmount()).toList());
        BigDecimal withdrawalsTotal = sum(withdrawals.findByWithdrawalDateBetweenOrderByWithdrawalDateDescCreatedAtDesc(from, to)
                .stream().map(item -> item.getAmount()).toList());
        BigDecimal advancesTotal = sum(advances.findByAdvanceDateBetween(from, to)
                .stream().map(item -> item.getAmount()).toList());
        int shiftCloseCount = closeSummaries
                .findByShiftBusinessDayBusinessDateBetweenOrderByShiftBusinessDayBusinessDateAsc(from, to).size();
        int inventoryMovementCount = inventoryMovements
                .findByMovementDateBetweenOrderByMovementDateAscCreatedAtAsc(startInstant(from), endInstant(to)).size();
        int payrollPeriodCount = payrollPeriods
                .findByStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(to, from).size();
        return new ExportPreviewResponse(type, from, to, rangeTickets.size(), ticketRevenue, expensesTotal,
                withdrawalsTotal, advancesTotal, shiftCloseCount, inventoryMovementCount, payrollPeriodCount);
    }

    @Transactional(readOnly = true)
    public HistoricalRangeResponse getHistorical(LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<HistoricalDailySnapshot> snapshots =
                historicalSnapshots.findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to);
        long totalCars = snapshots.stream()
                .filter(s -> s.getTotalCars() != null)
                .mapToLong(HistoricalDailySnapshot::getTotalCars)
                .sum();
        BigDecimal totalRevenue = sum(snapshots.stream().map(HistoricalDailySnapshot::getRevenueMxn).toList());
        BigDecimal totalExpenses = sum(snapshots.stream().map(HistoricalDailySnapshot::getExpensesMxn).toList());
        BigDecimal totalResultado = sum(snapshots.stream().map(HistoricalDailySnapshot::getResultadoMxn).toList());
        List<HistoricalSnapshotRow> days = snapshots.stream()
                .map(s -> new HistoricalSnapshotRow(s.getSnapshotDate(), s.getTotalCars(),
                        s.getRevenueMxn(), s.getExpensesMxn(), s.getResultadoMxn(), s.getSource()))
                .toList();
        return new HistoricalRangeResponse(from, to, snapshots.size(), totalCars,
                totalRevenue, totalExpenses, totalResultado, days);
    }

    public List<Ticket> ticketsInRange(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return tickets.findAll(forRange(from, to), Sort.by("createdAt").ascending());
    }

    public static Instant startInstant(LocalDate date) {
        return date.atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    public static Instant endInstant(LocalDate date) {
        return date.atTime(LocalTime.MAX).toInstant(ZoneOffset.UTC);
    }

    private Specification<Ticket> forDate(LocalDate date) {
        return (root, query, cb) -> cb.equal(root.get("businessDay").get("businessDate"), date);
    }

    private Specification<Ticket> forRange(LocalDate from, LocalDate to) {
        return (root, query, cb) -> cb.between(root.get("businessDay").get("businessDate"), from, to);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("Date range is invalid");
        }
    }

    private BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(ZERO, BigDecimal::add);
    }

    private BigDecimal sumNullable(List<BigDecimal> values) {
        List<BigDecimal> present = values.stream().filter(value -> value != null).toList();
        return present.isEmpty() ? null : sum(present);
    }

    private static final class EmployeeTotals {
        private final String name;
        private BigDecimal carsWashed = ZERO;
        private BigDecimal ticketRevenue = ZERO;
        private long ticketCount;

        private EmployeeTotals(String name) {
            this.name = name;
        }

        private void add(BigDecimal carsWashed, BigDecimal ticketRevenue) {
            this.carsWashed = this.carsWashed.add(carsWashed);
            this.ticketRevenue = this.ticketRevenue.add(ticketRevenue);
            this.ticketCount++;
        }
    }
}
