package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
class DailySummaryTool implements AiTool {
    private final DailySummaryService reports;
    private final ObjectMapper objectMapper;

    DailySummaryTool(DailySummaryService reports, ObjectMapper objectMapper) {
        this.reports = reports;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_daily_summary";
    }

    @Override
    public String description() {
        return "Return the daily operations summary for one specific date: "
                + "cars washed, revenue split (cash / card / transfer), inventory sales, expenses, "
                + "result (revenue minus expenses), courtesy and voided ticket counts, "
                + "and the cash variance versus expected. Use for questions about a specific day.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode props = objectMapper.createObjectNode();
        props.set("date", objectMapper.createObjectNode()
                .put("type", "string").put("format", "date")
                .put("description", "ISO date (YYYY-MM-DD). Use today's date from the system message if unspecified."));
        return objectMapper.createObjectNode()
                .put("type", "object")
                .<ObjectNode>set("properties", props)
                .set("required", objectMapper.createArrayNode().add("date"));
    }

    @Override
    public JsonNode execute(JsonNode args) {
        String dateStr = args.path("date").asText(null);
        if (dateStr == null || dateStr.isBlank()) {
            return objectMapper.createObjectNode().put("error", "Missing required parameter: date (YYYY-MM-DD)");
        }
        try {
            LocalDate date = LocalDate.parse(dateStr);
            DailySummaryResponse summary = reports.get(date);
            return objectMapper.valueToTree(summary);
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
