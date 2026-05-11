package com.lavadero.api.ai.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.lavadero.api.ai.domain.AiFeatureType;
import com.lavadero.api.ai.domain.AiInsight;
import com.lavadero.api.ai.domain.AiInsightSeverity;
import com.lavadero.api.ai.domain.AiInsightStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AiDtos {
    private AiDtos() {
    }

    public record AiInsightResponse(Long id, AiFeatureType featureType, AiInsightSeverity severity,
            String title, String summary, JsonNode details, LocalDate sourceFrom, LocalDate sourceTo,
            AiInsightStatus status, String generatedBy, Instant generatedAt, Instant createdAt, Instant updatedAt) {
        public static AiInsightResponse from(AiInsight insight, JsonNode details) {
            return new AiInsightResponse(insight.getId(), insight.getFeatureType(), insight.getSeverity(),
                    insight.getTitle(), insight.getSummary(), details, insight.getSourceFrom(), insight.getSourceTo(),
                    insight.getStatus(), insight.getGeneratedBy(), insight.getGeneratedAt(), insight.getCreatedAt(),
                    insight.getUpdatedAt());
        }
    }

    public record AnalystChatRequest(
            @NotBlank @Size(max = 500) String message,
            @NotNull LocalDate from,
            @NotNull LocalDate to) {
    }

    public record AnalystChatResponse(String answer, List<String> supportingNumbers,
            LocalDate sourceFrom, LocalDate sourceTo, List<String> suggestedFollowUps, AiInsightResponse insight) {
    }

    public record InvestigationRequest(
            @NotBlank @Size(max = 500) String question,
            @NotNull LocalDate from,
            @NotNull LocalDate to) {
    }

    public record InvestigationResponse(String conclusion, List<String> evidence, List<String> steps,
            String confidence, LocalDate sourceFrom, LocalDate sourceTo, AiInsightResponse insight) {
    }
}
