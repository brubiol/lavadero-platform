package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end flows that mirror what the encargado records in the daily Excel sheet.
 *
 * Each test covers one operational pattern:
 *   - ticket registro (autos, lavadores, precios, nota number)
 *   - cortesía (zero-price comp tickets)
 *   - corte exacto (cash count matches expected — zero variance)
 *   - faltante en corte (short cash requires a closing explanation)
 *   - préstamo a lavador (employee advance visible in daily summary)
 *   - día de turno doble (matutino + vespertino aggregated in daily summary)
 *
 * All dates are in 2027 to avoid collisions with Phase1–Phase10 fixtures (2026).
 */
class ExcelOperationFlowsIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    // ── Flow 1: Ticket lifecycle ──────────────────────────────────────────────
    // Maps to: each row in the daily sheet — nota number, precio catálogo,
    // asignaciones por lavador, anulación.

    @Test
    void should_create_ticket_with_catalog_price_nota_number_and_equal_share_assignments()
            throws Exception {
        LocalDate date = LocalDate.of(2027, 3, 1);
        Fixture f = fixture("EF1", date);

        // Single lavador — 100% share, price resolved from catalog
        MvcResult t1 = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, f.emp1())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priceAmount").value(180.00))
                .andExpect(jsonPath("$.currency").value("MXN"))
                .andExpect(jsonPath("$.notaNumber").value("20270301-0001"))
                .andExpect(jsonPath("$.assignments", hasSize(1)))
                .andExpect(jsonPath("$.assignments[0].sharePct").value(100.00))
                .andReturn();

        Long ticketId1 = idFrom(t1);

        // Two lavadores — equal 50/50 split
        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, f.emp1(), f.emp2())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.notaNumber").value("20270301-0002"))
                .andExpect(jsonPath("$.assignments", hasSize(2)))
                .andExpect(jsonPath("$.assignments[0].sharePct").value(50.00))
                .andExpect(jsonPath("$.assignments[1].sharePct").value(50.00));

        // Void ticket 1
        mvc.perform(post("/api/v1/tickets/{id}/void", ticketId1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"Capturado por error"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VOIDED"));

        // Default list (ACTIVE) excludes voided ticket
        mvc.perform(get("/api/v1/tickets?business_day_id={id}", f.bdId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // VOIDED filter shows it
        mvc.perform(get("/api/v1/tickets?business_day_id={id}&status=VOIDED", f.bdId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(ticketId1));
    }

    // ── Flow 2: Cortesía ──────────────────────────────────────────────────────
    // Maps to: cortesías column — comps to owner/family, $0 revenue.

    @Test
    void should_require_courtesy_reason_and_set_price_to_zero() throws Exception {
        LocalDate date = LocalDate.of(2027, 3, 2);
        Fixture f = fixture("EF2", date);

        // No courtesy reason → 400
        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "MXN",
                                  "courtesy": true,
                                  "courtesyReason": null,
                                  "employeeIds": [%d]
                                }
                                """.formatted(f.bdId(), f.shiftId(), f.svcId(), f.sizeId(), f.emp1())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("courtesyReason is required for courtesy tickets"));

        // With reason → price is $0
        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, true, "Dueno del negocio", f.emp1())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priceAmount").value(0))
                .andExpect(jsonPath("$.courtesy").value(true))
                .andExpect(jsonPath("$.courtesyReason").value("Dueno del negocio"));
    }

    // ── Flow 3: Corte exacto ──────────────────────────────────────────────────
    // Maps to: denomination breakdown at the bottom of the daily sheet.
    // Ticket $200 − gasto $25 − retiro $30 = efectivo esperado $145.
    // Conteo exacto → variante $0.

    @Test
    void should_close_shift_with_exact_cash_match_and_zero_variance() throws Exception {
        LocalDate date = LocalDate.of(2027, 3, 3);
        Fixture f = fixture("EF3", date, "200.00");

        createTicket(f, f.emp1());
        createExpense(f, "25.00", "MATERIAL", "Material de limpieza");
        createWithdrawal(f, "30.00", "Retiro encargado");

        // Pre-close summary — math check
        mvc.perform(get("/api/v1/shifts/{id}/close-summary", f.shiftId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketRevenue").value(200.00))
                .andExpect(jsonPath("$.expensesTotal").value(25.00))
                .andExpect(jsonPath("$.withdrawalsTotal").value(30.00))
                .andExpect(jsonPath("$.expectedCash").value(145.00));

        // 1×$100 + 2×$20 + 1×$5 = $145
        Long ccId = createCashCount(f.shiftId(), 1, 0, 2, 1, 0, 0);

        mvc.perform(post("/api/v1/shifts/{id}/close", f.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d}
                                """.formatted(ccId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closed").value(true))
                .andExpect(jsonPath("$.variance").value(0.00))
                .andExpect(jsonPath("$.shiftStatus").value("CLOSED"));
    }

    // ── Flow 4: Faltante en corte ─────────────────────────────────────────────
    // Maps to: sobrante/faltante cell — negative variance means the encargado
    // must explain before the day can be closed.

    @Test
    void should_require_closing_reason_when_shift_has_faltante() throws Exception {
        LocalDate date = LocalDate.of(2027, 3, 4);
        Fixture f = fixture("EF4", date, "200.00");

        createTicket(f, f.emp1());
        createExpense(f, "25.00", "MATERIAL", null);
        createWithdrawal(f, "30.00", null);

        // 1×$100 + 2×$20 = $140 — faltante of $5
        Long ccId = createCashCount(f.shiftId(), 1, 0, 2, 0, 0, 0);

        // Without reason → 400
        mvc.perform(post("/api/v1/shifts/{id}/close", f.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d}
                                """.formatted(ccId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("closingReason is required when cash is short"));

        // With reason → closes with variance = -5
        mvc.perform(post("/api/v1/shifts/{id}/close", f.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d, "closingReason": "Falto cambio en caja"}
                                """.formatted(ccId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closed").value(true))
                .andExpect(jsonPath("$.variance").value(-5.00))
                .andExpect(jsonPath("$.closingReason").value("Falto cambio en caja"));
    }

    // ── Flow 5: Préstamo a lavador ────────────────────────────────────────────
    // Maps to: prestamos section rows 30–34 in the daily sheet.
    // Advance recorded → appears in ledger list + advancesTotal in daily summary.

    @Test
    void should_record_employee_advance_and_reflect_in_daily_summary() throws Exception {
        LocalDate date = LocalDate.of(2027, 3, 5);
        Fixture f = fixture("EF5", date);

        mvc.perform(post("/api/v1/employee-advances")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "employeeId": %d,
                                  "advanceDate": "%s",
                                  "amount": 300.00,
                                  "reason": "Prestamo urgente"
                                }
                                """.formatted(f.bdId(), f.shiftId(), f.emp1(), date)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(300.00))
                .andExpect(jsonPath("$.employeeId").value(f.emp1()));

        // Ledger filtered by employee + date range
        mvc.perform(get("/api/v1/employee-advances?employee_id={e}&from={d}&to={d}",
                        f.emp1(), date, date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].amount").value(300.00));

        // Range endpoint includes advancesTotal (single-day summary does not)
        mvc.perform(get("/api/v1/reports/daily-summary?from={d}&to={d}", date, date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.advancesTotal").value(300.00));
    }

    // ── Flow 6: Día de turno doble ────────────────────────────────────────────
    // Maps to: matutino + vespertino columns in the daily sheet — both turno
    // subtotals aggregate into a single día total in the daily summary.

    @Test
    void should_aggregate_dual_shift_ticket_totals_in_daily_summary() throws Exception {
        LocalDate date = LocalDate.of(2027, 3, 6);

        Long empId = createEmployee("EF6 Ana");
        Long svcId = createServiceType("EF6_LAV", "EF6 Lavado");
        Long sizeId = createVehicleSize("EF6_MED", "EF6 Mediano");
        createServicePrice(svcId, sizeId, "MXN", "180.00", date.minusDays(1).toString());
        Long bdId = openBusinessDay(date);

        // MATUTINO: 2 tickets @ $180 = $360
        Long matId = openShift(bdId, "MATUTINO");
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/v1/tickets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(singleEmployeeTicketJson(bdId, matId, svcId, sizeId, "MXN", empId)))
                    .andExpect(status().isCreated());
        }

        // VESPERTINO: 1 ticket @ $180 = $180
        Long vesId = openShift(bdId, "VESPERTINO");
        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(singleEmployeeTicketJson(bdId, vesId, svcId, sizeId, "MXN", empId)))
                .andExpect(status().isCreated());

        // Daily summary: both shifts combined → 3 autos, $540
        mvc.perform(get("/api/v1/reports/daily-summary?date={d}", date))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carsWashed").value(3))
                .andExpect(jsonPath("$.ticketRevenue").value(540.00));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Helpers
    // ═════════════════════════════════════════════════════════════════════════

    private record Fixture(Long bdId, Long shiftId, Long svcId, Long sizeId, Long emp1, Long emp2,
            LocalDate date) {}

    private Fixture fixture(String prefix, LocalDate date) throws Exception {
        return fixture(prefix, date, "180.00");
    }

    private Fixture fixture(String prefix, LocalDate date, String price) throws Exception {
        Long emp1 = createEmployee(prefix + " Juan");
        Long emp2 = createEmployee(prefix + " Luis");
        Long svc  = createServiceType(prefix + "_LAV", prefix + " Lavado");
        Long size = createVehicleSize(prefix + "_MED", prefix + " Mediano");
        createServicePrice(svc, size, "MXN", price, date.minusDays(1).toString());
        Long bd    = openBusinessDay(date);
        Long shift = openShift(bd, "MATUTINO");
        return new Fixture(bd, shift, svc, size, emp1, emp2, date);
    }

    private Long createEmployee(String fullName) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "%s", "baseWeeklySalary": 1200}
                                """.formatted(fullName)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(r);
    }

    private Long createServiceType(String code, String name) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/service-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "%s", "name": "%s"}
                                """.formatted(code, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(r);
    }

    private Long createVehicleSize(String code, String name) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/vehicle-sizes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "%s", "name": "%s", "sortOrder": 1}
                                """.formatted(code, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(r);
    }

    private void createServicePrice(Long svcId, Long sizeId, String currency,
            String amount, String effectiveFrom) throws Exception {
        mvc.perform(post("/api/v1/service-prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "%s",
                                  "amount": %s,
                                  "effectiveFrom": "%s"
                                }
                                """.formatted(svcId, sizeId, currency, amount, effectiveFrom)))
                .andExpect(status().isCreated());
    }

    private Long openBusinessDay(LocalDate date) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/business-days/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessDate": "%s"}
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(r);
    }

    private Long openShift(Long bdId, String shiftType) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/shifts/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessDayId": %d, "shiftType": "%s"}
                                """.formatted(bdId, shiftType)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(r);
    }

    private void createTicket(Fixture f, Long... empIds) throws Exception {
        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, empIds)))
                .andExpect(status().isCreated());
    }

    private void createExpense(Fixture f, String amount, String category, String description)
            throws Exception {
        String descJson = description == null ? "null" : "\"" + description + "\"";
        mvc.perform(post("/api/v1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "expenseDate": "%s",
                                  "category": "%s",
                                  "amount": %s,
                                  "description": %s
                                }
                                """.formatted(f.bdId(), f.shiftId(), f.date(), category, amount, descJson)))
                .andExpect(status().isCreated());
    }

    private void createWithdrawal(Fixture f, String amount, String reason) throws Exception {
        String reasonJson = reason == null ? "null" : "\"" + reason + "\"";
        mvc.perform(post("/api/v1/withdrawals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "withdrawalDate": "%s",
                                  "amount": %s,
                                  "reason": %s
                                }
                                """.formatted(f.bdId(), f.shiftId(), f.date(), amount, reasonJson)))
                .andExpect(status().isCreated());
    }

    /** bills100, bills50, bills20, coins5, coins2, coins1 → total counted */
    private Long createCashCount(Long shiftId,
            int bills100, int bills50, int bills20,
            int coins5, int coins2, int coins1) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/cash-counts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "shiftId": %d,
                                  "currency": "MXN",
                                  "bills100": %d,
                                  "bills50": %d,
                                  "bills20": %d,
                                  "coins5": %d,
                                  "coins2": %d,
                                  "coins1": %d,
                                  "morrallaTotal": 0
                                }
                                """.formatted(shiftId, bills100, bills50, bills20, coins5, coins2, coins1)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(r);
    }

    private String ticketJson(Fixture f, boolean courtesy, String courtesyReason, Long... empIds) {
        String emps = java.util.Arrays.stream(empIds)
                .map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
        String reason = courtesyReason == null ? "null" : "\"" + courtesyReason + "\"";
        return """
                {
                  "businessDayId": %d,
                  "shiftId": %d,
                  "serviceTypeId": %d,
                  "vehicleSizeId": %d,
                  "currency": "MXN",
                  "courtesy": %s,
                  "courtesyReason": %s,
                  "employeeIds": [%s]
                }
                """.formatted(f.bdId(), f.shiftId(), f.svcId(), f.sizeId(),
                courtesy, reason, emps);
    }

    private String singleEmployeeTicketJson(Long bdId, Long shiftId, Long svcId, Long sizeId,
            String currency, Long empId) {
        return """
                {
                  "businessDayId": %d,
                  "shiftId": %d,
                  "serviceTypeId": %d,
                  "vehicleSizeId": %d,
                  "currency": "%s",
                  "courtesy": false,
                  "employeeIds": [%d]
                }
                """.formatted(bdId, shiftId, svcId, sizeId, currency, empId);
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }
}
