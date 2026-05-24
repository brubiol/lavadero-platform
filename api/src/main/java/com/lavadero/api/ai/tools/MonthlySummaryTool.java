package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.MonthlySummaryResponse;
import org.springframework.stereotype.Component;

@Component
class MonthlySummaryTool implements AiTool {
    private final DailySummaryService reports;
    private final ObjectMapper objectMapper;

    MonthlySummaryTool(DailySummaryService reports, ObjectMapper objectMapper) {
        this.reports = reports;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_monthly_summary";
    }

    @Override
    public String description() {
        return "Return the full month rollup: cars washed, revenue, expenses, withdrawals, advances, "
                + "result, courtesy/voided counts, cash variance, and a slim per-day breakdown. "
                + "Use for 'how was May?', 'compare this month vs last month', or monthly trend questions. "
                + "Use the month/year of interest, not always the current month.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode props = objectMapper.createObjectNode();
        props.set("year", objectMapper.createObjectNode()
                .put("type", "integer").put("minimum", 2020)
                .put("description", "Calendar year (e.g. 2026)."));
        props.set("month", objectMapper.createObjectNode()
                .put("type", "integer").put("minimum", 1).put("maximum", 12)
                .put("description", "Month number 1-12."));
        return objectMapper.createObjectNode()
                .put("type", "object")
                .<ObjectNode>set("properties", props)
                .set("required", objectMapper.createArrayNode().add("year").add("month"));
    }

    @Override
    public JsonNode execute(JsonNode args) {
        if (!args.has("year") || !args.has("month")) {
            return objectMapper.createObjectNode().put("error", "Missing required parameters: year, month");
        }
        try {
            int year = args.get("year").asInt();
            int month = args.get("month").asInt();
            if (month < 1 || month > 12) {
                return objectMapper.createObjectNode().put("error", "month must be 1-12");
            }
            MonthlySummaryResponse m = reports.getMonthly(year, month);
            // Slim per-day rows so we don't blow up the tool-result token budget.
            ObjectNode out = objectMapper.createObjectNode();
            out.put("year", m.year());
            out.put("month", m.month());
            out.put("from", m.from().toString());
            out.put("to", m.to().toString());
            out.put("carsWashed", m.carsWashed());
            out.put("ticketRevenue", m.ticketRevenue());
            out.put("expensesTotal", m.expensesTotal());
            out.put("withdrawalsTotal", m.withdrawalsTotal());
            out.put("advancesTotal", m.advancesTotal());
            out.put("result", m.result());
            out.put("courtesyCount", m.courtesyCount());
            out.put("voidedCount", m.voidedCount());
            out.put("cashVariance", m.cashVariance());
            var days = objectMapper.createArrayNode();
            for (DailySummaryResponse d : m.days()) {
                ObjectNode dn = objectMapper.createObjectNode();
                dn.put("date", d.date().toString());
                dn.put("carsWashed", d.carsWashed());
                dn.put("ticketRevenue", d.ticketRevenue());
                dn.put("expensesTotal", d.expensesTotal());
                dn.put("result", d.result());
                days.add(dn);
            }
            out.set("days", days);
            return out;
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
