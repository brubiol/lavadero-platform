package com.lavadero.api.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.ai.tools.AiTool;
import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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

    @PostConstruct
    void logResolvedConfig() {
        String model = properties.getModel();
        boolean httpProvider = isHttpProvider();
        boolean hasKey = properties.getApiKey() != null && !properties.getApiKey().isBlank();
        log.info("AI provider resolved: enabled={}, provider={}, model={}, hasApiKey={}",
                properties.isEnabled(), properties.getProvider(), model, hasKey);
        if (properties.isEnabled() && httpProvider && !hasKey) {
            log.warn("AI is enabled with provider={} but LAVADERO_AI_API_KEY is blank — every call will fall back to the deterministic-local provider.",
                    properties.getProvider());
        }
        if (httpProvider && model != null && model.toLowerCase().contains("mini")) {
            log.warn("AI model is a *-mini variant ({}) — owner-facing analysis quality will degrade. Set LAVADERO_AI_MODEL to a full-size model.", model);
        }
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

    /**
     * Tool-aware chat. The model decides which tools to call; we execute them
     * and feed the results back until the model emits a final text answer (or
     * we hit {@code maxIterations}). Falls back to the deterministic provider
     * on any upstream failure with the same logging + status semantics as
     * {@link #complete(AiRequest)}.
     */
    @Override
    public ToolAwareCompletion completeWithTools(AiRequest request, List<AiTool> tools, int maxIterations) {
        if (!properties.isEnabled() || !isHttpProvider()
                || properties.getApiKey() == null || properties.getApiKey().isBlank()
                || tools == null || tools.isEmpty()) {
            // Delegate to complete() so the disabled / misconfigured / no-key branches all log
            // and record degraded status through the same code path — no duplication.
            return new ToolAwareCompletion(complete(request), List.of());
        }

        Map<String, AiTool> byName = new LinkedHashMap<>();
        for (AiTool t : tools) byName.put(t.name(), t);

        ArrayNode messages = objectMapper.createArrayNode();
        messages.add(objectMapper.createObjectNode().put("role", "system").put("content", request.systemPrompt()));
        messages.add(objectMapper.createObjectNode().put("role", "user").put("content", request.userPrompt()));

        List<ToolCallTrace> trace = new ArrayList<>();

        try {
            for (int iter = 0; iter < Math.max(1, maxIterations); iter++) {
                ObjectNode body = objectMapper.createObjectNode()
                        .put("model", properties.getModel())
                        .put("temperature", 0.2);
                body.set("messages", messages);
                body.set("tools", buildToolsArray(tools));
                body.put("tool_choice", "auto");

                HttpResponse<String> response = postJson(body);
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    String snippet = truncate(response.body(), 400);
                    log.warn("AI tool-call HTTP {} (model={}, iter={}): {}",
                            response.statusCode(), properties.getModel(), iter, snippet);
                    recordDegraded("http-" + response.statusCode(), snippet);
                    return new ToolAwareCompletion(fallback.complete(request), trace);
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode message = root.path("choices").path(0).path("message");
                JsonNode toolCalls = message.path("tool_calls");

                if (toolCalls.isArray() && toolCalls.size() > 0) {
                    // Append the assistant turn verbatim (incl. tool_calls) — required so the
                    // follow-up tool-result messages link back to it via tool_call_id.
                    messages.add(message);
                    for (JsonNode call : toolCalls) {
                        String callId = call.path("id").asText();
                        String fnName = call.path("function").path("name").asText();
                        String argsRaw = call.path("function").path("arguments").asText("{}");
                        JsonNode argsJson;
                        try {
                            argsJson = objectMapper.readTree(argsRaw);
                        } catch (Exception parseEx) {
                            argsJson = objectMapper.createObjectNode().put("error", "Invalid JSON args: " + argsRaw);
                        }
                        AiTool tool = byName.get(fnName);
                        JsonNode result = tool == null
                                ? objectMapper.createObjectNode().put("error", "Unknown tool: " + fnName)
                                : safeExecute(tool, argsJson);
                        trace.add(new ToolCallTrace(fnName, argsJson, result));
                        messages.add(objectMapper.createObjectNode()
                                .put("role", "tool")
                                .put("tool_call_id", callId)
                                .put("name", fnName)
                                .put("content", result.toString()));
                    }
                    // Loop and let the model react to the tool results.
                    continue;
                }

                String content = message.path("content").asText("");
                if (content.isBlank()) {
                    log.warn("AI tool-call returned empty content after {} iterations (model={})",
                            iter, properties.getModel());
                    recordDegraded("empty-response", "Model returned no content after tool calls");
                    return new ToolAwareCompletion(fallback.complete(request), trace);
                }
                recordHealthy();
                return new ToolAwareCompletion(content, trace);
            }
            log.warn("AI tool-call hit maxIterations={} without final text (model={})",
                    maxIterations, properties.getModel());
            recordDegraded("max-iterations", "Tool loop exceeded maxIterations=" + maxIterations);
            return new ToolAwareCompletion(fallback.complete(request), trace);
        } catch (Exception ex) {
            log.warn("AI tool-call failed (model={}): {} {}",
                    properties.getModel(), ex.getClass().getSimpleName(), ex.getMessage());
            recordDegraded(ex.getClass().getSimpleName(), ex.getMessage() == null ? "(no message)" : ex.getMessage());
            return new ToolAwareCompletion(fallback.complete(request), trace);
        }
    }

    private ArrayNode buildToolsArray(List<AiTool> tools) {
        ArrayNode arr = objectMapper.createArrayNode();
        for (AiTool t : tools) {
            ObjectNode fn = objectMapper.createObjectNode()
                    .put("name", t.name())
                    .put("description", t.description());
            fn.set("parameters", t.parametersSchema());
            ObjectNode wrapper = objectMapper.createObjectNode().put("type", "function");
            wrapper.set("function", fn);
            arr.add(wrapper);
        }
        return arr;
    }

    /** Tool execution is best-effort: any exception becomes a JSON error so the model can react instead of the loop dying. */
    private JsonNode safeExecute(AiTool tool, JsonNode args) {
        try {
            JsonNode out = tool.execute(args);
            return out == null ? objectMapper.createObjectNode().put("error", "Tool returned null") : out;
        } catch (Exception ex) {
            log.warn("AI tool '{}' threw {}: {}", tool.name(), ex.getClass().getSimpleName(), ex.getMessage());
            return objectMapper.createObjectNode()
                    .put("error", ex.getClass().getSimpleName() + ": " + ex.getMessage());
        }
    }

    private HttpResponse<String> postJson(ObjectNode body) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(endpoint())
                .timeout(Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds())))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + properties.getApiKey())
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds())))
                .build()
                .send(builder.build(), HttpResponse.BodyHandlers.ofString());
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
