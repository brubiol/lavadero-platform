package com.lavadero.api.cash.repository;

import com.lavadero.api.cash.domain.ShiftCloseSummary;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftCloseSummaryRepository extends JpaRepository<ShiftCloseSummary, Long> {
    @EntityGraph(attributePaths = {"shift", "shift.businessDay", "cashCount"})
    Optional<ShiftCloseSummary> findByShiftId(Long shiftId);

    boolean existsByShiftId(Long shiftId);

    @EntityGraph(attributePaths = {"shift", "shift.businessDay", "cashCount"})
    List<ShiftCloseSummary> findByShiftBusinessDayBusinessDate(LocalDate businessDate);
}
