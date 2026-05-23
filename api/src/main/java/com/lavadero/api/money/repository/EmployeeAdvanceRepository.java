package com.lavadero.api.money.repository;

import com.lavadero.api.money.domain.EmployeeAdvance;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeAdvanceRepository extends JpaRepository<EmployeeAdvance, Long> {
    List<EmployeeAdvance> findByAdvanceDateBetweenOrderByAdvanceDateDescCreatedAtDesc(LocalDate from, LocalDate to);

    List<EmployeeAdvance> findByEmployeeIdAndAdvanceDateBetweenOrderByAdvanceDateDescCreatedAtDesc(
            Long employeeId, LocalDate from, LocalDate to);

    List<EmployeeAdvance> findByAdvanceDateBetween(LocalDate from, LocalDate to);

    long countByEmployeeIdAndAdvanceDate(Long employeeId, LocalDate advanceDate);

    @Query("select coalesce(sum(a.amount), 0) from EmployeeAdvance a where a.advanceDate = :date")
    BigDecimal sumForDate(@Param("date") LocalDate date);

    @Query("select coalesce(sum(a.amount), 0) from EmployeeAdvance a where a.shift.id = :shiftId")
    BigDecimal sumForShift(@Param("shiftId") Long shiftId);
}
