package com.lavadero.api.operations.repository;

import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.PrepaidPackage;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrepaidPackageRepository extends JpaRepository<PrepaidPackage, Long> {
    @Query("SELECT p FROM PrepaidPackage p WHERE p.businessDay.id = :businessDayId ORDER BY p.occurredAt ASC")
    List<PrepaidPackage> findByBusinessDayId(@Param("businessDayId") Long businessDayId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PrepaidPackage p WHERE p.shift.id = :shiftId")
    BigDecimal sumAmountForShift(@Param("shiftId") Long shiftId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PrepaidPackage p WHERE p.businessDay.businessDate = :date")
    BigDecimal sumForDate(@Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PrepaidPackage p WHERE p.shift.id = :shiftId AND p.paymentMethod = :paymentMethod")
    BigDecimal sumAmountForShiftByPaymentMethod(@Param("shiftId") Long shiftId, @Param("paymentMethod") PaymentMethod paymentMethod);
}
