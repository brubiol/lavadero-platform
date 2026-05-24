package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.operations.repository.ShiftRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase2TicketIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    ShiftRepository shifts;

    @Test
    void should_create_normal_ticket_with_backend_price_and_assignments() throws Exception {
        Fixture fixture = fixture("T2A", LocalDate.of(2026, 7, 1), "MXN", "150.00");
        Long ticketId = createTicket(fixture, false, null, fixture.employeeOneId(), fixture.employeeTwoId());

        mvc.perform(get("/api/v1/tickets/{id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceAmount").value(150.00))
                .andExpect(jsonPath("$.currency").value("MXN"))
                .andExpect(jsonPath("$.dailySeq").value(1))
                .andExpect(jsonPath("$.notaNumber").value("20260701-0001"))
                .andExpect(jsonPath("$.assignments", hasSize(2)))
                .andExpect(jsonPath("$.assignments[0].sharePct").value(50.00))
                .andExpect(jsonPath("$.assignments[1].sharePct").value(50.00));
    }

    @Test
    void should_allow_courtesy_ticket_without_reason() throws Exception {
        Fixture fixture = fixture("T2B", LocalDate.of(2026, 7, 2), "MXN", "160.00");

        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(fixture, true, null, fixture.employeeOneId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priceAmount").value(0))
                .andExpect(jsonPath("$.courtesy").value(true));
    }

    @Test
    void should_create_courtesy_ticket_with_zero_price() throws Exception {
        Fixture fixture = fixture("T2C", LocalDate.of(2026, 7, 3), "MXN", "20.00");

        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(fixture, true, "Cliente dueno", fixture.employeeOneId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priceAmount").value(0))
                .andExpect(jsonPath("$.currency").value("MXN"))
                .andExpect(jsonPath("$.courtesy").value(true))
                .andExpect(jsonPath("$.courtesyReason").value("Cliente dueno"));
    }

    @Test
    void should_exclude_voided_ticket_from_default_ticket_list() throws Exception {
        Fixture fixture = fixture("T2D", LocalDate.of(2026, 7, 4), "MXN", "170.00");
        Long ticketId = createTicket(fixture, false, null, fixture.employeeOneId());

        mvc.perform(post("/api/v1/tickets/{id}/void", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"Capturado por error"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VOIDED"));

        mvc.perform(get("/api/v1/tickets?business_day_id=" + fixture.businessDayId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mvc.perform(get("/api/v1/tickets?business_day_id=" + fixture.businessDayId() + "&status=VOIDED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(ticketId));
    }

    @Test
    void should_allow_ticket_edit_when_shift_is_closed() throws Exception {
        Fixture fixture = fixture("T2E", LocalDate.of(2026, 7, 5), "MXN", "180.00");
        Long ticketId = createTicket(fixture, false, null, fixture.employeeOneId());
        var shift = shifts.findById(fixture.shiftId()).orElseThrow();
        shift.close();
        shifts.saveAndFlush(shift);

        mvc.perform(patch("/api/v1/tickets/{id}", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"vehicleDescription":"Sentra blanco"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.vehicleDescription").value("Sentra blanco"));
    }

    private Fixture fixture(String prefix, LocalDate businessDate, String currency, String amount) throws Exception {
        Long employeeOneId = createEmployee(prefix + " Juan");
        Long employeeTwoId = createEmployee(prefix + " Luis");
        Long serviceTypeId = createServiceType(prefix + "_LAVADO", prefix + " Lavado");
        Long vehicleSizeId = createVehicleSize(prefix + "_MEDIANO", prefix + " Mediano");
        createServicePrice(serviceTypeId, vehicleSizeId, currency, amount, businessDate.minusDays(1).toString());
        Long businessDayId = openBusinessDay(businessDate);
        Long shiftId = openShift(businessDayId);
        return new Fixture(businessDayId, shiftId, serviceTypeId, vehicleSizeId, currency, employeeOneId, employeeTwoId);
    }

    private Long createTicket(Fixture fixture, boolean courtesy, String courtesyReason, Long... employeeIds)
            throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(fixture, courtesy, courtesyReason, employeeIds)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private String ticketJson(Fixture fixture, boolean courtesy, String courtesyReason, Long... employeeIds) {
        String employeeJson = java.util.Arrays.stream(employeeIds)
                .map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
        String reasonJson = courtesyReason == null ? "null" : "\"" + courtesyReason + "\"";
        return """
                {
                  "businessDayId": %d,
                  "shiftId": %d,
                  "serviceTypeId": %d,
                  "vehicleSizeId": %d,
                  "currency": "%s",
                  "vehicleDescription": "Tsuru rojo",
                  "courtesy": %s,
                  "courtesyReason": %s,
                  "employeeIds": [%s]
                }
                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.serviceTypeId(),
                fixture.vehicleSizeId(), fixture.currency(), courtesy, reasonJson, employeeJson);
    }

    private Long createEmployee(String fullName) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "%s",
                                  "phone": "899-555-0100"
                                }
                                """.formatted(fullName)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long createServiceType(String code, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/service-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "%s",
                                  "name": "%s",
                                  "description": "Servicio ticket MVP"
                                }
                                """.formatted(code, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long createVehicleSize(String code, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/vehicle-sizes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "%s",
                                  "name": "%s",
                                  "sortOrder": 1
                                }
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
                                {
                                  "businessDayId": %d,
                                  "shiftType": "MATUTINO"
                                }
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
            Long employeeOneId, Long employeeTwoId) {
    }
}
