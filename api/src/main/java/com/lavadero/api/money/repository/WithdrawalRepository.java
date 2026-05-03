package com.lavadero.api.money.repository;

import com.lavadero.api.money.domain.Withdrawal;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WithdrawalRepository extends JpaRepository<Withdrawal, Long> {
    List<Withdrawal> findByWithdrawalDateBetweenOrderByWithdrawalDateDescCreatedAtDesc(LocalDate from, LocalDate to);

    @Query("select coalesce(sum(w.amount), 0) from Withdrawal w where w.withdrawalDate = :date")
    BigDecimal sumForDate(@Param("date") LocalDate date);
}
