package com.lavadero.api.audit.service;

import com.lavadero.api.audit.domain.AuditEvent;
import com.lavadero.api.audit.repository.AuditEventRepository;
import java.time.Instant;
import java.time.LocalDate;
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

    @Transactional(readOnly = true)
    public List<AuditEvent> search(LocalDate from, LocalDate to, String entityType, Long entityId) {
        Instant start = from == null ? Instant.EPOCH : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to == null
                ? Instant.parse("9999-12-31T23:59:59Z")
                : to.plusDays(1).atStartOfDay().minusNanos(1).toInstant(ZoneOffset.UTC);
        return events.search(start, end, normalize(entityType), entityId);
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
