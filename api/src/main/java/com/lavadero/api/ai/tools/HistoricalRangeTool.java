package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.reports.domain.HistoricalDailySnapshot;
import com.lavadero.api.reports.repository.HistoricalDailySnapshotRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class HistoricalRangeTool implements AiTool {
    // Hard cap so a curious model asking for "all of 2025" can't blow the token budget.
    private static final int MAX_DAYS = 120;

    private final HistoricalDailySnapshotRepository snapshots;
    private final ObjectMapper objectMapper;

    HistoricalRangeTool(HistoricalDailySnapshotRepository snapshots, ObjectMapper objectMapper) {
        this.snapshots = snapshots;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_historical_range";
    }

    @Override
    public String description() {
        return "Return seeded historical daily snapshots (cars, revenue, expenses, result in MXN) for a "
                + "date range from before the system went live. Used for year-over-year comparisons or "
                + "'how did we do this week last year'. Source is the historical_daily_snapshots table "
                + "loaded from the legacy Excel workbook. Max range: " + MAX_DAYS + " days.";
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
            if (from.plusDays(MAX_DAYS).isBefore(to)) {
                return objectMapper.createObjectNode()
                        .put("error", "Range too wide; maximum " + MAX_DAYS + " days per call. "
                                + "Narrow the window and call again.");
            }
            List<HistoricalDailySnapshot> rows = snapshots
                    .findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to);

            ObjectNode out = objectMapper.createObjectNode();
            out.put("from", from.toString());
            out.put("to", to.toString());
            out.put("rowCount", rows.size());

            int totalCars = 0;
            BigDecimal totalRevenue = BigDecimal.ZERO;
            BigDecimal totalExpenses = BigDecimal.ZERO;
            BigDecimal totalResult = BigDecimal.ZERO;
            var days = objectMapper.createArrayNode();
            for (HistoricalDailySnapshot row : rows) {
                if (row.getTotalCars() != null) totalCars += row.getTotalCars();
                if (row.getRevenueMxn() != null) totalRevenue = totalRevenue.add(row.getRevenueMxn());
                if (row.getExpensesMxn() != null) totalExpenses = totalExpenses.add(row.getExpensesMxn());
                if (row.getResultadoMxn() != null) totalResult = totalResult.add(row.getResultadoMxn());
                ObjectNode dn = objectMapper.createObjectNode();
                dn.put("date", row.getSnapshotDate().toString());
                dn.put("cars", row.getTotalCars());
                dn.put("revenueMxn", row.getRevenueMxn());
                dn.put("expensesMxn", row.getExpensesMxn());
                dn.put("resultMxn", row.getResultadoMxn());
                dn.put("source", row.getSource());
                days.add(dn);
            }
            out.put("totalCars", totalCars);
            out.put("totalRevenueMxn", totalRevenue);
            out.put("totalExpensesMxn", totalExpenses);
            out.put("totalResultMxn", totalResult);
            out.set("days", days);
            return out;
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
