package com.lavadero.api.operations.repository;

import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.operations.domain.TicketStatus;
import java.math.BigDecimal;
import java.util.Optional;
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

    @EntityGraph(attributePaths = {
            "businessDay",
            "shift",
            "serviceType",
            "vehicleSize",
            "assignments",
            "assignments.employee"
    })
    Optional<Ticket> findWithDetailsById(Long id);

    @Override
    @EntityGraph(attributePaths = {
            "businessDay",
            "shift",
            "serviceType",
            "vehicleSize",
            "assignments",
            "assignments.employee"
    })
    java.util.List<Ticket> findAll(Specification<Ticket> spec, Sort sort);
}
