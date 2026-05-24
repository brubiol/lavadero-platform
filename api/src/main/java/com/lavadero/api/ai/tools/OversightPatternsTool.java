package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.oversight.service.OversightService;
import com.lavadero.api.oversight.web.OversightDtos.ActorActivity;
import com.lavadero.api.oversight.web.OversightDtos.OversightPatternsResponse;
import com.lavadero.api.oversight.web.OversightDtos.ShiftShortage;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
class OversightPatternsTool implements AiTool {
    // Per-actor / shortage rows are slim; cap the array sizes so the model
    // sees the biggest offenders without burning the response budget.
    private static final int MAX_ACTORS = 10;
    private static final int MAX_SHORTAGES = 10;

    private final OversightService oversight;
    private final ObjectMapper objectMapper;

    OversightPatternsTool(OversightService oversight, ObjectMapper objectMapper) {
        this.oversight = oversight;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_oversight_patterns";
    }

    @Override
    public String description() {
        return "Return red-flag patterns from the audit log for a date range: counts of cortesias, "
                + "ticket voids, fast post-create edits, off-hours sensitive actions, cash shortage "
                + "totals, and a per-actor activity table with a suspicion score (CLEAN/LOW/MEDIUM/HIGH). "
                + "Use for fraud/theft investigation questions: 'quién registró más cortesías', "
                + "'hubo movimientos sospechosos esta semana', 'who has the highest suspicion score'.";
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
            OversightPatternsResponse p = oversight.patterns(from, to);

            ObjectNode out = objectMapper.createObjectNode();
            out.put("from", p.from().toString());
            out.put("to", p.to().toString());
            out.put("totalCortesias", p.totalCortesias());
            out.put("totalVoided", p.totalVoided());
            out.put("totalFastEdits", p.totalFastEdits());
            out.put("totalShortageVariance", p.totalShortageVariance());
            out.put("totalOffHoursActions", p.totalOffHoursActions());

            var actors = objectMapper.createArrayNode();
            int actorLimit = Math.min(p.byActor().size(), MAX_ACTORS);
            for (int i = 0; i < actorLimit; i++) {
                ActorActivity a = p.byActor().get(i);
                ObjectNode an = objectMapper.createObjectNode();
                an.put("actor", a.actor());
                an.put("ticketsCreated", a.ticketsCreated());
                an.put("ticketsEdited", a.ticketsEdited());
                an.put("ticketsVoided", a.ticketsVoided());
                an.put("ticketsCourtesy", a.ticketsCourtesy());
                an.put("ticketsDiscount", a.ticketsDiscount());
                an.put("withdrawalsCreated", a.withdrawalsCreated());
                an.put("advancesCreated", a.advancesCreated());
                an.put("suspicionScore", a.suspicionScore());
                an.put("suspicionLevel", a.suspicionLevel());
                actors.add(an);
            }
            out.set("topActors", actors);

            var shortages = objectMapper.createArrayNode();
            int shortageLimit = Math.min(p.shortages().size(), MAX_SHORTAGES);
            for (int i = 0; i < shortageLimit; i++) {
                ShiftShortage s = p.shortages().get(i);
                ObjectNode sn = objectMapper.createObjectNode();
                sn.put("businessDate", s.businessDate().toString());
                sn.put("shiftType", s.shiftType());
                sn.put("variance", s.variance());
                sn.put("expectedCash", s.expectedCash());
                sn.put("totalCounted", s.totalCounted());
                sn.put("closingReason", s.closingReason());
                shortages.add(sn);
            }
            out.set("shortages", shortages);

            return out;
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
