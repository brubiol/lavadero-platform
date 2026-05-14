package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase13SmallBusinessReadinessIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_apply_manual_payroll_adjustments_and_block_changes_when_locked() throws Exception {
        LocalDate sunday = LocalDate.of(2031, 1, 5);
        Fixture fixture = fixture("P13A", sunday.plusDays(1));
        setBaseSalary(fixture.employeeId(), "1000.00");
        createTicket(fixture);
        createAdvance(fixture, "50.00");
        Long periodId = createPeriod(sunday);

        createPayrollAdjustment(periodId, fixture.employeeId(), "EARNING", "100.00", "puntualidad", "Llegada temprano");
        createPayrollAdjustment(periodId, fixture.employeeId(), "DEDUCTION", "25.00", "vales", "Vale semanal");

        mvc.perform(post("/api/v1/payroll/periods/{id}/compute", periodId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].grossPay".formatted(fixture.employeeId()))
                        .value(1110.00))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].manualEarnings".formatted(fixture.employeeId()))
                        .value(100.00))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].manualDeductions".formatted(fixture.employeeId()))
                        .value(25.00))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].advancesDeducted".formatted(fixture.employeeId()))
                        .value(50.00))
                .andExpect(jsonPath("$.entries[?(@.employeeId == %d)].netPay".formatted(fixture.employeeId()))
                        .value(1035.00));

        mvc.perform(post("/api/v1/payroll/periods/{id}/lock", periodId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"));

        mvc.perform(post("/api/v1/payroll/periods/{id}/adjustments", periodId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeId": %d,
                                  "type": "EARNING",
                                  "amount": 10.00,
                                  "concept": "extra"
                                }
                                """.formatted(fixture.employeeId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Locked payroll periods cannot be changed"));
    }

    @Test
    void should_export_unlock_reopen_and_record_audit_events() throws Exception {
        LocalDate sunday = LocalDate.of(2031, 1, 12);
        Fixture fixture = fixture("P13B", sunday.plusDays(1));
        setBaseSalary(fixture.employeeId(), "900.00");
        createTicket(fixture);
        Long periodId = createPeriod(sunday);
        createPayrollAdjustment(periodId, fixture.employeeId(), "EARNING", "50.00", "extra", "Extra lavado");
        mvc.perform(post("/api/v1/payroll/periods/{id}/compute", periodId)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/payroll/periods/{id}/lock", periodId)).andExpect(status().isOk());

        mvc.perform(get("/api/v1/payroll/periods/{id}/export?format=xlsx", periodId))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("nomina-")));

        mvc.perform(post("/api/v1/corrections/payroll-periods/{id}/unlock", periodId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason": "Correccion por vale faltante"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPUTED"));

        Long cashCountId = createCashCount(fixture.shiftId(), 2, 0, 0);
        mvc.perform(post("/api/v1/shifts/{id}/close", fixture.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cashCountId": %d}
                                """.formatted(cashCountId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closed").value(true));

        mvc.perform(post("/api/v1/corrections/shifts/{id}/reopen", fixture.shiftId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason": "Ticket capturado tarde"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));

        mvc.perform(get("/api/v1/audit-events?entityType=PAYROLL_ADJUSTMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.action == 'PAYROLL_ADJUSTMENT_CREATED')]", hasSize(1)));

        mvc.perform(get("/api/v1/audit-events?entityType=SHIFT&entityId={id}", fixture.shiftId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.action == 'SHIFT_REOPENED')]", hasSize(1)));
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
                                  "vehicleDescription": "Prueba readiness",
                                  "courtesy": false,
                                  "employeeIds": [%d]
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.serviceTypeId(),
                                fixture.vehicleSizeId(), fixture.employeeId())))
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
                                  "advanceDate": "%s",
                                  "amount": %s,
                                  "reason": "Vale"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.employeeId(),
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

    private Long createPayrollAdjustment(Long periodId, Long employeeId, String type, String amount, String concept,
            String note) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/payroll/periods/{id}/adjustments", periodId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeId": %d,
                                  "type": "%s",
                                  "amount": %s,
                                  "concept": "%s",
                                  "note": "%s"
                                }
                                """.formatted(employeeId, type, amount, concept, note)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long createCashCount(Long shiftId, int bills100, int bills50, int bills20) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/cash-counts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "shiftId": %d,
                                  "currency": "MXN",
                                  "bills100": %d,
                                  "bills50": %d,
                                  "bills20": %d,
                                  "morrallaTotal": 0
                                }
                                """.formatted(shiftId, bills100, bills50, bills20)))
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
    }
}
