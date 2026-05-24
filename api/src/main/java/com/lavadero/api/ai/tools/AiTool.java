package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * A function the LLM can call. Each implementation wraps one read-only
 * domain service method and exposes it with an OpenAI-compatible JSON-schema
 * for the function-calling API.
 *
 * Tools are register-by-presence: any @Component implementing this interface
 * gets picked up by {@link AiToolRegistry} and made available to the chat
 * model.
 *
 * Invariant: tools are read-only. They never write to financial tables —
 * that's the AI firewall by construction. The DI graph enforces it because
 * each tool only takes read-only repository/service dependencies.
 */
public interface AiTool {
    /** Unique snake_case identifier matching the OpenAI tool spec. */
    String name();

    /**
     * Human-prose description of what this tool does and when to use it.
     * The model uses this to decide whether to call it.
     */
    String description();

    /**
     * JSON-schema object describing the tool's parameters. Returned as a
     * Jackson {@link JsonNode} so it can be embedded directly into the
     * OpenAI request body.
     */
    JsonNode parametersSchema();

    /**
     * Execute the tool with the model-supplied arguments and return the
     * result as a JSON node (will be serialized as the "tool" message
     * content sent back to the model).
     *
     * Implementations should be defensive: missing/invalid args return a
     * JSON object with an {@code error} field rather than throwing.
     */
    JsonNode execute(JsonNode arguments);
}
