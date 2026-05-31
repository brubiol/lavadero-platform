package com.lavadero.api.money.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.money.domain.Withdrawal;
import com.lavadero.api.money.repository.WithdrawalRepository;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.money.web.WithdrawalDtos.CreateWithdrawalRequest;
import com.lavadero.api.money.web.WithdrawalDtos.UpdateWithdrawalRequest;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WithdrawalService {
    /** Withdrawals above this amount auto-flag for owner review. */
    private static final BigDecimal LARGE_WITHDRAWAL_THRESHOLD = new BigDecimal("2000.00");
    /** If an actor records this many withdrawals in a day, the next one is flagged. */
    private static final int DAILY_WITHDRAWAL_CAP = 3;

    private final WithdrawalRepository withdrawals;
    private final BusinessContextResolver contextResolver;
    private final AuditService audit;

    public WithdrawalService(WithdrawalRepository withdrawals, BusinessContextResolver contextResolver, AuditService audit) {
        this.withdrawals = withdrawals;
        this.contextResolver = contextResolver;
        this.audit = audit;
    }

    @Transactional
    public Withdrawal create(CreateWithdrawalRequest request) {
        Context context = contextResolver.resolve(request.businessDayId(), request.shiftId(), request.withdrawalDate());
        Withdrawal withdrawal = new Withdrawal(context.businessDay(), context.shift(), context.recordDate(),
                request.amount(), request.reason());
        Withdrawal saved = withdrawals.save(withdrawal);

        // Flag heuristics for owner review (still allowed, just surfaced)
        boolean largeAmount = request.amount() != null
                && request.amount().compareTo(LARGE_WITHDRAWAL_THRESHOLD) >= 0;
        long countToday = audit.countActorActionToday("WITHDRAWAL_CREATED");
        boolean overCap = countToday >= DAILY_WITHDRAWAL_CAP;
        if (largeAmount || overCap) {
            String why = largeAmount
                    ? "Monto alto: $" + saved.getAmount() + (overCap ? " · " : "")
                    : "";
            why += overCap ? "Excede el límite diario de retiros (" + DAILY_WITHDRAWAL_CAP + ")" : "";
            audit.recordFlagged("WITHDRAWAL_CREATED", "WITHDRAWAL", saved.getId(),
                    why, saved.getAmount().toString()
                            + (saved.getReason() == null ? "" : " · " + saved.getReason()));
        } else {
            audit.record("WITHDRAWAL_CREATED", "WITHDRAWAL", saved.getId(), saved.getReason(),
                    saved.getAmount().toString());
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Withdrawal> list(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return withdrawals.findByWithdrawalDateBetweenOrderByWithdrawalDateDescCreatedAtDesc(from, to);
    }

    @Transactional
    public Withdrawal update(Long id, UpdateWithdrawalRequest request) {
        Withdrawal withdrawal = withdrawals.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Withdrawal not found"));
        withdrawal.update(request.withdrawalDate(), request.amount(), request.reason());
        audit.record("WITHDRAWAL_EDITED", "WITHDRAWAL", withdrawal.getId(), withdrawal.getReason(),
                withdrawal.getAmount().toString());
        return withdrawal;
    }

    @Transactional
    public void delete(Long id) {
        Withdrawal withdrawal = withdrawals.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Withdrawal not found"));
        withdrawal.softDelete();
        audit.record("WITHDRAWAL_DELETED", "WITHDRAWAL", withdrawal.getId(), withdrawal.getReason(),
                withdrawal.getAmount().toString());
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be on or after from");
        }
    }
}
