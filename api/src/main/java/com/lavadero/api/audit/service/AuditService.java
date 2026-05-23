package com.lavadero.api.audit.service;

import com.lavadero.api.audit.domain.AuditEvent;
import com.lavadero.api.audit.domain.AuditSeverity;
import com.lavadero.api.audit.repository.AuditEventRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
    private final AuditEventRepository events;

    public AuditService(AuditEventRepository events) {
        this.events = events;
    }

    @Transactional
    public void record(String action, String entityType, Long entityId, String reason, String details) {
        events.save(new AuditEvent(currentActor(), action, entityType, entityId, normalize(reason), normalize(details)));
    }

    // Records an irregular change for the owner to review and acknowledge.
    @Transactional
    public void recordFlagged(String action, String entityType, Long entityId, String reason, String details) {
        events.save(new AuditEvent(currentActor(), action, entityType, entityId, normalize(reason),
                normalize(details), AuditSeverity.FLAGGED));
    }

    @Transactional(readOnly = true)
    public List<AuditEvent> pendingFlagged() {
        return events.findBySeverityAndReviewedAtIsNullOrderByOccurredAtDesc(AuditSeverity.FLAGGED);
    }

    @Transactional
    public AuditEvent markReviewed(Long id) {
        AuditEvent event = events.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Audit event not found"));
        event.markReviewed(currentActor());
        return events.save(event);
    }

    @Transactional(readOnly = true)
    public List<AuditEvent> search(LocalDate from, LocalDate to, String entityType, Long entityId) {
        Instant start = from == null ? Instant.EPOCH : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to == null
                ? Instant.parse("9999-12-31T23:59:59Z")
                : to.plusDays(1).atStartOfDay().minusNanos(1).toInstant(ZoneOffset.UTC);
        return events.search(start, end, normalize(entityType), entityId);
    }

    /** Counts how many times the current actor has triggered `action` today (America/Monterrey day). */
    @Transactional(readOnly = true)
    public long countActorActionToday(String action) {
        ZoneId zone = ZoneId.of("America/Monterrey");
        Instant start = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        Instant end = Instant.now();
        return events.countByActorUsernameAndActionAndOccurredAtBetween(currentActor(), action, start, end);
    }

    private String currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return "system";
        }
        return authentication.getName();
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
