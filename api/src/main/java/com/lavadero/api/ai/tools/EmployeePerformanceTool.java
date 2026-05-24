package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.EmployeePerformanceResponse;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
class EmployeePerformanceTool implements AiTool {
    private final DailySummaryService reports;
    private final ObjectMapper objectMapper;

    EmployeePerformanceTool(DailySummaryService reports, ObjectMapper objectMapper) {
        this.reports = reports;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_employee_performance";
    }

    @Override
    public String description() {
        return "Return per-lavador performance for a date range: each employee's cars washed (their "
                + "credited share when shared on a ticket), revenue contribution, and ticket count. "
                + "Use for 'which lavador worked the most', 'who washed fewer cars this week', "
                + "or distribution / fairness questions.";
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
            EmployeePerformanceResponse perf = reports.employeePerformance(from, to);
            return objectMapper.valueToTree(perf);
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
