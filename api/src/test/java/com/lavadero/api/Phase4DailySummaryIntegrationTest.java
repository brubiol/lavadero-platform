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

class Phase4DailySummaryIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_return_empty_summary_for_day_without_tickets() throws Exception {
        mvc.perform(get("/api/v1/reports/daily-summary?date=2026-08-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-08-01"))
                .andExpect(jsonPath("$.carsWashed").value(0))
                .andExpect(jsonPath("$.ticketRevenue").value(0))
                .andExpect(jsonPath("$.expensesTotal").value(0))
                .andExpect(jsonPath("$.result").value(0))
                .andExpect(jsonPath("$.courtesyCount").value(0))
                .andExpect(jsonPath("$.voidedCount").value(0))
                .andExpect(jsonPath("$.recentTickets", hasSize(0)))
                .andExpect(jsonPath("$.cashVariance").doesNotExist());
    }

    @Test
    void should_summarize_active_courtesy_and_voided_tickets_for_date() throws Exception {
        LocalDate date = LocalDate.of(2026, 8, 2);
        Fixture fixture = fixture("T4A", date, "MXN", "120.00");
        Long paidTicketId = createTicket(fixture, false, null, fixture.employeeId());
        Long courtesyTicketId = createTicket(fixture, true, "Familia", fixture.employeeId());
        Long voidedTicketId = createTicket(fixture, false, null, fixture.employeeId());

        mvc.perform(post("/api/v1/tickets/{id}/void", voidedTicketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"Error de captura"}
                                """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/reports/daily-summary?date=2026-08-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carsWashed").value(2))
                .andExpect(jsonPath("$.ticketRevenue").value(120.00))
                .andExpect(jsonPath("$.expensesTotal").value(0))
                .andExpect(jsonPath("$.result").value(120.00))
                .andExpect(jsonPath("$.courtesyCount").value(1))
                .andExpect(jsonPath("$.voidedCount").value(1))
                .andExpect(jsonPath("$.recentTickets", hasSize(3)))
                .andExpect(jsonPath("$.recentTickets[?(@.id == %d)]".formatted(paidTicketId), hasSize(1)))
                .andExpect(jsonPath("$.recentTickets[?(@.id == %d)]".formatted(courtesyTicketId), hasSize(1)))
                .andExpect(jsonPath("$.recentTickets[?(@.id == %d)]".formatted(voidedTicketId), hasSize(1)));
    }

    private Fixture fixture(String prefix, LocalDate businessDate, String currency, String amount) throws Exception {
        Long employeeId = createEmployee(prefix + " Yurem");
        Long serviceTypeId = createServiceType(prefix + "_LAVADO", prefix + " Lavado");
        Long vehicleSizeId = createVehicleSize(prefix + "_CHICO", prefix + " Chico");
        createServicePrice(serviceTypeId, vehicleSizeId, currency, amount, businessDate.minusDays(1).toString());
        Long businessDayId = openBusinessDay(businessDate);
        Long shiftId = openShift(businessDayId);
        return new Fixture(businessDayId, shiftId, serviceTypeId, vehicleSizeId, currency, employeeId);
    }

    private Long createTicket(Fixture fixture, boolean courtesy, String courtesyReason, Long employeeId)
            throws Exception {
        String reasonJson = courtesyReason == null ? "null" : "\"" + courtesyReason + "\"";
        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "%s",
                                  "vehicleDescription": "Carro de prueba",
                                  "courtesy": %s,
                                  "courtesyReason": %s,
                                  "employeeIds": [%d]
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.serviceTypeId(),
                                fixture.vehicleSizeId(), fixture.currency(), courtesy, reasonJson, employeeId)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
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

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private record Fixture(Long businessDayId, Long shiftId, Long serviceTypeId, Long vehicleSizeId, String currency,
            Long employeeId) {
    }
}
