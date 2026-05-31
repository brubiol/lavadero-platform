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

class Phase5MoneyIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_create_and_filter_expenses_with_categories() throws Exception {
        Fixture fixture = fixture("P5A", LocalDate.of(2026, 9, 1));

        mvc.perform(post("/api/v1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "expenseDate": "2026-09-01",
                                  "category": "CFE",
                                  "amount": 100.50,
                                  "description": "Recibo luz"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("CFE"))
                .andExpect(jsonPath("$.amount").value(100.50))
                .andExpect(jsonPath("$.expenseDate").value("2026-09-01"));

        mvc.perform(get("/api/v1/expenses?from=2026-09-01&to=2026-09-01&category=CFE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void should_reject_non_positive_withdrawal_amount() throws Exception {
        mvc.perform(post("/api/v1/withdrawals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "withdrawalDate": "2026-09-02",
                                  "amount": 0,
                                  "reason": "Retiro"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_create_withdrawal_and_employee_advance_and_filter_by_employee() throws Exception {
        Fixture fixture = fixture("P5B", LocalDate.of(2026, 9, 3));

        mvc.perform(post("/api/v1/withdrawals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "withdrawalDate": "2026-09-03",
                                  "amount": 80.00,
                                  "reason": "Retiro dueno"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(80.00));

        mvc.perform(post("/api/v1/employee-advances")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "employeeId": %d,
                                  "advanceDate": "2026-09-03",
                                  "amount": 60.00,
                                  "reason": "Prestamo semanal"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.employeeId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeId").value(fixture.employeeId()))
                .andExpect(jsonPath("$.amount").value(60.00));

        mvc.perform(get("/api/v1/employee-advances?employee_id=%d&from=2026-09-03&to=2026-09-03"
                        .formatted(fixture.employeeId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void should_require_employee_for_advance() throws Exception {
        mvc.perform(post("/api/v1/employee-advances")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "advanceDate": "2026-09-04",
                                  "amount": 50.00,
                                  "reason": "Sin empleado"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_subtract_gastos_from_result_and_track_retiros_and_prestamos_separately() throws Exception {
        Fixture fixture = fixture("P5C", LocalDate.of(2026, 9, 5));
        createTicket(fixture);
        createExpense(fixture, "MATERIAL", "25.00");
        createWithdrawal(fixture, "30.00");
        createAdvance(fixture, "15.00");

        // Resultado is true operating profit: revenue − gastos (incl. nomina) − COGS.
        // Retiros are cash moves and prestamos are loans, so they are reported
        // separately but do NOT reduce the result.
        mvc.perform(get("/api/v1/reports/daily-summary?date=2026-09-05"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carsWashed").value(1))
                .andExpect(jsonPath("$.ticketRevenue").value(200.00))
                .andExpect(jsonPath("$.expensesTotal").value(25.00))
                .andExpect(jsonPath("$.withdrawalsTotal").value(30.00))
                .andExpect(jsonPath("$.advancesTotal").value(15.00))
                .andExpect(jsonPath("$.inventoryPurchaseCost").value(0))
                .andExpect(jsonPath("$.result").value(175.00));
    }

    private Fixture fixture(String prefix, LocalDate businessDate) throws Exception {
        Long employeeId = createEmployee(prefix + " Lavador");
        Long serviceTypeId = createServiceType(prefix + "_LAVADO", prefix + " Lavado");
        Long vehicleSizeId = createVehicleSize(prefix + "_MEDIANO", prefix + " Mediano");
        createServicePrice(serviceTypeId, vehicleSizeId, "MXN", "200.00", businessDate.minusDays(1).toString());
        Long businessDayId = openBusinessDay(businessDate);
        Long shiftId = openShift(businessDayId);
        return new Fixture(businessDayId, shiftId, employeeId, serviceTypeId, vehicleSizeId);
    }

    private Long createEmployee(String fullName) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "%s"}
                                """.formatted(fullName)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long createServiceType(String code, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/service-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "%s", "name": "%s"}
                                """.formatted(code, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long createVehicleSize(String code, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/vehicle-sizes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "%s", "name": "%s", "sortOrder": 1}
                                """.formatted(code, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private void createServicePrice(Long serviceTypeId, Long vehicleSizeId, String currency, String amount,
            String effectiveFrom) throws Exception {
        mvc.perform(post("/api/v1/service-prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "amount": %s,
                                  "currency": "%s",
                                  "effectiveFrom": "%s"
                                }
                                """.formatted(serviceTypeId, vehicleSizeId, amount, currency, effectiveFrom)))
                .andExpect(status().isCreated());
    }

    private Long openBusinessDay(LocalDate businessDate) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/business-days/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessDate": "%s"}
                                """.formatted(businessDate)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long openShift(Long businessDayId) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/shifts/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessDayId": %d, "shiftType": "MATUTINO"}
                                """.formatted(businessDayId)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private void createTicket(Fixture fixture) throws Exception {
        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "MXN",
                                  "vehicleDescription": "Prueba",
                                  "courtesy": false,
                                  "employeeIds": [%d]
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.serviceTypeId(),
                                fixture.vehicleSizeId(), fixture.employeeId())))
                .andExpect(status().isCreated());
    }

    private void createExpense(Fixture fixture, String category, String amount) throws Exception {
        mvc.perform(post("/api/v1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "expenseDate": "2026-09-05",
                                  "category": "%s",
                                  "amount": %s
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), category, amount)))
                .andExpect(status().isCreated());
    }

    private void createWithdrawal(Fixture fixture, String amount) throws Exception {
        mvc.perform(post("/api/v1/withdrawals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "withdrawalDate": "2026-09-05",
                                  "amount": %s
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), amount)))
                .andExpect(status().isCreated());
    }

    private void createAdvance(Fixture fixture, String amount) throws Exception {
        mvc.perform(post("/api/v1/employee-advances")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "employeeId": %d,
                                  "advanceDate": "2026-09-05",
                                  "amount": %s
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.employeeId(), amount)))
                .andExpect(status().isCreated());
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private record Fixture(Long businessDayId, Long shiftId, Long employeeId, Long serviceTypeId, Long vehicleSizeId) {
    }
}
