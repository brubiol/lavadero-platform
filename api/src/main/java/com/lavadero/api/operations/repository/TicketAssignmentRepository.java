package com.lavadero.api.operations.repository;

import com.lavadero.api.operations.domain.TicketAssignment;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketAssignmentRepository extends JpaRepository<TicketAssignment, Long> {
    @EntityGraph(attributePaths = {"employee", "ticket", "ticket.businessDay"})
    @Query("""
            select ta
            from TicketAssignment ta
            where ta.ticket.businessDay.businessDate between :from and :to
              and ta.ticket.status = com.lavadero.api.operations.domain.TicketStatus.ACTIVE
            """)
    List<TicketAssignment> findActiveInDateRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
