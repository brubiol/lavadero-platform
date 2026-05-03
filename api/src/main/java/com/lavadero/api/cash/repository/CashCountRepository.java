package com.lavadero.api.cash.repository;

import com.lavadero.api.cash.domain.CashCount;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashCountRepository extends JpaRepository<CashCount, Long> {
    List<CashCount> findByShiftIdOrderByCreatedAtDesc(Long shiftId);
}
