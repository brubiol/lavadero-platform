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

class Phase15AuditIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_record_audit_event_on_ticket_create() throws Exception {
        Fixture f = fixture("A15A", LocalDate.of(2028, 3, 1));

        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f)))
                .andExpect(status().isCreated())
                .andReturn();

        Long ticketId = idFrom(result);

        mvc.perform(get("/api/v1/audit-events?entityType=TICKET&entityId={id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].action").value("TICKET_CREATED"))
                .andExpect(jsonPath("$[0].entityType").value("TICKET"))
                .andExpect(jsonPath("$[0].entityId").value(ticketId));
    }

    @Test
    void should_record_audit_event_on_ticket_void() throws Exception {
        Fixture f = fixture("A15B", LocalDate.of(2028, 3, 2));

        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f)))
                .andExpect(status().isCreated())
                .andReturn();

        Long ticketId = idFrom(result);

        mvc.perform(post("/api/v1/tickets/{id}/void", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason": "Error de captura"}
                                """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/audit-events?entityType=TICKET&entityId={id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.action == 'TICKET_VOIDED')]", hasSize(1)))
                .andExpect(jsonPath("$[?(@.action == 'TICKET_VOIDED' && @.reason == 'Error de captura')]",
                        hasSize(1)));
    }

    @Test
    void should_filter_audit_events_by_entity_type() throws Exception {
        Fixture f = fixture("A15C", LocalDate.of(2028, 3, 3));

        MvcResult ticketResult = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f)))
                .andExpect(status().isCreated())
                .andReturn();

        Long ticketId = idFrom(ticketResult);

        // Create an expense on the same business day to produce a non-TICKET audit event
        mvc.perform(post("/api/v1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "expenseDate": "%s",
                                  "category": "MATERIAL",
                                  "description": "Jabon",
                                  "amount": 50.00,
                                  "currency": "MXN"
                                }
                                """.formatted(f.businessDayId(), f.shiftId(), LocalDate.of(2028, 3, 3))))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/audit-events?entityType=TICKET&entityId={id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.entityType != 'TICKET')]", hasSize(0)));
    }

    @Test
    void should_return_empty_when_date_range_excludes_events() throws Exception {
        Fixture f = fixture("A15D", LocalDate.of(2028, 3, 4));

        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f)))
                .andExpect(status().isCreated());

        // Query with a "from" date in the future — no events should match
        mvc.perform(get("/api/v1/audit-events?entityType=TICKET&from=2099-01-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Fixture fixture(String prefix, LocalDate date) throws Exception {
        Long employeeId = createEmployee(prefix + " Juan");
        Long serviceTypeId = createServiceType(prefix + "_SVC", prefix + " Servicio");
        Long vehicleSizeId = createVehicleSize(prefix + "_SIZE", prefix + " Tamano");
        createServicePrice(serviceTypeId, vehicleSizeId, "150.00", date.minusDays(1).toString());
        Long businessDayId = openBusinessDay(date);
        Long shiftId = openShift(businessDayId);
        return new Fixture(businessDayId, shiftId, serviceTypeId, vehicleSizeId, employeeId);
    }

    private String ticketJson(Fixture f) {
        return """
                {
                  "businessDayId": %d,
                  "shiftId": %d,
                  "serviceTypeId": %d,
                  "vehicleSizeId": %d,
                  "currency": "MXN",
                  "vehicleDescription": "Auto prueba",
                  "courtesy": false,
                  "employeeIds": [%d]
                }
                """.formatted(f.businessDayId(), f.shiftId(), f.serviceTypeId(), f.vehicleSizeId(), f.employeeId());
    }

    private Long createEmployee(String fullName) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "%s", "phone": "899-555-0101"}
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

    private Long openShift(Long businessDayId) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/shifts/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessDayId": %d, "shiftType": "MATUTINO"}
                                """.formatted(businessDayId)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(r);
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private record Fixture(Long businessDayId, Long shiftId, Long serviceTypeId, Long vehicleSizeId, Long employeeId) {
    }
}
