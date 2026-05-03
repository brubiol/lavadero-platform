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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase8PayrollIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_compute_payroll_from_ticket_assignments_and_deduct_advances() throws Exception {
        LocalDate sunday = LocalDate.of(2026, 11, 1);
        Fixture fixture = fixture("P8A", sunday.plusDays(1));
        setBaseSalary(fixture.employeeOneId(), "1000.00");
        createTicket(fixture, fixture.employeeOneId(), fixture.employeeTwoId());
        createAdvance(fixture, fixture.employeeOneId(), "150.00");

        Long periodId = createPeriod(sunday);

        mvc.perform(post("/api/v1/payroll/periods/{id}/compute", periodId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPUTED"))
                .andExpect(jsonPath("$.entries", hasSize(2)))
                .andExpect(jsonPath("$.days", hasSize(2)))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].carsWashed".formatted(fixture.employeeOneId()))
                        .value(0.50))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].baseSalary".formatted(fixture.employeeOneId()))
                        .value(1000.00))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].carsBonus".formatted(fixture.employeeOneId()))
                        .value(5.00))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].advancesDeducted".formatted(fixture.employeeOneId()))
                        .value(150.00))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].netPay".formatted(fixture.employeeOneId()))
                        .value(855.00));

        mvc.perform(get("/api/v1/payroll/employees/{id}/debt-balance", fixture.employeeOneId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(0.00));
    }

    @Test
    void should_lock_payroll_and_prevent_recompute() throws Exception {
        LocalDate sunday = LocalDate.of(2026, 11, 8);
        Fixture fixture = fixture("P8B", sunday.plusDays(1));
        createTicket(fixture, fixture.employeeOneId());
        Long periodId = createPeriod(sunday);
        mvc.perform(post("/api/v1/payroll/periods/{id}/compute", periodId))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/payroll/periods/{id}/lock", periodId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"));

        mvc.perform(post("/api/v1/payroll/periods/{id}/compute", periodId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Locked payroll periods cannot be recomputed"));
    }

    @Test
    void should_reject_non_sunday_payroll_period() throws Exception {
        mvc.perform(post("/api/v1/payroll/periods")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startDate": "2026-11-02"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Payroll period must start on Sunday"));
    }

    private Fixture fixture(String prefix, LocalDate businessDate) throws Exception {
        Long employeeOneId = createEmployee(prefix + " Juan");
        Long employeeTwoId = createEmployee(prefix + " Luis");
        Long serviceTypeId = createServiceType(prefix + "_LAVADO", prefix + " Lavado");
        Long vehicleSizeId = createVehicleSize(prefix + "_MEDIANO", prefix + " Mediano");
        createServicePrice(serviceTypeId, vehicleSizeId, "200.00", businessDate.minusDays(1).toString());
        Long businessDayId = openBusinessDay(businessDate);
        Long shiftId = openShift(businessDayId);
        return new Fixture(businessDate, businessDayId, shiftId, employeeOneId, employeeTwoId, serviceTypeId,
                vehicleSizeId);
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

    private void setBaseSalary(Long employeeId, String amount) throws Exception {
        mvc.perform(patch("/api/v1/employees/{id}", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"baseWeeklySalary": %s}
                                """.formatted(amount)))
                .andExpect(status().isOk());
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

    private void createTicket(Fixture fixture, Long... employeeIds) throws Exception {
        String employeeJson = java.util.Arrays.stream(employeeIds)
                .map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "MXN",
                                  "vehicleDescription": "Prueba nomina",
                                  "courtesy": false,
                                  "employeeIds": [%s]
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.serviceTypeId(),
                                fixture.vehicleSizeId(), employeeJson)))
                .andExpect(status().isCreated());
    }

    private void createAdvance(Fixture fixture, Long employeeId, String amount) throws Exception {
        mvc.perform(post("/api/v1/employee-advances")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "employeeId": %d,
                                  "advanceDate": "%s",
                                  "amount": %s,
                                  "reason": "Prestamo"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), employeeId,
                                fixture.businessDate(), amount)))
                .andExpect(status().isCreated());
    }

    private Long createPeriod(LocalDate sunday) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/payroll/periods")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startDate": "%s"}
                                """.formatted(sunday)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("id").asLong();
    }

    private record Fixture(LocalDate businessDate, Long businessDayId, Long shiftId, Long employeeOneId,
            Long employeeTwoId, Long serviceTypeId, Long vehicleSizeId) {
    }
}
