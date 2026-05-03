package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase6ShiftCloseIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_close_shift_with_exact_cash_match() throws Exception {
        Fixture fixture = fixture("P6A", LocalDate.of(2026, 10, 1));
        createTicket(fixture);
        createExpense(fixture, "25.00");
        createWithdrawal(fixture, "30.00");
        Long cashCountId = createCashCount(fixture.shiftId(), 1, 0, 2, 1, 0);

        mvc.perform(get("/api/v1/shifts/{id}/close-summary", fixture.shiftId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketRevenue").value(200.00))
                .andExpect(jsonPath("$.expensesTotal").value(25.00))
                .andExpect(jsonPath("$.withdrawalsTotal").value(30.00))
                .andExpect(jsonPath("$.expectedCash").value(145.00))
                .andExpect(jsonPath("$.totalCounted").value(145.00))
                .andExpect(jsonPath("$.variance").value(0.00));

        mvc.perform(post("/api/v1/shifts/{id}/close", fixture.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d}
                                """.formatted(cashCountId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closed").value(true))
                .andExpect(jsonPath("$.shiftStatus").value("CLOSED"))
                .andExpect(jsonPath("$.variance").value(0.00));
    }

    @Test
    void should_close_shift_with_sobrante_without_reason() throws Exception {
        Fixture fixture = fixture("P6B", LocalDate.of(2026, 10, 2));
        createTicket(fixture);
        createExpense(fixture, "25.00");
        createWithdrawal(fixture, "30.00");
        Long cashCountId = createCashCount(fixture.shiftId(), 1, 0, 2, 1, 1);

        mvc.perform(post("/api/v1/shifts/{id}/close", fixture.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d}
                                """.formatted(cashCountId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expectedCash").value(145.00))
                .andExpect(jsonPath("$.totalCounted").value(155.00))
                .andExpect(jsonPath("$.variance").value(10.00));
    }

    @Test
    void should_require_reason_for_faltante() throws Exception {
        Fixture fixture = fixture("P6C", LocalDate.of(2026, 10, 3));
        createTicket(fixture);
        createExpense(fixture, "25.00");
        createWithdrawal(fixture, "30.00");
        Long cashCountId = createCashCount(fixture.shiftId(), 1, 0, 2, 0, 0);

        mvc.perform(post("/api/v1/shifts/{id}/close", fixture.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d}
                                """.formatted(cashCountId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("closingReason is required when cash is short"));
    }

    @Test
    void should_close_faltante_with_reason_and_block_ticket_edits() throws Exception {
        Fixture fixture = fixture("P6D", LocalDate.of(2026, 10, 4));
        Long ticketId = createTicket(fixture);
        createExpense(fixture, "25.00");
        createWithdrawal(fixture, "30.00");
        Long cashCountId = createCashCount(fixture.shiftId(), 1, 0, 2, 0, 0);

        mvc.perform(post("/api/v1/shifts/{id}/close", fixture.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d, "closingReason": "Falto cambio en caja"}
                                """.formatted(cashCountId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variance").value(-5.00))
                .andExpect(jsonPath("$.closingReason").value("Falto cambio en caja"));

        mvc.perform(patch("/api/v1/tickets/{id}", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"vehicleDescription":"Edit after close"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Ticket can only be edited while shift is OPEN"));

        mvc.perform(get("/api/v1/reports/daily-summary?date=2026-10-04"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cashVariance").value(-5.00));
    }

    private Fixture fixture(String prefix, LocalDate businessDate) throws Exception {
        Long employeeId = createEmployee(prefix + " Lavador");
        Long serviceTypeId = createServiceType(prefix + "_LAVADO", prefix + " Lavado");
        Long vehicleSizeId = createVehicleSize(prefix + "_MEDIANO", prefix + " Mediano");
        createServicePrice(serviceTypeId, vehicleSizeId, "200.00", businessDate.minusDays(1).toString());
        Long businessDayId = openBusinessDay(businessDate);
        Long shiftId = openShift(businessDayId);
        return new Fixture(businessDate, businessDayId, shiftId, employeeId, serviceTypeId, vehicleSizeId);
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

    private void createServicePrice(Long serviceTypeId, Long vehicleSizeId, String amount, String effectiveFrom)
            throws Exception {
        mvc.perform(post("/api/v1/service-prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "amount": %s,
                                  "currency": "MXN",
                                  "effectiveFrom": "%s"
                                }
                                """.formatted(serviceTypeId, vehicleSizeId, amount, effectiveFrom)))
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

    private Long createTicket(Fixture fixture) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/tickets")
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
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private void createExpense(Fixture fixture, String amount) throws Exception {
        mvc.perform(post("/api/v1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "expenseDate": "%s",
                                  "category": "MATERIAL",
                                  "amount": %s,
                                  "description": "Material"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.businessDateString(),
                                amount)))
                .andExpect(status().isCreated());
    }

    private void createWithdrawal(Fixture fixture, String amount) throws Exception {
        mvc.perform(post("/api/v1/withdrawals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "withdrawalDate": "%s",
                                  "amount": %s,
                                  "reason": "Retiro"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.businessDateString(),
                                amount)))
                .andExpect(status().isCreated());
    }

    private Long createCashCount(Long shiftId, int bills100, int bills50, int bills20, int coins5, int coins10)
            throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/cash-counts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "shiftId": %d,
                                  "currency": "MXN",
                                  "bills100": %d,
                                  "bills50": %d,
                                  "bills20": %d,
                                  "coins10": %d,
                                  "coins5": %d,
                                  "morrallaTotal": 0
                                }
                                """.formatted(shiftId, bills100, bills50, bills20, coins10, coins5)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("id").asLong();
    }

    private record Fixture(LocalDate businessDate, Long businessDayId, Long shiftId, Long employeeId,
            Long serviceTypeId, Long vehicleSizeId) {
        String businessDateString() {
            return businessDate.toString();
        }
    }
}
