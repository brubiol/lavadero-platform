package com.lavadero.api.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.ai.provider.AiProvider.ToolAwareCompletion;
import com.lavadero.api.ai.provider.AiProvider.ToolCallTrace;
import com.lavadero.api.ai.provider.AiRequest;
import com.lavadero.api.ai.tools.AiTool;
import com.lavadero.api.ai.tools.AiToolRegistry;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Plain JUnit harness for AiInsightService's tool-loop branches. Subsequent PRs
 * add per-method assertions; this PR only proves the harness works (stub
 * provider pops in order, registry subset() curates correctly) so later PRs
 * can build on it without re-discovering wiring quirks.
 */
class AiInsightServiceUnitTest {
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void stub_provider_pops_complete_responses_in_order() {
        StubAiProvider stub = new StubAiProvider()
                .enqueueComplete("first")
                .enqueueComplete("second");

        AiRequest req = new AiRequest(null, "sys", "user");
        assertThat(stub.complete(req)).isEqualTo("first");
        assertThat(stub.complete(req)).isEqualTo("second");
        assertThatThrownBy(() -> stub.complete(req)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void stub_provider_pops_tool_completions_with_trace() {
        ToolCallTrace one = new ToolCallTrace("get_daily_summary",
                objectMapper.createObjectNode().put("date", "2026-05-24"),
                objectMapper.createObjectNode().put("cars", 42));
        StubAiProvider stub = new StubAiProvider()
                .enqueueToolCompletion("done", List.of(one));

        ToolAwareCompletion got = stub.completeWithTools(
                new AiRequest(null, "sys", "user"), List.of(), 5);

        assertThat(got.text()).isEqualTo("done");
        assertThat(got.trace()).hasSize(1);
        assertThat(got.trace().get(0).name()).isEqualTo("get_daily_summary");
    }

    @Test
    void registry_subset_returns_tools_in_requested_order() {
        AiTool a = stubTool("get_daily_summary");
        AiTool b = stubTool("get_cash_variance");
        AiTool c = stubTool("get_employee_performance");
        AiToolRegistry registry = new AiToolRegistry(List.of(a, b, c));

        List<AiTool> subset = registry.subset("get_cash_variance", "get_daily_summary");

        assertThat(subset).extracting(AiTool::name)
                .containsExactly("get_cash_variance", "get_daily_summary");
    }

    @Test
    void registry_subset_throws_on_unknown_name() {
        AiToolRegistry registry = new AiToolRegistry(List.of(stubTool("get_daily_summary")));

        assertThatThrownBy(() -> registry.subset("get_nope"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("get_nope");
    }

    private AiTool stubTool(String toolName) {
        return new AiTool() {
            @Override
            public String name() {
                return toolName;
            }

            @Override
            public String description() {
                return "stub";
            }

            @Override
            public com.fasterxml.jackson.databind.JsonNode parametersSchema() {
                return objectMapper.createObjectNode().put("type", "object");
            }

            @Override
            public com.fasterxml.jackson.databind.JsonNode execute(com.fasterxml.jackson.databind.JsonNode arguments) {
                return objectMapper.createObjectNode();
            }
        };
    }

}
