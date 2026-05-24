package com.lavadero.api.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.ai.domain.AiInsight;
import com.lavadero.api.ai.provider.AiProvider.ToolAwareCompletion;
import com.lavadero.api.ai.provider.AiProvider.ToolCallTrace;
import com.lavadero.api.ai.provider.AiRequest;
import com.lavadero.api.ai.repository.AiInsightRepository;
import com.lavadero.api.ai.tools.AiTool;
import com.lavadero.api.ai.tools.AiToolRegistry;
import com.lavadero.api.ai.web.AiDtos.InvestigationResponse;
import com.lavadero.api.audit.repository.AuditEventRepository;
import com.lavadero.api.inventory.service.InventoryService;
import com.lavadero.api.reports.service.DailySummaryService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Plain JUnit harness for AiInsightService's tool-loop branches. Stubs the
 * provider with canned traces so we can verify the derivation rules (steps,
 * evidence, confidence) without standing up Spring or a real model.
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

    @Test
    void investigate_high_confidence_when_three_distinct_tools_succeed() {
        StubAiProvider stub = new StubAiProvider().enqueueToolCompletion(
                "Conclusion: investigado. Evidencia: ...",
                List.of(
                        trace("get_daily_summary", "{\"cars\":12}"),
                        trace("get_cash_variance", "{\"variance\":-50}"),
                        trace("get_employee_performance", "{\"top\":\"Juan\"}")));
        AiInsightService service = buildService(stub);

        InvestigationResponse r = service.investigate("test?", LocalDate.now(), LocalDate.now());

        assertThat(r.confidence()).isEqualTo("HIGH");
        assertThat(r.steps()).hasSize(3);
        assertThat(r.steps().get(0)).startsWith("Consulte get_daily_summary con ");
        assertThat(r.evidence().get(0)).startsWith("get_daily_summary: ");
        assertThat(r.conclusion()).contains("Conclusion");
    }

    @Test
    void investigate_medium_confidence_when_one_or_two_distinct_tools_succeed() {
        StubAiProvider stub = new StubAiProvider().enqueueToolCompletion(
                "ok",
                List.of(
                        trace("get_daily_summary", "{\"cars\":1}"),
                        traceError("get_cash_variance", "boom")));
        AiInsightService service = buildService(stub);

        InvestigationResponse r = service.investigate("q?", LocalDate.now(), LocalDate.now());

        assertThat(r.confidence()).isEqualTo("MEDIUM");
    }

    @Test
    void investigate_low_confidence_and_fallback_step_when_trace_is_empty() {
        StubAiProvider stub = new StubAiProvider().enqueueToolCompletion("plantilla", List.of());
        AiInsightService service = buildService(stub);

        InvestigationResponse r = service.investigate("q?", LocalDate.now(), LocalDate.now());

        assertThat(r.confidence()).isEqualTo("LOW");
        assertThat(r.steps()).containsExactly("Sin acceso al LLM; se devolvio respuesta plantilla.");
        assertThat(r.evidence()).isEmpty();
    }

    @Test
    void parses_numbered_explanations_from_model_text() {
        AiInsightService service = buildService(new StubAiProvider());
        String text = "#1: Bajaron por feriado\n#2: Sin patron raro\n#3: Revisar a Juan, hizo 4 cortesias";

        Map<Integer, String> parsed = service.parseNumberedExplanations(text, 3);

        assertThat(parsed).hasSize(3);
        assertThat(parsed.get(1)).isEqualTo("Bajaron por feriado");
        assertThat(parsed.get(2)).isEqualTo("Sin patron raro");
        assertThat(parsed.get(3)).isEqualTo("Revisar a Juan, hizo 4 cortesias");
    }

    @Test
    void parser_drops_indices_out_of_range() {
        AiInsightService service = buildService(new StubAiProvider());
        String text = "#1: valido\n#2: valido\n#9: spurious";

        Map<Integer, String> parsed = service.parseNumberedExplanations(text, 2);

        assertThat(parsed).containsOnlyKeys(1, 2);
    }

    @Test
    void parser_handles_multi_line_explanations() {
        AiInsightService service = buildService(new StubAiProvider());
        String text = "#1: linea uno\nlinea dos\n#2: solo una linea";

        Map<Integer, String> parsed = service.parseNumberedExplanations(text, 2);

        assertThat(parsed.get(1)).contains("linea uno").contains("linea dos");
        assertThat(parsed.get(2)).isEqualTo("solo una linea");
    }

    @Test
    void investigate_low_confidence_when_every_call_errored() {
        StubAiProvider stub = new StubAiProvider().enqueueToolCompletion(
                "ok",
                List.of(traceError("get_daily_summary", "x"), traceError("get_cash_variance", "y")));
        AiInsightService service = buildService(stub);

        InvestigationResponse r = service.investigate("q?", LocalDate.now(), LocalDate.now());

        assertThat(r.confidence()).isEqualTo("LOW");
    }

    private AiInsightService buildService(StubAiProvider stub) {
        AiInsightRepository insights = mock(AiInsightRepository.class);
        // save() returns whatever entity was handed in so response() can read the details JSON.
        when(insights.save(any(AiInsight.class))).thenAnswer(inv -> inv.getArgument(0));
        DailySummaryService reports = mock(DailySummaryService.class);
        InventoryService inventory = mock(InventoryService.class);
        AuditEventRepository audit = mock(AuditEventRepository.class);
        AiToolRegistry registry = new AiToolRegistry(List.of());
        return new AiInsightService(insights, reports, inventory, stub, objectMapper, audit, registry);
    }

    private ToolCallTrace trace(String name, String resultJson) {
        return new ToolCallTrace(name, objectMapper.createObjectNode(), parse(resultJson));
    }

    private ToolCallTrace traceError(String name, String message) {
        return new ToolCallTrace(name, objectMapper.createObjectNode(),
                objectMapper.createObjectNode().put("error", message));
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
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
            public JsonNode parametersSchema() {
                return objectMapper.createObjectNode().put("type", "object");
            }

            @Override
            public JsonNode execute(JsonNode arguments) {
                return objectMapper.createObjectNode();
            }
        };
    }
}
