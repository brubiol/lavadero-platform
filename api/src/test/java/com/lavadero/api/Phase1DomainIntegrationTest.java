package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase1DomainIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_support_phase_1_foundational_domain_flow() throws Exception {
        Long employeeId = createEmployee();
        mvc.perform(get("/api/v1/employees/{id}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Juan Perez"));

        mvc.perform(patch("/api/v1/employees/{id}", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phone":"899-555-0101"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("899-555-0101"));

        mvc.perform(delete("/api/v1/employees/{id}", employeeId))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/employees?active=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        Long serviceTypeId = createServiceType("LAVADO_BASICO", "Lavado basico");
        Long vehicleSizeId = createVehicleSize("MEDIANO", "Mediano");

        mvc.perform(get("/api/v1/service-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(hasItem("LAVADO_BASICO")));

        mvc.perform(get("/api/v1/vehicle-sizes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(hasItem("MEDIANO")));

        mvc.perform(post("/api/v1/service-prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "amount": 120.00,
                                  "currency": "MXN",
                                  "effectiveFrom": "2026-05-01"
                                }
                                """.formatted(serviceTypeId, vehicleSizeId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(120.00));

        mvc.perform(get("/api/v1/service-prices?effective_on=2026-05-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].serviceTypeId").value(hasItem(serviceTypeId.intValue())));

        Long businessDayId = openBusinessDay(LocalDate.of(2026, 5, 2));

        mvc.perform(get("/api/v1/business-days?from=2026-05-01&to=2026-05-03"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(businessDayId));

        mvc.perform(get("/api/v1/business-days/{id}", businessDayId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));

        mvc.perform(post("/api/v1/shifts/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftType": "MATUTINO"
                                }
                                """.formatted(businessDayId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shiftType").value("MATUTINO"));

        mvc.perform(get("/api/v1/shifts?business_day_id=" + businessDayId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].businessDayId").value(businessDayId));
    }

    @Test
    void should_reject_overlapping_service_price_ranges() throws Exception {
        Long serviceTypeId = createServiceType("DETAIL", "Detail");
        Long vehicleSizeId = createVehicleSize("GRANDE", "Grande");

        createServicePrice(serviceTypeId, vehicleSizeId, "2026-06-01", "2026-06-30");

        mvc.perform(post("/api/v1/service-prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "amount": 200.00,
                                  "currency": "MXN",
                                  "effectiveFrom": "2026-06-15",
                                  "effectiveTo": "2026-07-01"
                                }
                                """.formatted(serviceTypeId, vehicleSizeId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Service price overlaps an existing effective date range"));
    }

    private Long createEmployee() throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Juan Perez",
                                  "phone": "899-555-0100"
                                }
                                """))
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
                                  "description": "Servicio de prueba"
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

    private void createServicePrice(Long serviceTypeId, Long vehicleSizeId, String from, String to) throws Exception {
        mvc.perform(post("/api/v1/service-prices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "amount": 180.00,
                                  "currency": "MXN",
                                  "effectiveFrom": "%s",
                                  "effectiveTo": "%s"
                                }
                                """.formatted(serviceTypeId, vehicleSizeId, from, to)))
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

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }
}
