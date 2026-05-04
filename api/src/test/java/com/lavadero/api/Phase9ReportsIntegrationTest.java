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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase9ReportsIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_report_range_employee_performance_and_export_xlsx() throws Exception {
        LocalDate date = LocalDate.of(2026, 12, 10);
        Fixture fixture = fixture("P9A", date);
        createTicket(fixture, fixture.employeeOneId(), fixture.employeeTwoId());
        createExpense(fixture, "30.00");

        mvc.perform(get("/api/v1/reports/daily-summary?from=2026-12-10&to=2026-12-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carsWashed").value(1))
                .andExpect(jsonPath("$.ticketRevenue").value(100.00))
                .andExpect(jsonPath("$.expensesTotal").value(30.00))
                .andExpect(jsonPath("$.result").value(70.00))
                .andExpect(jsonPath("$.days", hasSize(1)));

        mvc.perform(get("/api/v1/reports/employee-performance?from=2026-12-10&to=2026-12-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employees", hasSize(2)))
                .andExpect(jsonPath("$.employees[?(@.employeeId == %d)].carsWashed"
                        .formatted(fixture.employeeOneId())).value(0.50))
                .andExpect(jsonPath("$.employees[?(@.employeeId == %d)].ticketRevenue"
                        .formatted(fixture.employeeTwoId())).value(50.00));

        mvc.perform(get("/api/v1/reports/export?type=full&from=2026-12-10&to=2026-12-10&format=xlsx"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"lavadero-full-2026-12-10-2026-12-10.xlsx\""))
                .andExpect(header().exists("Content-Length"));
    }

    private Fixture fixture(String prefix, LocalDate businessDate) throws Exception {
        Long employeeOneId = createEmployee(prefix + " Ana");
        Long employeeTwoId = createEmployee(prefix + " Luis");
        Long serviceTypeId = createServiceType(prefix + "_LAVADO", prefix + " Lavado");
        Long vehicleSizeId = createVehicleSize(prefix + "_CHICO", prefix + " Chico");
        createServicePrice(serviceTypeId, vehicleSizeId, "100.00", businessDate.minusDays(1).toString());
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
                                  "vehicleDescription": "Reporte prueba",
                                  "courtesy": false,
                                  "employeeIds": [%s]
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.serviceTypeId(),
                                fixture.vehicleSizeId(), employeeJson)))
                .andExpect(status().isCreated());
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
                                  "description": "Reporte prueba"
                                }
                                """.formatted(fixture.businessDayId(), fixture.shiftId(), fixture.businessDate(),
                                amount)))
                .andExpect(status().isCreated());
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("id").asLong();
    }

    private record Fixture(LocalDate businessDate, Long businessDayId, Long shiftId, Long employeeOneId,
            Long employeeTwoId, Long serviceTypeId, Long vehicleSizeId) {
    }
}
