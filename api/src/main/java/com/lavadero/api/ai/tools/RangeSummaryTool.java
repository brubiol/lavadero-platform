package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryRangeResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
class RangeSummaryTool implements AiTool {
    private final DailySummaryService reports;
    private final ObjectMapper objectMapper;

    RangeSummaryTool(DailySummaryService reports, ObjectMapper objectMapper) {
        this.reports = reports;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_range_summary";
    }

    @Override
    public String description() {
        return "Return aggregated totals for a date range plus a slim per-day breakdown: "
                + "cars washed, revenue, expenses, withdrawals, advances, result, courtesy/voided counts, "
                + "and cash variance for the whole range. Use for week-over-week or arbitrary period "
                + "questions. Range is inclusive on both ends. Max 90 days per call.";
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
            if (from.plusDays(90).isBefore(to)) {
                return objectMapper.createObjectNode().put("error", "Range too large; max 90 days per call");
            }
            DailySummaryRangeResponse range = reports.getRange(from, to);
            // Slim per-day rows so we don't blow up the tool-result token budget
            // with the full DailySummaryResponse (which carries recentTickets etc.).
            ObjectNode out = objectMapper.createObjectNode();
            out.put("from", range.from().toString());
            out.put("to", range.to().toString());
            out.put("carsWashed", range.carsWashed());
            out.put("ticketRevenue", range.ticketRevenue());
            out.put("expensesTotal", range.expensesTotal());
            out.put("withdrawalsTotal", range.withdrawalsTotal());
            out.put("advancesTotal", range.advancesTotal());
            out.put("result", range.result());
            out.put("courtesyCount", range.courtesyCount());
            out.put("voidedCount", range.voidedCount());
            out.put("cashVariance", range.cashVariance());
            ArrayNode days = objectMapper.createArrayNode();
            for (DailySummaryResponse d : range.days()) {
                ObjectNode dn = objectMapper.createObjectNode();
                dn.put("date", d.date().toString());
                dn.put("carsWashed", d.carsWashed());
                dn.put("ticketRevenue", d.ticketRevenue());
                dn.put("expensesTotal", d.expensesTotal());
                dn.put("result", d.result());
                dn.put("cashVariance", d.cashVariance());
                days.add(dn);
            }
            out.set("days", days);
            return out;
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
