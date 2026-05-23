package com.lavadero.api.oversight.web;

import com.lavadero.api.audit.web.AuditDtos.AuditEventResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class OversightDtos {
    private OversightDtos() {
    }

    public record ActorActivity(
            String actor,
            int ticketsCreated,
            int ticketsEdited,
            int ticketsVoided,
            int ticketsCourtesy,
            int ticketsDiscount,
            int expensesCreated,
            int withdrawalsCreated,
            int advancesCreated,
            int shiftsClosed,
            int payrollAdjustments) {
    }

    public record ShiftShortage(
            Long shiftCloseId,
            Long shiftId,
            String shiftType,
            LocalDate businessDate,
            BigDecimal variance,
            BigDecimal expectedCash,
            BigDecimal totalCounted,
            String closingReason,
            Instant closedAt) {
    }

    public record OversightPatternsResponse(
            LocalDate from,
            LocalDate to,
            int totalCortesias,
            int totalVoided,
            int totalFastEdits,
            BigDecimal totalShortageVariance,
            int totalOffHoursActions,
            List<ActorActivity> byActor,
            List<AuditEventResponse> fastEdits,
            List<AuditEventResponse> offHoursActions,
            List<ShiftShortage> shortages) {
    }
}
