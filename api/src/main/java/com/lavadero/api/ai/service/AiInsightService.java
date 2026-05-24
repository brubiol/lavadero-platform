package com.lavadero.api.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.ai.domain.AiFeatureType;
import com.lavadero.api.ai.domain.AiInsight;
import com.lavadero.api.ai.domain.AiInsightSeverity;
import com.lavadero.api.ai.domain.AiInsightStatus;
import com.lavadero.api.ai.provider.AiProvider;
import com.lavadero.api.ai.provider.AiProvider.ToolAwareCompletion;
import com.lavadero.api.ai.provider.AiProvider.ToolCallTrace;
import com.lavadero.api.ai.provider.AiRequest;
import com.lavadero.api.ai.repository.AiInsightRepository;
import com.lavadero.api.ai.tools.AiToolRegistry;
import com.lavadero.api.ai.web.AiDtos.AiInsightResponse;
import com.lavadero.api.ai.web.AiDtos.AnalystChatResponse;
import com.lavadero.api.ai.web.AiDtos.InvestigationResponse;
import com.lavadero.api.ai.web.AiDtos.PromptCategory;
import com.lavadero.api.ai.web.AiDtos.QuickPromptsResponse;
import com.lavadero.api.ai.web.AiDtos.TodayResponse;
import com.lavadero.api.ai.web.AiDtos.TodaySummary;
import com.lavadero.api.ai.web.AiDtos.ToolCallSummary;
import com.lavadero.api.audit.domain.AuditEvent;
import com.lavadero.api.audit.repository.AuditEventRepository;
import com.lavadero.api.inventory.service.InventoryService;
import com.lavadero.api.inventory.web.InventoryDtos.InventorySnapshotResponse;
import com.lavadero.api.inventory.web.InventoryDtos.ProductSnapshotResponse;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.CashVarianceResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryRangeResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.EmployeePerformanceResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.HistoricalRangeResponse;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInsightService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal CASH_VARIANCE_THRESHOLD = new BigDecimal("100.00");
    private static final BigDecimal LOW_INVENTORY_THRESHOLD = new BigDecimal("5.00");
    private static final BigDecimal SPIKE_MULTIPLIER = new BigDecimal("1.50");
    private static final BigDecimal DROP_MULTIPLIER = new BigDecimal("0.75");

    private final AiInsightRepository insights;
    private final DailySummaryService reports;
    private final InventoryService inventory;
    private final AiProvider aiProvider;
    private final ObjectMapper objectMapper;
    private final AuditEventRepository auditEvents;
    private final AiToolRegistry toolRegistry;

    // Actor-pattern thresholds for watchdog alerts (per-range)
    private static final int ACTOR_COURTESY_THRESHOLD = 5;
    private static final int ACTOR_WITHDRAWAL_THRESHOLD = 3;
    private static final int LATE_EDIT_MINUTES = 60;

    /** Max round-trips of (model picks tool → we execute → model reads result). 5 is plenty for chat questions. */
    private static final int CHAT_TOOL_MAX_ITER = 5;

    /** Investigation is allowed deeper exploration (form hypothesis, fetch, iterate). */
    private static final int INVESTIGATE_TOOL_MAX_ITER = 8;

    /** Daily brief runs on every dashboard open (cache miss); cap iterations tighter to bound latency. */
    private static final int BRIEF_TOOL_MAX_ITER = 4;

    /** Alerts run as one batched call over all candidates; allow a few rounds to investigate context. */
    private static final int ALERT_TOOL_MAX_ITER = 6;

    /** Curated tool subset for dailyBrief — summary/performance/inventory/oversight only. */
    private static final String[] BRIEF_TOOLS = {
            "get_daily_summary", "get_historical_range", "get_cash_variance",
            "get_employee_performance", "get_inventory_snapshot", "get_oversight_patterns"
    };

    /** Curated tool subset for runAlerts — same shape as brief, plus monthly for trend context. */
    private static final String[] ALERT_TOOLS = {
            "get_daily_summary", "get_range_summary", "get_monthly_summary",
            "get_historical_range", "get_cash_variance", "get_employee_performance",
            "get_oversight_patterns"
    };

    /** Per-date guard so a refreshing dashboard doesn't re-trigger the alert tool loop. */
    private final java.util.concurrent.ConcurrentHashMap<LocalDate, Instant> lastAlertRunByDate =
            new java.util.concurrent.ConcurrentHashMap<>();
    private static final Duration ALERT_RUN_DEDUPE = Duration.ofMinutes(15);

    public AiInsightService(AiInsightRepository insights, DailySummaryService reports, InventoryService inventory,
            AiProvider aiProvider, ObjectMapper objectMapper, AuditEventRepository auditEvents,
            AiToolRegistry toolRegistry) {
        this.insights = insights;
        this.reports = reports;
        this.inventory = inventory;
        this.aiProvider = aiProvider;
        this.objectMapper = objectMapper;
        this.auditEvents = auditEvents;
        this.toolRegistry = toolRegistry;
    }

    @Transactional(readOnly = true)
    public List<AiInsightResponse> list(AiFeatureType featureType, AiInsightStatus status,
            LocalDate from, LocalDate to) {
        List<AiInsight> result;
        if (featureType != null && status != null && from != null && to != null) {
            result = insights.findByFeatureTypeAndStatusAndSourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
                    featureType, status, from, to);
        } else if (featureType != null && from != null && to != null) {
            result = insights.findByFeatureTypeAndSourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
                    featureType, from, to);
        } else if (status != null && from != null && to != null) {
            result = insights.findByStatusAndSourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
                    status, from, to);
        } else if (from != null && to != null) {
            result = insights.findBySourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(from, to);
        } else if (featureType != null && status != null) {
            result = insights.findByFeatureTypeAndStatusOrderByGeneratedAtDesc(featureType, status);
        } else if (featureType != null) {
            result = insights.findByFeatureTypeOrderByGeneratedAtDesc(featureType);
        } else if (status != null) {
            result = insights.findByStatusOrderByGeneratedAtDesc(status);
        } else {
            result = insights.findAll().stream()
                    .sorted(Comparator.comparing(AiInsight::getGeneratedAt).reversed())
                    .toList();
        }
        return result.stream().map(this::response).toList();
    }

    @Transactional
    public AiInsightResponse acknowledge(Long id) {
        AiInsight insight = get(id);
        insight.acknowledge();
        return response(insight);
    }

    @Transactional
    public AiInsightResponse dismiss(Long id) {
        AiInsight insight = get(id);
        insight.dismiss();
        return response(insight);
    }

    @Transactional
    public AiInsightResponse dailyBrief(LocalDate date, boolean force) {
        if (!force) {
            var existing = insights.findFirstByFeatureTypeAndSourceFromAndSourceToOrderByGeneratedAtDesc(
                    AiFeatureType.DAILY_BRIEF, date, date);
            if (existing.isPresent()) {
                return response(existing.get());
            }
        }

        // Pre-compute the deterministic numbers up front so (a) the structured details
        // payload is still populated for the UI cards, and (b) the model can use them
        // as initial context, and (c) we have a fallback brief to ship if the LLM
        // is unavailable.
        DailySummaryResponse day = reports.get(date);
        HistoricalRangeResponse history = safeHistorical(date.minusDays(30), date.minusDays(1));
        EmployeePerformanceResponse performance = reports.employeePerformance(date, date);
        InventorySnapshotResponse stock = inventory.snapshot(Instant.now());
        List<String> bullets = briefBullets(day, history, stock);

        String systemPrompt = ""
                + "Eres el analista del dueno de un lavadero en Reynosa, Mexico. "
                + "Escribe el brief operativo del dia. Sin emojis. "
                + "Responde con 3 a 5 lineas en espanol, cada una iniciando con '- '. "
                + "Numeros concretos. Si un numero parece raro, usa las herramientas para verificar antes de afirmarlo. "
                + "Hoy es " + date + ".";
        String userPrompt = "Contexto inicial (verifica con herramientas si algo se ve raro):\n- "
                + String.join("\n- ", bullets)
                + "\n\nGenera el brief.";

        AiRequest request = new AiRequest(AiFeatureType.DAILY_BRIEF, systemPrompt, userPrompt);
        ToolAwareCompletion completion = aiProvider.completeWithTools(
                request, toolRegistry.subset(BRIEF_TOOLS), BRIEF_TOOL_MAX_ITER);

        String title = "Brief del dueno - " + date;
        // Fallback path (no API key -> empty trace -> deterministic provider): the
        // model's text is generic boilerplate. Keep the old bullet-stitched body so
        // the frontend's aiSummaryLines split-on-newline still renders useful lines.
        String summary = completion.trace().isEmpty()
                ? title + "\n- " + String.join("\n- ", bullets)
                : completion.text();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("carsWashed", day.carsWashed());
        payload.put("ticketRevenue", day.ticketRevenue());
        payload.put("expensesTotal", day.expensesTotal());
        payload.put("result", day.result());
        payload.put("cashVariance", day.cashVariance());
        payload.put("topEmployees", performance.employees().stream().limit(3).toList());
        payload.put("lowInventory", lowStock(stock).stream().limit(5).toList());
        payload.put("toolsCalled", completion.trace().stream().map(ToolCallTrace::name).toList());
        String details = details(payload);
        return response(save(AiFeatureType.DAILY_BRIEF, AiInsightSeverity.INFO, title, summary, details, date, date));
    }

    private List<String> briefBullets(DailySummaryResponse day, HistoricalRangeResponse history,
            InventorySnapshotResponse stock) {
        BigDecimal avgCars = averageCars(history);
        BigDecimal avgRevenue = averageRevenue(history);
        List<String> bullets = new ArrayList<>();
        bullets.add("Carros lavados: %d contra promedio reciente de %s.".formatted(
                day.carsWashed(), number(avgCars)));
        bullets.add("Ingresos de autos: %s contra promedio reciente de %s.".formatted(
                money(day.ticketRevenue()), money(avgRevenue)));
        bullets.add("Salidas registradas: %s; resultado del dia: %s.".formatted(
                money(day.expensesTotal()), money(day.result())));
        if (day.cashVariance() != null) {
            bullets.add("Diferencia de caja acumulada: %s.".formatted(money(day.cashVariance())));
        }
        lowStock(stock).stream().limit(3)
                .forEach(item -> bullets.add("Inventario bajo: %s con %s unidades.".formatted(
                        item.product().name(), number(item.quantityOnHand()))));
        return bullets;
    }

    @Transactional
    public List<AiInsightResponse> runAlerts(LocalDate from, LocalDate to) {
        validateRange(from, to);

        // Skip the tool loop entirely if we already ran it for this date recently.
        // today() calls this on every dashboard open; without the guard a quick
        // page-refresh storm would burn LLM budget detecting the same anomalies.
        // Single-date runs only — multi-day audit runs still go through.
        if (from.equals(to)) {
            Instant lastRun = lastAlertRunByDate.get(from);
            if (lastRun != null && Duration.between(lastRun, Instant.now()).compareTo(ALERT_RUN_DEDUPE) < 0) {
                return List.of();
            }
        }

        List<AlertCandidate> candidates = alertCandidates(from, to);

        // Drop candidates that already produced an insight in this same window —
        // otherwise a dashboard refresh would call the tool loop and duplicate work.
        List<AlertCandidate> fresh = candidates.stream()
                .filter(c -> !insights.existsByFeatureTypeAndTitleAndSourceFromAndSourceTo(
                        AiFeatureType.ANOMALY_ALERT, c.title, from, to))
                .toList();
        if (fresh.isEmpty()) {
            return List.of();
        }

        // One batched tool-loop call investigates all candidates together. Cuts N
        // round-trips down to 1; the model can also reuse a tool result across
        // candidates (e.g. one get_oversight_patterns covers cortesias + retiros).
        Map<Integer, String> explanations = explainCandidatesBatched(fresh, from, to);

        List<AiInsightResponse> created = new ArrayList<>();
        for (int i = 0; i < fresh.size(); i++) {
            AlertCandidate c = fresh.get(i);
            String explanation = explanations.getOrDefault(i + 1, "");
            String summary = explanation.isBlank() ? c.summary : c.summary + "\n" + explanation;
            // Severity stays as the rule-engine's verdict. Fraud-system rule:
            // never let the model downgrade an alert. Override would need a
            // separate contract with a required reason.
            created.add(response(save(AiFeatureType.ANOMALY_ALERT, c.severity, c.title,
                    summary, details(c.details), from, to)));
        }
        lastAlertRunByDate.put(from, Instant.now());
        return created;
    }

    private Map<Integer, String> explainCandidatesBatched(List<AlertCandidate> candidates,
            LocalDate from, LocalDate to) {
        StringBuilder userPrompt = new StringBuilder()
                .append("Se detectaron las siguientes anomalias entre ")
                .append(from).append(" y ").append(to).append(". ")
                .append("Investiga con herramientas si necesitas mas contexto y escribe ")
                .append("una explicacion breve (2-3 lineas) por cada una.\n\n");
        for (int i = 0; i < candidates.size(); i++) {
            AlertCandidate c = candidates.get(i);
            userPrompt.append("#").append(i + 1).append(" [").append(c.severity).append("] ")
                    .append(c.title).append(": ").append(c.summary).append("\n");
        }

        String systemPrompt = ""
                + "Eres el analista del dueno de un lavadero en Reynosa, Mexico. "
                + "Responde con una explicacion por anomalia, en espanol, sin emojis. "
                + "Formato obligatorio: cada explicacion empieza en una linea nueva con '#N:' "
                + "donde N es el numero de la anomalia. Maximo 3 lineas por anomalia. "
                + "Si las herramientas confirman que es un evento normal (festivo, clima), dilo.";
        AiRequest req = new AiRequest(AiFeatureType.ANOMALY_ALERT, systemPrompt, userPrompt.toString());
        ToolAwareCompletion completion = aiProvider.completeWithTools(
                req, toolRegistry.subset(ALERT_TOOLS), ALERT_TOOL_MAX_ITER);

        return parseNumberedExplanations(completion.text(), candidates.size());
    }

    /**
     * Pull "#N: ..." explanations out of the model's text. Each explanation runs
     * until the next "#N:" marker (or EOF). Anything that doesn't match a known
     * index is dropped — callers fall back to the candidate's own summary text.
     */
    // Package-private for unit testing.
    Map<Integer, String> parseNumberedExplanations(String text, int candidateCount) {
        Map<Integer, String> out = new LinkedHashMap<>();
        if (text == null || text.isBlank()) {
            return out;
        }
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(
                "(?m)^#(\\d+)[.:)]?\\s*(.+?)(?=^#\\d+[.:)]?\\s|\\z)",
                java.util.regex.Pattern.DOTALL);
        java.util.regex.Matcher m = p.matcher(text);
        while (m.find()) {
            try {
                int idx = Integer.parseInt(m.group(1));
                if (idx >= 1 && idx <= candidateCount) {
                    out.put(idx, m.group(2).trim());
                }
            } catch (NumberFormatException ignore) {
                // skip
            }
        }
        return out;
    }

    @Transactional
    public AnalystChatResponse chat(String message, LocalDate from, LocalDate to) {
        validateRange(from, to);

        // Pre-fetch enough numbers for the deterministic fallback + a templated "answer"
        // hint (used when no AI key / provider is misconfigured). When the real LLM is
        // up, it ignores this and calls the tools itself.
        DailySummaryRangeResponse range = reports.getRange(from, to);
        CashVarianceResponse cash = reports.cashVariance(from, to);
        EmployeePerformanceResponse performance = reports.employeePerformance(from, to);
        List<String> numbers = supportNumbers(range, cash, performance);
        String templateAnswer = answerFor(message, range, cash, performance);

        // System prompt tells the model the active context (today + the user-picked range)
        // so it can fill in date parameters when calling tools without re-asking.
        String today = LocalDate.now().toString();
        String systemPrompt = ""
                + "Eres analista del negocio de un lavadero en Reynosa, Mexico. "
                + "Responde en espanol, conciso, con numeros reales. "
                + "Usa las herramientas para obtener datos antes de afirmar cifras. "
                + "Hoy es " + today + ". El usuario esta viendo el rango " + from + " a " + to + " por defecto, "
                + "pero puedes pedir cualquier rango que necesites.";

        AiRequest request = new AiRequest(AiFeatureType.ANALYST_CHAT, systemPrompt, message);
        ToolAwareCompletion completion = aiProvider.completeWithTools(request, toolRegistry.all(), CHAT_TOOL_MAX_ITER);

        // If the model declined to use tools and fell back to text-only, the fallback
        // provider's output is already in completion.text(). Prepend the template answer
        // only if no tools were called AND the model returned something short / templated.
        String summary = completion.trace().isEmpty()
                ? (templateAnswer + "\n" + completion.text()).trim()
                : completion.text();

        List<ToolCallSummary> toolCalls = completion.trace().stream()
                .map(this::summarize)
                .toList();

        AiInsight insight = save(AiFeatureType.ANALYST_CHAT, AiInsightSeverity.INFO,
                "Pregunta AI: " + shorten(message, 120), summary,
                details(Map.of(
                        "question", message,
                        "supportingNumbers", numbers,
                        "toolsCalled", toolCalls.stream().map(ToolCallSummary::name).toList())),
                from, to);

        return new AnalystChatResponse(summary, numbers, from, to, List.of(
                "Comparar contra el mes anterior",
                "Revisar dias con diferencia de caja",
                "Ver lavadores con mas carros acreditados"),
                toolCalls, response(insight));
    }

    /**
     * Compact trace entry: keep arguments verbatim (small JSON), shorten the result
     * to a 200-char preview so the UI can show "Llamé a X: {preview}" without
     * shipping the full payload to the frontend.
     */
    private ToolCallSummary summarize(ToolCallTrace t) {
        String preview;
        try {
            String full = objectMapper.writeValueAsString(t.result());
            preview = full.length() <= 200 ? full : full.substring(0, 200) + "…";
        } catch (JsonProcessingException ex) {
            preview = "(unserializable result)";
        }
        return new ToolCallSummary(t.name(), t.arguments(), preview);
    }

    @Transactional
    public InvestigationResponse investigate(String question, LocalDate from, LocalDate to) {
        validateRange(from, to);

        String today = LocalDate.now().toString();
        String systemPrompt = ""
                + "Eres analista senior del negocio de un lavadero en Reynosa, Mexico. "
                + "Investiga la pregunta usando las herramientas disponibles: forma una hipotesis, "
                + "consulta datos, refina. Sin emojis. Responde en espanol en tres secciones: "
                + "'Conclusion:' (1-2 lineas), 'Evidencia:' (numeros concretos), 'Pasos:' (orden de tu razonamiento). "
                + "Hoy es " + today + ". El rango bajo investigacion es " + from + " a " + to + ".";
        AiRequest request = new AiRequest(AiFeatureType.AGENT_INVESTIGATION, systemPrompt, question);
        ToolAwareCompletion completion = aiProvider.completeWithTools(
                request, toolRegistry.all(), INVESTIGATE_TOOL_MAX_ITER);

        List<ToolCallTrace> trace = completion.trace();
        List<String> steps = stepsFromTrace(trace);
        List<String> evidence = evidenceFromTrace(trace);
        String confidence = confidenceFromTrace(trace);
        String summary = completion.text();

        List<ToolCallSummary> toolCalls = trace.stream().map(this::summarize).toList();
        AiInsight insight = save(AiFeatureType.AGENT_INVESTIGATION, AiInsightSeverity.INFO,
                "Investigacion AI: " + shorten(question, 110), summary,
                details(Map.of("question", question, "steps", steps, "evidence", evidence,
                        "confidence", confidence,
                        "toolsCalled", trace.stream().map(ToolCallTrace::name).toList())),
                from, to);
        return new InvestigationResponse(summary, evidence, steps, confidence, from, to,
                toolCalls, response(insight));
    }

    private List<String> stepsFromTrace(List<ToolCallTrace> trace) {
        if (trace.isEmpty()) {
            // Fallback path (no API key / provider misconfigured): the deterministic
            // text still ships in `summary`, but the UI's "Pasos" card would be empty.
            // Tell the user why instead of pretending the model investigated.
            return List.of("Sin acceso al LLM; se devolvio respuesta plantilla.");
        }
        List<String> steps = new ArrayList<>(trace.size());
        for (ToolCallTrace t : trace) {
            String argsCompact = t.arguments() == null ? "{}" : t.arguments().toString();
            steps.add("Consulte " + t.name() + " con " + argsCompact);
        }
        return steps;
    }

    private List<String> evidenceFromTrace(List<ToolCallTrace> trace) {
        if (trace.isEmpty()) {
            return List.of();
        }
        return trace.stream()
                .map(t -> t.name() + ": " + summarize(t).resultPreview())
                .toList();
    }

    /**
     * HIGH = the model meaningfully investigated (called 3+ distinct tools without
     * any returning an error). MEDIUM = some signal. LOW = no real tool work, either
     * fallback or every call errored. Distinct names matter more than call count so
     * three lookups against the same tool don't inflate confidence.
     */
    private String confidenceFromTrace(List<ToolCallTrace> trace) {
        long distinctOk = trace.stream()
                .filter(t -> t.result() != null && !t.result().has("error"))
                .map(ToolCallTrace::name)
                .distinct()
                .count();
        if (distinctOk >= 3) return "HIGH";
        if (distinctOk >= 1) return "MEDIUM";
        return "LOW";
    }

    @Transactional
    public TodayResponse today(LocalDate date) {
        // Brief (re-use existing logic; will fetch latest or generate)
        AiInsightResponse brief = dailyBrief(date, false);

        // Run + collect alerts for the date (will return only newly created, but we want existing too)
        runAlerts(date, date);
        List<AiInsight> rawAlerts = insights.findByFeatureTypeAndStatusAndSourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
                AiFeatureType.ANOMALY_ALERT, AiInsightStatus.NEW, date, date);
        List<AiInsightResponse> alerts = rawAlerts.stream().map(this::response).toList();
        int critical = (int) alerts.stream().filter(a -> a.severity() == AiInsightSeverity.CRITICAL).count();
        int warning = (int) alerts.stream().filter(a -> a.severity() == AiInsightSeverity.WARNING).count();

        // Summary numbers
        DailySummaryResponse day = reports.get(date);
        TodaySummary summary = new TodaySummary(
                day.carsWashed(),
                day.ticketRevenue(),
                day.expensesTotal(),
                day.result(),
                day.cashVariance());

        // Previous day for delta context
        TodaySummary previousDay = null;
        try {
            DailySummaryResponse prev = reports.get(date.minusDays(1));
            previousDay = new TodaySummary(
                    prev.carsWashed(),
                    prev.ticketRevenue(),
                    prev.expensesTotal(),
                    prev.result(),
                    prev.cashVariance());
        } catch (Exception ignore) {
            // no previous day data — leave null, frontend handles gracefully
        }

        return new TodayResponse(date, brief, alerts, critical, warning, summary, previousDay);
    }

    @Transactional(readOnly = true)
    public QuickPromptsResponse quickPrompts() {
        return new QuickPromptsResponse(List.of(
                new PromptCategory("resumen", "Resumen", "📊", List.of(
                        "¿Cómo fue el día de hoy?",
                        "¿Cuánto entró en efectivo vs tarjeta?",
                        "¿Cuál fue el resultado del día?",
                        "Compara este día con el promedio"
                )),
                new PromptCategory("lavadores", "Lavadores", "👤", List.of(
                        "¿Quién lavó más carros hoy?",
                        "¿Hay lavadores con pocos tickets?",
                        "Compara el rendimiento de los lavadores",
                        "¿Cuántos carros le toca a cada lavador?"
                )),
                new PromptCategory("caja", "Caja", "💵", List.of(
                        "¿Hubo faltante o sobrante hoy?",
                        "¿En qué turno hubo más diferencia?",
                        "¿Cuál es el patrón de diferencias últimamente?"
                )),
                new PromptCategory("inventario", "Inventario", "📦", List.of(
                        "¿Qué productos están bajos?",
                        "¿Qué aroma se vendió más?",
                        "¿Cómo van los snacks este mes?"
                )),
                new PromptCategory("tendencias", "Tendencias", "📈", List.of(
                        "¿Esta semana fue mejor o peor que la pasada?",
                        "¿Qué día tuvo más ingresos?",
                        "¿Por qué bajaron los ingresos?",
                        "¿Subieron los gastos comparado con el mes pasado?"
                ))
        ));
    }

    private List<AlertCandidate> alertCandidates(LocalDate from, LocalDate to) {
        DailySummaryRangeResponse current = reports.getRange(from, to);
        LocalDate previousFrom = from.minusDays(Math.max(7, ChronoUnit.DAYS.between(from, to) + 1L));
        LocalDate previousTo = from.minusDays(1);
        DailySummaryRangeResponse previous = reports.getRange(previousFrom, previousTo);
        CashVarianceResponse cash = reports.cashVariance(from, to);
        InventorySnapshotResponse stock = inventory.snapshot(Instant.now());
        List<AlertCandidate> candidates = new ArrayList<>();

        if (cash.variance() != null && cash.variance().abs().compareTo(CASH_VARIANCE_THRESHOLD) >= 0) {
            candidates.add(new AlertCandidate(AiInsightSeverity.WARNING, "Diferencia de caja relevante",
                    "La diferencia acumulada de caja fue %s entre %s y %s.".formatted(
                            money(cash.variance()), from, to), Map.of("variance", cash.variance())));
        }
        BigDecimal previousExpenses = previous.expensesTotal().compareTo(ZERO) == 0 ? ZERO : previous.expensesTotal();
        if (previousExpenses.compareTo(ZERO) > 0
                && current.expensesTotal().compareTo(previousExpenses.multiply(SPIKE_MULTIPLIER)) > 0) {
            candidates.add(new AlertCandidate(AiInsightSeverity.WARNING, "Gastos arriba de lo normal",
                    "Las salidas subieron a %s contra %s del periodo anterior.".formatted(
                            money(current.expensesTotal()), money(previousExpenses)),
                    Map.of("currentExpenses", current.expensesTotal(), "previousExpenses", previousExpenses)));
        }
        if (previous.ticketRevenue().compareTo(ZERO) > 0
                && current.ticketRevenue().compareTo(previous.ticketRevenue().multiply(DROP_MULTIPLIER)) < 0) {
            candidates.add(new AlertCandidate(AiInsightSeverity.CRITICAL, "Ingresos por debajo del promedio",
                    "Los ingresos bajaron a %s contra %s del periodo anterior.".formatted(
                            money(current.ticketRevenue()), money(previous.ticketRevenue())),
                    Map.of("currentRevenue", current.ticketRevenue(), "previousRevenue", previous.ticketRevenue())));
        }
        if (previous.carsWashed() > 0 && current.carsWashed() < Math.round(previous.carsWashed() * 0.75)) {
            candidates.add(new AlertCandidate(AiInsightSeverity.WARNING, "Menos carros lavados",
                    "Se lavaron %d carros contra %d del periodo anterior.".formatted(
                            current.carsWashed(), previous.carsWashed()),
                    Map.of("currentCars", current.carsWashed(), "previousCars", previous.carsWashed())));
        }
        if (current.courtesyCount() >= 5 || current.voidedCount() >= 3) {
            candidates.add(new AlertCandidate(AiInsightSeverity.WARNING, "Cortesias o cancelaciones elevadas",
                    "Hubo %d cortesias y %d tickets cancelados en el rango.".formatted(
                            current.courtesyCount(), current.voidedCount()),
                    Map.of("courtesyCount", current.courtesyCount(), "voidedCount", current.voidedCount())));
        }
        for (ProductSnapshotResponse item : lowStock(stock)) {
            candidates.add(new AlertCandidate(AiInsightSeverity.INFO, "Inventario bajo: " + item.product().name(),
                    "%s esta en %s unidades disponibles.".formatted(
                            item.product().name(), number(item.quantityOnHand())),
                    Map.of("productId", item.product().id(), "quantityOnHand", item.quantityOnHand())));
        }

        // ── Actor-based fraud patterns from audit events ─────────────
        Instant startInstant = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant endInstant = to.plusDays(1).atStartOfDay().minusNanos(1).toInstant(ZoneOffset.UTC);
        List<AuditEvent> auditInRange = auditEvents.findByOccurredAtBetweenOrderByOccurredAtAsc(startInstant, endInstant);

        Map<String, Integer> courtesyByActor = new HashMap<>();
        Map<String, Integer> withdrawalByActor = new HashMap<>();
        Map<Long, Instant> ticketCreatedAt = new HashMap<>();
        List<AuditEvent> lateEdits = new ArrayList<>();

        for (AuditEvent e : auditInRange) {
            String actor = e.getActorUsername() == null ? "system" : e.getActorUsername();
            switch (e.getAction()) {
                case "TICKET_COURTESY" -> courtesyByActor.merge(actor, 1, Integer::sum);
                case "WITHDRAWAL_CREATED" -> withdrawalByActor.merge(actor, 1, Integer::sum);
                case "TICKET_CREATED" -> {
                    if (e.getEntityId() != null) ticketCreatedAt.put(e.getEntityId(), e.getOccurredAt());
                }
                case "TICKET_EDITED" -> {
                    if (e.getEntityId() != null) {
                        Instant t0 = ticketCreatedAt.get(e.getEntityId());
                        if (t0 != null && Duration.between(t0, e.getOccurredAt()).toMinutes() > LATE_EDIT_MINUTES) {
                            lateEdits.add(e);
                        }
                    }
                }
                default -> { /* ignored */ }
            }
        }

        courtesyByActor.entrySet().stream()
                .filter(en -> en.getValue() >= ACTOR_COURTESY_THRESHOLD)
                .forEach(en -> candidates.add(new AlertCandidate(AiInsightSeverity.WARNING,
                        "Cortesías concentradas en un usuario: " + en.getKey(),
                        "%s registró %d cortesías entre %s y %s. Revisa que cada una tenga razón válida."
                                .formatted(en.getKey(), en.getValue(), from, to),
                        Map.of("actor", en.getKey(), "courtesyCount", en.getValue()))));

        withdrawalByActor.entrySet().stream()
                .filter(en -> en.getValue() >= ACTOR_WITHDRAWAL_THRESHOLD)
                .forEach(en -> candidates.add(new AlertCandidate(AiInsightSeverity.WARNING,
                        "Retiros frecuentes por: " + en.getKey(),
                        "%s registró %d retiros entre %s y %s. Verifica los motivos y montos."
                                .formatted(en.getKey(), en.getValue(), from, to),
                        Map.of("actor", en.getKey(), "withdrawalCount", en.getValue()))));

        if (!lateEdits.isEmpty()) {
            int n = lateEdits.size();
            String actors = lateEdits.stream()
                    .map(e -> e.getActorUsername() == null ? "system" : e.getActorUsername())
                    .distinct()
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");
            candidates.add(new AlertCandidate(AiInsightSeverity.CRITICAL,
                    "Tickets editados después de " + LATE_EDIT_MINUTES + " min",
                    "%d ticket%s editad%s tarde por %s. Posible ajuste retroactivo de precio."
                            .formatted(n, n == 1 ? "" : "s", n == 1 ? "o" : "os", actors),
                    Map.of("count", n, "actors", actors)));
        }

        return candidates;
    }

    private List<ProductSnapshotResponse> lowStock(InventorySnapshotResponse stock) {
        return stock.products().stream()
                .filter(item -> item.product().trackInventory())
                .filter(item -> item.quantityOnHand().compareTo(LOW_INVENTORY_THRESHOLD) <= 0)
                .sorted(Comparator.comparing(ProductSnapshotResponse::quantityOnHand))
                .toList();
    }

    private List<String> supportNumbers(DailySummaryRangeResponse range, CashVarianceResponse cash,
            EmployeePerformanceResponse performance) {
        List<String> numbers = new ArrayList<>();
        numbers.add("Rango %s a %s: %d carros, %s ingresos, %s salidas, %s resultado.".formatted(
                range.from(), range.to(), range.carsWashed(), money(range.ticketRevenue()),
                money(range.expensesTotal()), money(range.result())));
        numbers.add("Caja: esperado %s, contado %s, diferencia %s.".formatted(
                money(cash.expectedCash()), money(cash.totalCounted()), money(cash.variance())));
        performance.employees().stream().findFirst().ifPresent(employee -> numbers.add(
                "Lavador lider: %s con %s carros acreditados y %d tickets.".formatted(
                        employee.employeeName(), number(employee.carsWashed()), employee.ticketCount())));
        return numbers;
    }

    private String answerFor(String message, DailySummaryRangeResponse range, CashVarianceResponse cash,
            EmployeePerformanceResponse performance) {
        String lower = message.toLowerCase();
        if (lower.contains("lavador") || lower.contains("empleado")) {
            return performance.employees().stream().findFirst()
                    .map(employee -> "%s lidera el rango con %s carros acreditados y %s de ingreso referencia.".formatted(
                            employee.employeeName(), number(employee.carsWashed()), money(employee.ticketRevenue())))
                    .orElse("No hay lavadores con tickets activos en el rango.");
        }
        if (lower.contains("caja") || lower.contains("diferencia")) {
            return "La diferencia de caja del rango es %s. Revisa los cortes con mayor variacion antes de cerrar conclusiones."
                    .formatted(money(cash.variance()));
        }
        if (lower.contains("bajo") || lower.contains("menos") || lower.contains("why")) {
            return "El rango tuvo %d carros y %s de ingresos. La primera revision debe comparar carros, gastos y diferencia de caja."
                    .formatted(range.carsWashed(), money(range.ticketRevenue()));
        }
        return "En el rango seleccionado hubo %d carros, %s de ingresos, %s de salidas y %s de resultado."
                .formatted(range.carsWashed(), money(range.ticketRevenue()), money(range.expensesTotal()),
                        money(range.result()));
    }

    private HistoricalRangeResponse safeHistorical(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            return new HistoricalRangeResponse(from, to, 0, 0, ZERO, ZERO, ZERO, List.of());
        }
        return reports.getHistorical(from, to);
    }

    private AiInsight save(AiFeatureType featureType, AiInsightSeverity severity, String title, String summary,
            String detailsJson, LocalDate sourceFrom, LocalDate sourceTo) {
        return insights.save(new AiInsight(featureType, severity, shorten(title, 160), summary,
                detailsJson, sourceFrom, sourceTo, aiProvider.name()));
    }

    private AiInsight get(Long id) {
        return insights.findById(id).orElseThrow(() -> new EntityNotFoundException("AI insight not found"));
    }

    private AiInsightResponse response(AiInsight insight) {
        return AiInsightResponse.from(insight, readDetails(insight.getDetailsJson()));
    }

    private JsonNode readDetails(String detailsJson) {
        try {
            return objectMapper.readTree(detailsJson);
        } catch (JsonProcessingException ex) {
            return objectMapper.createObjectNode();
        }
    }

    private String details(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not serialize AI details", ex);
        }
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("Date range is invalid");
        }
    }

    private BigDecimal averageCars(HistoricalRangeResponse history) {
        if (history.totalDays() == 0) {
            return ZERO;
        }
        return BigDecimal.valueOf(history.totalCars()).divide(BigDecimal.valueOf(history.totalDays()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal averageRevenue(HistoricalRangeResponse history) {
        if (history.totalDays() == 0) {
            return ZERO;
        }
        return history.totalRevenue().divide(BigDecimal.valueOf(history.totalDays()), 2, RoundingMode.HALF_UP);
    }

    private String money(BigDecimal value) {
        BigDecimal safe = value == null ? ZERO : value;
        return "$" + safe.setScale(2, RoundingMode.HALF_UP) + " MXN";
    }

    private String number(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String shorten(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max - 3) + "...";
    }

    private record AlertCandidate(AiInsightSeverity severity, String title, String summary, Map<String, Object> details) {
    }
}
