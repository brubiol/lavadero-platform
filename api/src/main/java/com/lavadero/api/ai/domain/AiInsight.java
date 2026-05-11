package com.lavadero.api.ai.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "ai_insights")
public class AiInsight extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "feature_type", nullable = false, length = 40)
    private AiFeatureType featureType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiInsightSeverity severity;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "details_json", nullable = false, columnDefinition = "TEXT")
    private String detailsJson;

    @Column(name = "source_from", nullable = false)
    private LocalDate sourceFrom;

    @Column(name = "source_to", nullable = false)
    private LocalDate sourceTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiInsightStatus status = AiInsightStatus.NEW;

    @Column(name = "generated_by", nullable = false, length = 80)
    private String generatedBy;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    protected AiInsight() {
    }

    public AiInsight(AiFeatureType featureType, AiInsightSeverity severity, String title, String summary,
            String detailsJson, LocalDate sourceFrom, LocalDate sourceTo, String generatedBy) {
        this.featureType = featureType;
        this.severity = severity;
        this.title = title;
        this.summary = summary;
        this.detailsJson = detailsJson;
        this.sourceFrom = sourceFrom;
        this.sourceTo = sourceTo;
        this.generatedBy = generatedBy;
        this.generatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public AiFeatureType getFeatureType() {
        return featureType;
    }

    public AiInsightSeverity getSeverity() {
        return severity;
    }

    public String getTitle() {
        return title;
    }

    public String getSummary() {
        return summary;
    }

    public String getDetailsJson() {
        return detailsJson;
    }

    public LocalDate getSourceFrom() {
        return sourceFrom;
    }

    public LocalDate getSourceTo() {
        return sourceTo;
    }

    public AiInsightStatus getStatus() {
        return status;
    }

    public String getGeneratedBy() {
        return generatedBy;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void acknowledge() {
        this.status = AiInsightStatus.ACKNOWLEDGED;
    }

    public void dismiss() {
        this.status = AiInsightStatus.DISMISSED;
    }
}
