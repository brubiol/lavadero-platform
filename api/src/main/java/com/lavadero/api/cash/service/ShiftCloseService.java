package com.lavadero.api.cash.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.cash.domain.CashCount;
import com.lavadero.api.cash.domain.ShiftCloseSummary;
import com.lavadero.api.cash.repository.CashCountRepository;
import com.lavadero.api.cash.repository.ShiftCloseSummaryRepository;
import com.lavadero.api.cash.web.ShiftCloseDtos.CloseShiftRequest;
import com.lavadero.api.cash.web.ShiftCloseDtos.ShiftCloseSummaryResponse;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.money.repository.ExpenseRepository;
import com.lavadero.api.money.repository.WithdrawalRepository;
import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.ShiftStatus;
import com.lavadero.api.operations.domain.TicketStatus;
import com.lavadero.api.operations.repository.ShiftRepository;
import com.lavadero.api.operations.repository.TicketRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShiftCloseService {
    private final ShiftRepository shifts;
    private final TicketRepository tickets;
    private final ExpenseRepository expenses;
    private final WithdrawalRepository withdrawals;
    private final EmployeeAdvanceRepository advances;
    private final CashCountRepository cashCounts;
    private final ShiftCloseSummaryRepository closeSummaries;
    private final AuditService audit;

    public ShiftCloseService(ShiftRepository shifts, TicketRepository tickets, ExpenseRepository expenses,
            WithdrawalRepository withdrawals, EmployeeAdvanceRepository advances, CashCountRepository cashCounts,
            ShiftCloseSummaryRepository closeSummaries, AuditService audit) {
        this.shifts = shifts;
        this.tickets = tickets;
        this.expenses = expenses;
        this.withdrawals = withdrawals;
        this.advances = advances;
        this.cashCounts = cashCounts;
        this.closeSummaries = closeSummaries;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public ShiftCloseSummaryResponse summary(Long shiftId) {
        if (closeSummaries.existsByShiftId(shiftId)) {
            ShiftCloseSummary existing = closeSummaries.findByShiftId(shiftId).get();
            BigDecimal cashRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CASH);
            BigDecimal cardRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CARD);
            BigDecimal transferRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.TRANSFER);
            return ShiftCloseSummaryResponse.closed(existing, cashRevenue, cardRevenue, transferRevenue);
        }
        Shift shift = getShift(shiftId);
        CashCount latestCount = cashCounts.findByShiftIdOrderByCreatedAtDesc(shiftId).stream()
                .findFirst()
                .orElse(null);
        BigDecimal ticketRevenue = tickets.sumRevenueForShift(shiftId, TicketStatus.ACTIVE);
        BigDecimal cashRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CASH);
        BigDecimal cardRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CARD);
        BigDecimal transferRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.TRANSFER);
        BigDecimal expensesTotal = expenses.sumForShift(shiftId);
        BigDecimal withdrawalsTotal = withdrawals.sumForShift(shiftId);
        BigDecimal advancesTotal = advances.sumForShift(shiftId);
        // expected cash only counts cash payments; card and transfer go elsewhere and are excluded from the drawer count
        BigDecimal expectedCash = cashRevenue.subtract(expensesTotal).subtract(withdrawalsTotal).subtract(advancesTotal);
        return ShiftCloseSummaryResponse.open(shift, ticketRevenue, cashRevenue, cardRevenue, transferRevenue,
                expensesTotal, withdrawalsTotal, advancesTotal, expectedCash, latestCount);
    }

    @Transactional
    public ShiftCloseSummaryResponse close(Long shiftId, CloseShiftRequest request) {
        if (closeSummaries.existsByShiftId(shiftId)) {
            throw new IllegalArgumentException("Shift is already closed");
        }
        Shift shift = getShift(shiftId);
        if (shift.getStatus() != ShiftStatus.OPEN) {
            throw new IllegalArgumentException("Shift must be OPEN to close");
        }
        CashCount cashCount = cashCounts.findById(request.cashCountId())
                .orElseThrow(() -> new EntityNotFoundException("Cash count not found"));
        if (!cashCount.getShift().getId().equals(shiftId)) {
            throw new IllegalArgumentException("Cash count does not belong to shift");
        }

        BigDecimal ticketRevenue = tickets.sumRevenueForShift(shiftId, TicketStatus.ACTIVE);
        BigDecimal cashRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CASH);
        BigDecimal cardRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CARD);
        BigDecimal transferRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.TRANSFER);
        BigDecimal expensesTotal = expenses.sumForShift(shiftId);
        BigDecimal withdrawalsTotal = withdrawals.sumForShift(shiftId);
        BigDecimal advancesTotal = advances.sumForShift(shiftId);
        BigDecimal expectedCash = cashRevenue.subtract(expensesTotal).subtract(withdrawalsTotal).subtract(advancesTotal);
        BigDecimal variance = cashCount.getTotalCounted().subtract(expectedCash);
        String closingReason = normalize(request.closingReason());
        if (variance.signum() < 0 && closingReason == null) {
            throw new IllegalArgumentException("closingReason is required when cash is short");
        }

        shift.close();
        shifts.save(shift);
        ShiftCloseSummary saved = closeSummaries.save(new ShiftCloseSummary(shift, cashCount, ticketRevenue,
                expensesTotal, withdrawalsTotal, advancesTotal, expectedCash, cashCount.getTotalCounted(), variance,
                closingReason));
        audit.record("SHIFT_CLOSED", "SHIFT", shiftId, closingReason,
                "expected " + expectedCash + " counted " + cashCount.getTotalCounted() + " variance " + variance);
        return ShiftCloseSummaryResponse.closed(saved, cashRevenue, cardRevenue, transferRevenue);
    }

    private Shift getShift(Long shiftId) {
        return shifts.findById(shiftId).orElseThrow(() -> new EntityNotFoundException("Shift not found"));
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
