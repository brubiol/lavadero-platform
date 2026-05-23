package com.lavadero.api.audit.repository;

import com.lavadero.api.audit.domain.AuditEvent;
import com.lavadero.api.audit.domain.AuditSeverity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    List<AuditEvent> findBySeverityAndReviewedAtIsNullOrderByOccurredAtDesc(AuditSeverity severity);

    @Query("""
            select e from AuditEvent e
            where e.occurredAt >= :from
              and e.occurredAt <= :to
              and (:entityType is null or e.entityType = :entityType)
              and (:entityId is null or e.entityId = :entityId)
            order by e.occurredAt desc
            """)
    List<AuditEvent> search(@Param("from") Instant from, @Param("to") Instant to,
            @Param("entityType") String entityType, @Param("entityId") Long entityId);

    List<AuditEvent> findByOccurredAtBetweenOrderByOccurredAtAsc(Instant from, Instant to);
}
