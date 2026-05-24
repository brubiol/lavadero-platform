package com.lavadero.api.ai.service;

import com.lavadero.api.ai.provider.AiProvider;
import com.lavadero.api.ai.provider.AiRequest;
import com.lavadero.api.ai.tools.AiTool;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

/**
 * Test-only AiProvider that hands back canned responses in FIFO order. Lets a
 * plain JUnit test exercise the tool-loop branches in AiInsightService without
 * Spring, HTTP, or a real model. One queue per method so unit tests can mix
 * tool-aware and plain completions in the same scenario.
 */
final class StubAiProvider implements AiProvider {
    private final Deque<String> completes = new ArrayDeque<>();
    private final Deque<ToolAwareCompletion> toolCompletes = new ArrayDeque<>();

    StubAiProvider enqueueComplete(String text) {
        completes.add(text);
        return this;
    }

    StubAiProvider enqueueToolCompletion(String text, List<ToolCallTrace> trace) {
        toolCompletes.add(new ToolAwareCompletion(text, trace));
        return this;
    }

    @Override
    public String complete(AiRequest request) {
        if (completes.isEmpty()) {
            throw new IllegalStateException("StubAiProvider.complete called but queue is empty");
        }
        return completes.removeFirst();
    }

    @Override
    public ToolAwareCompletion completeWithTools(AiRequest request, List<AiTool> tools, int maxIterations) {
        if (toolCompletes.isEmpty()) {
            throw new IllegalStateException("StubAiProvider.completeWithTools called but queue is empty");
        }
        return toolCompletes.removeFirst();
    }

    @Override
    public String name() {
        return "stub";
    }
}
