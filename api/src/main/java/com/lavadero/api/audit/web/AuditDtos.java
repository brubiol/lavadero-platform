package com.lavadero.api.audit.web;

import com.lavadero.api.audit.domain.AuditEvent;
import java.time.Instant;

public final class AuditDtos {
    private AuditDtos() {
    }

    public record AuditEventResponse(Long id, Instant occurredAt, String actorUsername, String action,
            String entityType, Long entityId, String reason, String details) {
        public static AuditEventResponse from(AuditEvent event) {
            return new AuditEventResponse(event.getId(), event.getOccurredAt(), event.getActorUsername(),
                    event.getAction(), event.getEntityType(), event.getEntityId(), event.getReason(),
                    event.getDetails());
        }
    }
}
