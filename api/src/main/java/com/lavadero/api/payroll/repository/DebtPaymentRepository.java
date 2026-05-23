package com.lavadero.api.payroll.repository;

import com.lavadero.api.payroll.domain.DebtPayment;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DebtPaymentRepository extends JpaRepository<DebtPayment, Long> {
    List<DebtPayment> findByPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(LocalDate from, LocalDate to);

    List<DebtPayment> findByEmployeeIdAndPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(
            Long employeeId, LocalDate from, LocalDate to);

    @Query("select coalesce(sum(p.amount), 0) from DebtPayment p where p.shift.id = :shiftId")
    BigDecimal sumForShift(@Param("shiftId") Long shiftId);

    @Query("select coalesce(sum(p.amount), 0) from DebtPayment p where p.paymentDate = :date")
    BigDecimal sumForDate(@Param("date") LocalDate date);
}
