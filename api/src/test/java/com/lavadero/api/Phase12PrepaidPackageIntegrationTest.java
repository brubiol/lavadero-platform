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

class Phase12PrepaidPackageIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_create_package_and_return_all_fields() throws Exception {
        long businessDayId = openBusinessDay(LocalDate.of(2026, 10, 10));
        long shiftId = openShift(businessDayId);

        mvc.perform(post("/api/v1/prepaid-packages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "washesIncluded": 10,
                                  "amount": 500.00,
                                  "currency": "MXN",
                                  "paymentMethod": "CASH",
                                  "notes": "Paquete mensual Juan"
                                }
                                """.formatted(businessDayId, shiftId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.businessDayId").value(businessDayId))
                .andExpect(jsonPath("$.shiftId").value(shiftId))
                .andExpect(jsonPath("$.washesIncluded").value(10))
                .andExpect(jsonPath("$.amount").value(500.00))
                .andExpect(jsonPath("$.currency").value("MXN"))
                .andExpect(jsonPath("$.paymentMethod").value("CASH"))
                .andExpect(jsonPath("$.notes").value("Paquete mensual Juan"))
                .andExpect(jsonPath("$.occurredAt").isNotEmpty())
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void should_create_package_with_defaults_when_optional_fields_absent() throws Exception {
        long businessDayId = openBusinessDay(LocalDate.of(2026, 10, 11));
        long shiftId = openShift(businessDayId);

        mvc.perform(post("/api/v1/prepaid-packages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "washesIncluded": 5,
                                  "amount": 250.00
                                }
                                """.formatted(businessDayId, shiftId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.currency").value("MXN"))
                .andExpect(jsonPath("$.paymentMethod").value("CASH"))
                .andExpect(jsonPath("$.notes").isEmpty());
    }

    @Test
    void should_list_packages_for_business_day() throws Exception {
        long businessDayId = openBusinessDay(LocalDate.of(2026, 10, 12));
        long shiftId = openShift(businessDayId);

        mvc.perform(post("/api/v1/prepaid-packages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(packageJson(businessDayId, shiftId, 10, "600.00", "MXN", "TRANSFER", null)))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/prepaid-packages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(packageJson(businessDayId, shiftId, 20, "1000.00", "USD", "CARD", "Paquete anual")))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/prepaid-packages?business_day_id=" + businessDayId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].amount").value(600.00))
                .andExpect(jsonPath("$[0].currency").value("MXN"))
                .andExpect(jsonPath("$[1].amount").value(1000.00))
                .andExpect(jsonPath("$[1].currency").value("USD"))
                .andExpect(jsonPath("$[1].notes").value("Paquete anual"));
    }

    @Test
    void should_return_empty_list_when_no_packages_for_business_day() throws Exception {
        long businessDayId = openBusinessDay(LocalDate.of(2026, 10, 13));

        mvc.perform(get("/api/v1/prepaid-packages?business_day_id=" + businessDayId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void should_reject_package_when_amount_is_zero() throws Exception {
        long businessDayId = openBusinessDay(LocalDate.of(2026, 10, 14));
        long shiftId = openShift(businessDayId);

        mvc.perform(post("/api/v1/prepaid-packages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "washesIncluded": 10,
                                  "amount": 0
                                }
                                """.formatted(businessDayId, shiftId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_reject_package_when_washes_included_is_zero() throws Exception {
        long businessDayId = openBusinessDay(LocalDate.of(2026, 10, 15));
        long shiftId = openShift(businessDayId);

        mvc.perform(post("/api/v1/prepaid-packages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "washesIncluded": 0,
                                  "amount": 500.00
                                }
                                """.formatted(businessDayId, shiftId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_reject_package_when_business_day_id_is_missing() throws Exception {
        long businessDayId = openBusinessDay(LocalDate.of(2026, 10, 16));
        long shiftId = openShift(businessDayId);

        mvc.perform(post("/api/v1/prepaid-packages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "shiftId": %d,
                                  "washesIncluded": 10,
                                  "amount": 500.00
                                }
                                """.formatted(shiftId)))
                .andExpect(status().isBadRequest());
    }

    private String packageJson(long businessDayId, long shiftId, int washes, String amount,
            String currency, String paymentMethod, String notes) {
        String notesJson = notes == null ? "null" : "\"" + notes + "\"";
        return """
                {
                  "businessDayId": %d,
                  "shiftId": %d,
                  "washesIncluded": %d,
                  "amount": %s,
                  "currency": "%s",
                  "paymentMethod": "%s",
                  "notes": %s
                }
                """.formatted(businessDayId, shiftId, washes, amount, currency, paymentMethod, notesJson);
    }

    private long openBusinessDay(LocalDate date) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/business-days/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessDate": "%s"}
                                """.formatted(date)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private long openShift(long businessDayId) throws Exception {
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

    private long idFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }
}
