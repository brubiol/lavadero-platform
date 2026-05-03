package com.lavadero.api.money.service;

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

    public WithdrawalService(WithdrawalRepository withdrawals, BusinessContextResolver contextResolver) {
        this.withdrawals = withdrawals;
        this.contextResolver = contextResolver;
    }

    @Transactional
    public Withdrawal create(CreateWithdrawalRequest request) {
        Context context = contextResolver.resolve(request.businessDayId(), request.shiftId(), request.withdrawalDate());
        Withdrawal withdrawal = new Withdrawal(context.businessDay(), context.shift(), context.recordDate(),
                request.amount(), request.reason());
        return withdrawals.save(withdrawal);
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
