package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.CashVarianceResponse;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
class CashVarianceTool implements AiTool {
    private final DailySummaryService reports;
    private final ObjectMapper objectMapper;

    CashVarianceTool(DailySummaryService reports, ObjectMapper objectMapper) {
        this.reports = reports;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_cash_variance";
    }

    @Override
    public String description() {
        return "Return cash variance details for a date range: expected cash, counted cash, "
                + "and per-shift breakdown showing each shift's variance and closing reason. "
                + "Use for questions about cash shortages (faltantes), surpluses (sobrantes), "
                + "or 'why is the corte off'.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode props = objectMapper.createObjectNode();
        props.set("from", objectMapper.createObjectNode()
                .put("type", "string").put("format", "date")
                .put("description", "ISO start date (YYYY-MM-DD), inclusive."));
        props.set("to", objectMapper.createObjectNode()
                .put("type", "string").put("format", "date")
                .put("description", "ISO end date (YYYY-MM-DD), inclusive."));
        return objectMapper.createObjectNode()
                .put("type", "object")
                .<ObjectNode>set("properties", props)
                .set("required", objectMapper.createArrayNode().add("from").add("to"));
    }

    @Override
    public JsonNode execute(JsonNode args) {
        String fromStr = args.path("from").asText(null);
        String toStr = args.path("to").asText(null);
        if (fromStr == null || toStr == null) {
            return objectMapper.createObjectNode().put("error", "Missing required parameters: from, to");
        }
        try {
            LocalDate from = LocalDate.parse(fromStr);
            LocalDate to = LocalDate.parse(toStr);
            if (to.isBefore(from)) {
                return objectMapper.createObjectNode().put("error", "to must be on or after from");
            }
            CashVarianceResponse cash = reports.cashVariance(from, to);
            return objectMapper.valueToTree(cash);
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
