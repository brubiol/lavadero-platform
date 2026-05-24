package com.lavadero.api.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * HTTP-backed AI provider (OpenAI-compatible). Falls back to the deterministic
 * local provider on any failure — but unlike the previous version, every
 * fallback path now logs the cause and records a snapshot of the last failure
 * so {@link #status()} can surface "AI degraded" to the UI / ops.
 */
@Primary
@Component
public class ConfiguredAiProvider implements AiProvider {
    private static final Logger log = LoggerFactory.getLogger(ConfiguredAiProvider.class);

    private final AiProperties properties;
    private final DeterministicAiProvider fallback;
    private final ObjectMapper objectMapper;

    /** Snapshot of the most recent provider state; updated atomically per call. */
    private final AtomicReference<ProviderStatus> lastStatus = new AtomicReference<>(ProviderStatus.unknown());

    public ConfiguredAiProvider(AiProperties properties, DeterministicAiProvider fallback, ObjectMapper objectMapper) {
        this.properties = properties;
        this.fallback = fallback;
        this.objectMapper = objectMapper;
    }

    @Override
    public String complete(AiRequest request) {
        if (!properties.isEnabled()) {
            recordDegraded("disabled", "lavadero.ai.enabled=false");
            return fallback.complete(request);
        }
        if (!isHttpProvider()) {
            recordDegraded("misconfigured", "Unsupported provider: " + properties.getProvider());
            return fallback.complete(request);
        }
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            recordDegraded("no-api-key", "LAVADERO_AI_API_KEY is not set");
            return fallback.complete(request);
        }

        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "model", properties.getModel(),
                    "temperature", 0.2,
                    "messages", List.of(
                            Map.of("role", "system", "content", request.systemPrompt()),
                            Map.of("role", "user", "content", request.userPrompt()))));
            HttpRequest.Builder builder = HttpRequest.newBuilder(endpoint())
                    .timeout(Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds())))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body));
            HttpResponse<String> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds())))
                    .build()
                    .send(builder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String snippet = truncate(response.body(), 400);
                log.warn("AI provider HTTP {} from {} (model={}, feature={}): {}",
                        response.statusCode(), properties.getProvider(), properties.getModel(),
                        request.featureType(), snippet);
                recordDegraded("http-" + response.statusCode(), snippet);
                return fallback.complete(request);
            }

            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            if (content.isBlank()) {
                log.warn("AI provider returned empty content (model={}, feature={}, body={})",
                        properties.getModel(), request.featureType(), truncate(response.body(), 200));
                recordDegraded("empty-response", "Provider returned no message content");
                return fallback.complete(request);
            }

            recordHealthy();
            return content;
        } catch (Exception ex) {
            log.warn("AI provider call failed (model={}, feature={}): {} {}",
                    properties.getModel(), request.featureType(), ex.getClass().getSimpleName(), ex.getMessage());
            recordDegraded(ex.getClass().getSimpleName(), ex.getMessage() == null ? "(no message)" : ex.getMessage());
            return fallback.complete(request);
        }
    }

    @Override
    public String name() {
        if (!properties.isEnabled() || !isHttpProvider()) {
            return fallback.name();
        }
        return properties.getProvider() + ":" + properties.getModel();
    }

    /** Read-only snapshot for the /status endpoint. */
    public ProviderStatus status() {
        return lastStatus.get();
    }

    private void recordHealthy() {
        lastStatus.set(new ProviderStatus(
                false,
                properties.getProvider() + ":" + properties.getModel(),
                Instant.now(),
                null, null, null));
    }

    private void recordDegraded(String reasonCode, String detail) {
        ProviderStatus prev = lastStatus.get();
        Instant lastHealthy = prev != null && !prev.degraded() ? prev.lastCheckAt() : (prev != null ? prev.lastHealthyAt() : null);
        lastStatus.set(new ProviderStatus(
                true,
                properties.getProvider() + ":" + properties.getModel(),
                Instant.now(),
                lastHealthy,
                reasonCode,
                truncate(detail, 500)));
    }

    private boolean isHttpProvider() {
        String provider = properties.getProvider() == null ? "" : properties.getProvider().trim();
        return provider.equalsIgnoreCase("openai-compatible") || provider.equalsIgnoreCase("http");
    }

    private URI endpoint() {
        String base = properties.getBaseUrl() == null ? "" : properties.getBaseUrl().trim();
        if (base.isBlank()) {
            throw new IllegalStateException("lavadero.ai.base-url is required for HTTP AI provider");
        }
        String normalized = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        if (normalized.endsWith("/chat/completions")) {
            return URI.create(normalized);
        }
        return URI.create(normalized + "/chat/completions");
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        String trimmed = s.replaceAll("\\s+", " ").trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max) + "…";
    }

    /**
     * Snapshot of the provider's most recent outcome.
     * Used by the /api/v1/ai/status endpoint and the UI's degraded banner.
     */
    public record ProviderStatus(
            boolean degraded,
            String providerLabel,
            Instant lastCheckAt,
            Instant lastHealthyAt,
            String reasonCode,
            String detail) {
        static ProviderStatus unknown() {
            return new ProviderStatus(false, "unknown", null, null, null, null);
        }
    }
}
