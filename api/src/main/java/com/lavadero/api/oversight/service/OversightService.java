package com.lavadero.api.oversight.service;

import com.lavadero.api.audit.domain.AuditEvent;
import com.lavadero.api.audit.repository.AuditEventRepository;
import com.lavadero.api.audit.web.AuditDtos.AuditEventResponse;
import com.lavadero.api.cash.domain.ShiftCloseSummary;
import com.lavadero.api.cash.repository.ShiftCloseSummaryRepository;
import com.lavadero.api.oversight.web.OversightDtos.ActorActivity;
import com.lavadero.api.oversight.web.OversightDtos.OversightPatternsResponse;
import com.lavadero.api.oversight.web.OversightDtos.ShiftShortage;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owner-only oversight surface: aggregates audit events into red-flag
 * patterns so the dueño can detect suspicious activity (potential theft).
 */
@Service
public class OversightService {
    private static final ZoneId MX = ZoneId.of("America/Monterrey");
    private static final int OFF_HOURS_START_HOUR = 22; // 10pm
    private static final int OFF_HOURS_END_HOUR = 7;    // 7am
    private static final int FAST_EDIT_MINUTES = 60;

    private static final Set<String> SENSITIVE_ACTIONS = Set.of(
            "TICKET_VOIDED", "TICKET_EDITED", "TICKET_COURTESY", "TICKET_DISCOUNT",
            "EXPENSE_CREATED", "WITHDRAWAL_CREATED", "ADVANCE_CREATED",
            "SHIFT_REOPENED", "PAYROLL_ADJUSTMENT_CREATED");

    private final AuditEventRepository events;
    private final ShiftCloseSummaryRepository closes;

    public OversightService(AuditEventRepository events, ShiftCloseSummaryRepository closes) {
        this.events = events;
        this.closes = closes;
    }

    @Transactional(readOnly = true)
    public OversightPatternsResponse patterns(LocalDate from, LocalDate to) {
        Instant start = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to.plusDays(1).atStartOfDay().minusNanos(1).toInstant(ZoneOffset.UTC);
        List<AuditEvent> all = events.findByOccurredAtBetweenOrderByOccurredAtAsc(start, end);

        Map<String, ActorBuilder> byActor = new LinkedHashMap<>();
        Map<Long, Instant> createdAt = new HashMap<>();

        for (AuditEvent e : all) {
            String actor = actor(e);
            ActorBuilder b = byActor.computeIfAbsent(actor, ActorBuilder::new);
            b.count(e.getAction());
            if ("TICKET_CREATED".equals(e.getAction()) && e.getEntityId() != null) {
                createdAt.put(e.getEntityId(), e.getOccurredAt());
            }
        }

        // Fast edits — TICKET_EDITED within FAST_EDIT_MINUTES of TICKET_CREATED
        List<AuditEvent> fastEdits = new ArrayList<>();
        for (AuditEvent e : all) {
            if (!"TICKET_EDITED".equals(e.getAction()) || e.getEntityId() == null) continue;
            Instant t0 = createdAt.get(e.getEntityId());
            if (t0 == null) continue;
            if (Duration.between(t0, e.getOccurredAt()).toMinutes() < FAST_EDIT_MINUTES) {
                fastEdits.add(e);
            }
        }

        // Off-hours — sensitive actions before 7am or after 10pm (MX time)
        List<AuditEvent> offHours = new ArrayList<>();
        for (AuditEvent e : all) {
            if (!SENSITIVE_ACTIONS.contains(e.getAction())) continue;
            int hour = e.getOccurredAt().atZone(MX).getHour();
            if (hour < OFF_HOURS_END_HOUR || hour >= OFF_HOURS_START_HOUR) {
                offHours.add(e);
            }
        }

        // Shift closures with shortage (variance negative)
        List<ShiftCloseSummary> closures = closes.findByShiftBusinessDayBusinessDateBetweenOrderByShiftBusinessDayBusinessDateAsc(from, to);
        List<ShiftShortage> shortages = new ArrayList<>();
        BigDecimal totalShortage = BigDecimal.ZERO;
        for (ShiftCloseSummary c : closures) {
            BigDecimal variance = c.getVariance();
            if (variance == null || variance.signum() >= 0) continue;
            totalShortage = totalShortage.add(variance);
            shortages.add(new ShiftShortage(
                    c.getId(), c.getShift().getId(),
                    c.getShift().getShiftType().name(),
                    c.getShift().getBusinessDay().getBusinessDate(),
                    variance, c.getExpectedCash(), c.getTotalCounted(),
                    c.getClosingReason(), c.getClosedAt()));
        }

        List<ActorActivity> actorList = byActor.values().stream()
                .map(ActorBuilder::build)
                .sorted(Comparator.comparingInt(ActorActivity::suspicionScore).reversed())
                .toList();

        int totalCortesias = actorList.stream().mapToInt(ActorActivity::ticketsCourtesy).sum();
        int totalVoided = actorList.stream().mapToInt(ActorActivity::ticketsVoided).sum();

        return new OversightPatternsResponse(
                from, to,
                totalCortesias, totalVoided, fastEdits.size(), totalShortage, offHours.size(),
                actorList,
                fastEdits.stream().map(AuditEventResponse::from).toList(),
                offHours.stream().limit(50).map(AuditEventResponse::from).toList(),
                shortages);
    }

    private static String actor(AuditEvent e) {
        String a = e.getActorUsername();
        return (a == null || a.isBlank()) ? "system" : a;
    }

    private static final class ActorBuilder {
        final String actor;
        int created, edited, voided, courtesy, discount;
        int expenses, withdrawals, advances, shiftsClosed, payrollAdjustments;

        ActorBuilder(String actor) {
            this.actor = actor;
        }

        void count(String action) {
            switch (action) {
                case "TICKET_CREATED" -> created++;
                case "TICKET_EDITED" -> edited++;
                case "TICKET_VOIDED" -> voided++;
                case "TICKET_COURTESY" -> courtesy++;
                case "TICKET_DISCOUNT" -> discount++;
                case "EXPENSE_CREATED" -> expenses++;
                case "WITHDRAWAL_CREATED" -> withdrawals++;
                case "ADVANCE_CREATED" -> advances++;
                case "SHIFT_CLOSED" -> shiftsClosed++;
                case "PAYROLL_ADJUSTMENT_CREATED" -> payrollAdjustments++;
                default -> { /* ignored — only tracked sensitive actions */ }
            }
        }

        /**
         * Suspicion score — weighted composite of behaviors that historically signal
         * theft attempts. Higher = warrants more attention. Weights tuned for a small
         * cash car wash where each metric should be very low in a normal day.
         */
        int score() {
            int s = 0;
            s += courtesy * 3;                // 3 pts each — most common abuse vector
            s += voided * 4;                  // 4 pts each — keeps cash but voids ticket
            s += discount;                    // 1 pt each — milder but worth tracking
            s += Math.max(0, edited - 1) * 2; // editing >1 ticket is unusual
            s += Math.max(0, withdrawals - 2) * 3; // withdrawals beyond 2 in range
            s += Math.max(0, advances - 2) * 2;
            s += payrollAdjustments * 5;      // payroll adjustments are rare; high weight
            return s;
        }

        String level(int score) {
            if (score >= 25) return "HIGH";
            if (score >= 12) return "MEDIUM";
            if (score >= 5)  return "LOW";
            return "CLEAN";
        }

        ActorActivity build() {
            int score = score();
            return new ActorActivity(actor, created, edited, voided, courtesy, discount,
                    expenses, withdrawals, advances, shiftsClosed, payrollAdjustments,
                    score, level(score));
        }
    }
}
