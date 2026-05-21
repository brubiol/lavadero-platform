package com.lavadero.api.audit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId = 1L;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "actor_username", length = 120)
    private String actorUsername;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 80)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(length = 500)
    private String reason;

    @Column(length = 1000)
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditSeverity severity = AuditSeverity.INFO;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by", length = 120)
    private String reviewedBy;

    protected AuditEvent() {
    }

    public AuditEvent(String actorUsername, String action, String entityType, Long entityId, String reason,
            String details) {
        this(actorUsername, action, entityType, entityId, reason, details, AuditSeverity.INFO);
    }

    public AuditEvent(String actorUsername, String action, String entityType, Long entityId, String reason,
            String details, AuditSeverity severity) {
        this.actorUsername = actorUsername;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.reason = reason;
        this.details = details;
        this.severity = severity == null ? AuditSeverity.INFO : severity;
    }

    public void markReviewed(String reviewer) {
        this.reviewedAt = Instant.now();
        this.reviewedBy = reviewer;
    }

    public Long getId() {
        return id;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getActorUsername() {
        return actorUsername;
    }

    public String getAction() {
        return action;
    }

    public String getEntityType() {
        return entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public String getReason() {
        return reason;
    }

    public String getDetails() {
        return details;
    }

    public AuditSeverity getSeverity() {
        return severity;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public String getReviewedBy() {
        return reviewedBy;
    }
}
