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
            BigDecimal cashRevenue, BigDecimal cardRevenue, BigDecimal transferRevenue,
            BigDecimal inventorySalesRevenue, BigDecimal prepaidSalesRevenue, BigDecimal inventoryPurchaseCost,
            BigDecimal expensesTotal, BigDecimal withdrawalsTotal, BigDecimal advancesTotal,
            BigDecimal result, long courtesyCount, long voidedCount, List<TicketResponse> recentTickets,
            BigDecimal cashVariance) {
        public static DailySummaryResponse from(LocalDate date, long carsWashed, BigDecimal ticketRevenue,
                BigDecimal cashRevenue, BigDecimal cardRevenue, BigDecimal transferRevenue,
                BigDecimal inventorySalesRevenue, BigDecimal prepaidSalesRevenue, BigDecimal inventoryPurchaseCost,
                BigDecimal expensesTotal, BigDecimal withdrawalsTotal, BigDecimal advancesTotal,
                BigDecimal result, long courtesyCount, long voidedCount, List<Ticket> recentTickets,
                BigDecimal cashVariance) {
            return new DailySummaryResponse(date, carsWashed, ticketRevenue, cashRevenue, cardRevenue, transferRevenue,
                    inventorySalesRevenue, prepaidSalesRevenue, inventoryPurchaseCost, expensesTotal, withdrawalsTotal,
                    advancesTotal, result, courtesyCount, voidedCount,
                    recentTickets.stream().map(TicketResponse::from).toList(), cashVariance);
        }
    }

    public record DailySummaryRangeResponse(LocalDate from, LocalDate to, long carsWashed,
            BigDecimal ticketRevenue, BigDecimal inventorySalesRevenue, BigDecimal prepaidSalesRevenue,
            BigDecimal inventoryPurchaseCost, BigDecimal expensesTotal, BigDecimal withdrawalsTotal,
            BigDecimal advancesTotal, BigDecimal result, long courtesyCount, long voidedCount,
            BigDecimal cashVariance, List<DailySummaryResponse> days) {
    }

    public record MonthlySummaryResponse(int year, int month, LocalDate from, LocalDate to, long carsWashed,
            BigDecimal ticketRevenue, BigDecimal inventorySalesRevenue, BigDecimal prepaidSalesRevenue,
            BigDecimal inventoryPurchaseCost, BigDecimal expensesTotal, BigDecimal withdrawalsTotal,
            BigDecimal advancesTotal, BigDecimal result, long courtesyCount, long voidedCount,
            BigDecimal cashVariance, List<DailySummaryResponse> days) {
    }

    public record CashVarianceResponse(LocalDate from, LocalDate to, BigDecimal expectedCash,
            BigDecimal totalCounted, BigDecimal variance, List<CashVarianceRow> rows) {
    }

    public record CashVarianceRow(LocalDate date, Long shiftId, String shiftType, BigDecimal expectedCash,
            BigDecimal totalCounted, BigDecimal variance, String closingReason) {
    }

    public record EmployeePerformanceResponse(LocalDate from, LocalDate to, List<EmployeePerformanceRow> employees) {
    }

    public record EmployeePerformanceRow(Long employeeId, String employeeName, BigDecimal carsWashed,
            BigDecimal ticketRevenue, long ticketCount) {
    }

    public record ExportPreviewResponse(String type, LocalDate from, LocalDate to, long ticketCount,
            BigDecimal ticketRevenue, BigDecimal expensesTotal, BigDecimal withdrawalsTotal,
            BigDecimal advancesTotal, int shiftCloseCount, int inventoryMovementCount, int payrollPeriodCount) {
    }

    public record HistoricalSnapshotRow(LocalDate date, Integer totalCars, BigDecimal revenueMxn,
            BigDecimal expensesMxn, BigDecimal resultadoMxn, String source) {
    }

    public record HistoricalRangeResponse(LocalDate from, LocalDate to, long totalDays, long totalCars,
            BigDecimal totalRevenue, BigDecimal totalExpenses, BigDecimal totalResultado,
            List<HistoricalSnapshotRow> days) {
    }
}
