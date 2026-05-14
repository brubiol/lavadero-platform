package com.lavadero.api.money.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.money.domain.Withdrawal;
import com.lavadero.api.money.repository.WithdrawalRepository;
import com.lavadero.api.money.service.BusinessContextResolver.Context;
import com.lavadero.api.money.web.WithdrawalDtos.CreateWithdrawalRequest;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WithdrawalService {
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
        audit.record("WITHDRAWAL_CREATED", "WITHDRAWAL", saved.getId(), saved.getReason(),
                saved.getAmount().toString());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Withdrawal> list(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return withdrawals.findByWithdrawalDateBetweenOrderByWithdrawalDateDescCreatedAtDesc(from, to);
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
