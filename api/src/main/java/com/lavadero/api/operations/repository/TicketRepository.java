package com.lavadero.api.operations.repository;

import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.domain.TicketCurrency;
import com.lavadero.api.operations.domain.TicketStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    @Query("select coalesce(max(t.dailySeq), 0) from Ticket t where t.businessDay.id = :businessDayId")
    int maxDailySeq(@Param("businessDayId") Long businessDayId);

    @Query("""
            select coalesce(sum(t.priceAmount), 0)
            from Ticket t
            where t.shift.id = :shiftId
              and t.status = :status
              and t.courtesy = false
            """)
    BigDecimal sumRevenueForShift(@Param("shiftId") Long shiftId, @Param("status") TicketStatus status);

    @Query("""
            select coalesce(sum(t.priceAmount), 0)
            from Ticket t
            where t.shift.id = :shiftId
              and t.status = :status
              and t.courtesy = false
              and t.paymentMethod = :paymentMethod
            """)
    BigDecimal sumRevenueForShiftByPaymentMethod(@Param("shiftId") Long shiftId, @Param("status") TicketStatus status,
            @Param("paymentMethod") PaymentMethod paymentMethod);

    @EntityGraph(attributePaths = {
            "businessDay",
            "shift",
            "serviceType",
            "vehicleSize",
            "assignments",
            "assignments.employee",
            "customer"
    })
    Optional<Ticket> findWithDetailsById(Long id);

    @Override
    @EntityGraph(attributePaths = {
            "businessDay",
            "shift",
            "serviceType",
            "vehicleSize",
            "assignments",
            "assignments.employee",
            "customer"
    })
    List<Ticket> findAll(Specification<Ticket> spec, Sort sort);

    // Loyalty visit count: every PAID active ticket plus any active courtesy
    // whose reason starts with "Lealtad:" (so the 10th redemption wash
    // advances the punch card while generic cortesías don't pollute it).
    @Query("""
            SELECT COUNT(t) FROM Ticket t
            WHERE t.customer.id = :customerId
              AND t.status = :status
              AND (t.courtesy = false OR t.courtesyReason LIKE 'Lealtad:%')
            """)
    long countByCustomerForLoyalty(@Param("customerId") Long customerId, @Param("status") TicketStatus status);

    @Query("""
            SELECT COALESCE(SUM(t.priceAmount), 0) FROM Ticket t
            WHERE t.customer.id = :customerId
              AND t.status = :status
              AND t.courtesy = false
              AND t.currency = :currency
            """)
    BigDecimal sumSpendByCustomer(@Param("customerId") Long customerId, @Param("status") TicketStatus status,
            @Param("currency") TicketCurrency currency);

    @Query("""
            SELECT t.businessDay.businessDate FROM Ticket t
            WHERE t.customer.id = :customerId
              AND t.status = :status
            ORDER BY t.createdAt DESC
            """)
    List<LocalDate> findLastVisitDatesByCustomer(@Param("customerId") Long customerId,
            @Param("status") TicketStatus status, Pageable pageable);
}
