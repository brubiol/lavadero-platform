package com.lavadero.api.cash.service;

import com.lavadero.api.cash.domain.CashCount;
import com.lavadero.api.cash.domain.ShiftCloseSummary;
import com.lavadero.api.cash.repository.CashCountRepository;
import com.lavadero.api.cash.repository.ShiftCloseSummaryRepository;
import com.lavadero.api.cash.web.ShiftCloseDtos.CloseShiftRequest;
import com.lavadero.api.cash.web.ShiftCloseDtos.ShiftCloseSummaryResponse;
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
    private final CashCountRepository cashCounts;
    private final ShiftCloseSummaryRepository closeSummaries;

    public ShiftCloseService(ShiftRepository shifts, TicketRepository tickets, ExpenseRepository expenses,
            WithdrawalRepository withdrawals, CashCountRepository cashCounts,
            ShiftCloseSummaryRepository closeSummaries) {
        this.shifts = shifts;
        this.tickets = tickets;
        this.expenses = expenses;
        this.withdrawals = withdrawals;
        this.cashCounts = cashCounts;
        this.closeSummaries = closeSummaries;
    }

    @Transactional(readOnly = true)
    public ShiftCloseSummaryResponse summary(Long shiftId) {
        if (closeSummaries.existsByShiftId(shiftId)) {
            ShiftCloseSummary existing = closeSummaries.findByShiftId(shiftId).get();
            BigDecimal cashRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CASH);
            BigDecimal cardRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CARD);
            return ShiftCloseSummaryResponse.closed(existing, cashRevenue, cardRevenue);
        }
        Shift shift = getShift(shiftId);
        CashCount latestCount = cashCounts.findByShiftIdOrderByCreatedAtDesc(shiftId).stream()
                .findFirst()
                .orElse(null);
        BigDecimal ticketRevenue = tickets.sumRevenueForShift(shiftId, TicketStatus.ACTIVE);
        BigDecimal cashRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CASH);
        BigDecimal cardRevenue = tickets.sumRevenueForShiftByPaymentMethod(shiftId, TicketStatus.ACTIVE, PaymentMethod.CARD);
        BigDecimal expensesTotal = expenses.sumForShift(shiftId);
        BigDecimal withdrawalsTotal = withdrawals.sumForShift(shiftId);
        // expected cash in drawer only counts cash payments, not card (card goes to processor)
        BigDecimal expectedCash = cashRevenue.subtract(expensesTotal).subtract(withdrawalsTotal);
        return ShiftCloseSummaryResponse.open(shift, ticketRevenue, cashRevenue, cardRevenue, expensesTotal,
                withdrawalsTotal, expectedCash, latestCount);
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
        BigDecimal expensesTotal = expenses.sumForShift(shiftId);
        BigDecimal withdrawalsTotal = withdrawals.sumForShift(shiftId);
        BigDecimal expectedCash = cashRevenue.subtract(expensesTotal).subtract(withdrawalsTotal);
        BigDecimal variance = cashCount.getTotalCounted().subtract(expectedCash);
        String closingReason = normalize(request.closingReason());
        if (variance.signum() < 0 && closingReason == null) {
            throw new IllegalArgumentException("closingReason is required when cash is short");
        }

        shift.close();
        shifts.save(shift);
        ShiftCloseSummary saved = closeSummaries.save(new ShiftCloseSummary(shift, cashCount, ticketRevenue,
                expensesTotal, withdrawalsTotal, expectedCash, cashCount.getTotalCounted(), variance, closingReason));
        return ShiftCloseSummaryResponse.closed(saved, cashRevenue, cardRevenue);
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
