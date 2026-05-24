package com.lavadero.api.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.lavadero.api.ai.tools.AiTool;
import java.util.List;

public interface AiProvider {
    String complete(AiRequest request);

    String name();

    /**
     * Tool-aware completion. The provider sends the model a list of callable
     * tools and runs the request → tool-call → tool-result loop until the
     * model emits a final text answer (or until {@code maxIterations} is hit).
     *
     * Implementations that don't support tool calling (e.g. the deterministic
     * fallback) should delegate to {@link #complete(AiRequest)} and return a
     * result with an empty trace.
     */
    default ToolAwareCompletion completeWithTools(AiRequest request, List<AiTool> tools, int maxIterations) {
        return new ToolAwareCompletion(complete(request), List.of());
    }

    /** Aggregate result of a tool-aware call: final text + audit trail of tool calls. */
    record ToolAwareCompletion(String text, List<ToolCallTrace> trace) {
    }

    /** One step of the tool-call audit trail — what the model called and what came back. */
    record ToolCallTrace(String name, JsonNode arguments, JsonNode result) {
    }
}
