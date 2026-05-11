package com.lavadero.api.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Primary
@Component
public class ConfiguredAiProvider implements AiProvider {
    private final AiProperties properties;
    private final DeterministicAiProvider fallback;
    private final ObjectMapper objectMapper;

    public ConfiguredAiProvider(AiProperties properties, DeterministicAiProvider fallback, ObjectMapper objectMapper) {
        this.properties = properties;
        this.fallback = fallback;
        this.objectMapper = objectMapper;
    }

    @Override
    public String complete(AiRequest request) {
        if (!properties.isEnabled() || !isHttpProvider()) {
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
                    .POST(HttpRequest.BodyPublishers.ofString(body));
            if (properties.getApiKey() != null && !properties.getApiKey().isBlank()) {
                builder.header("Authorization", "Bearer " + properties.getApiKey());
            }
            HttpResponse<String> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds())))
                    .build()
                    .send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return fallback.complete(request);
            }
            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText("");
            return content.isBlank() ? fallback.complete(request) : content;
        } catch (Exception ex) {
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
}
