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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase14DiscountIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_apply_discount_percent_and_store_original_price() throws Exception {
        Fixture f = fixture("D14A", LocalDate.of(2027, 6, 1), "200.00");

        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, "25", f.employeeId())))
                .andExpect(status().isCreated())
                .andReturn();

        Long ticketId = idFrom(result);
        mvc.perform(get("/api/v1/tickets/{id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceAmount").value(150.00))        // 200 × 0.75
                .andExpect(jsonPath("$.originalPriceAmount").value(200.00))
                .andExpect(jsonPath("$.discountPercent").value(25.0));
    }

    @Test
    void should_leave_price_unchanged_when_discount_is_zero() throws Exception {
        Fixture f = fixture("D14B", LocalDate.of(2027, 6, 2), "180.00");

        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, "0", f.employeeId())))
                .andExpect(status().isCreated())
                .andReturn();

        Long ticketId = idFrom(result);
        mvc.perform(get("/api/v1/tickets/{id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceAmount").value(180.00))
                .andExpect(jsonPath("$.originalPriceAmount").value(180.00))
                .andExpect(jsonPath("$.discountPercent").value(0.0));
    }

    @Test
    void should_reject_discount_above_100() throws Exception {
        Fixture f = fixture("D14C", LocalDate.of(2027, 6, 3), "150.00");

        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, "101", f.employeeId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_reject_discount_below_0() throws Exception {
        Fixture f = fixture("D14D", LocalDate.of(2027, 6, 4), "150.00");

        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, "-1", f.employeeId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_ignore_discount_on_courtesy_ticket() throws Exception {
        Fixture f = fixture("D14E", LocalDate.of(2027, 6, 5), "200.00");

        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, true, "Cliente del dueno", "50", f.employeeId())))
                .andExpect(status().isCreated())
                .andReturn();

        Long ticketId = idFrom(result);
        mvc.perform(get("/api/v1/tickets/{id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceAmount").value(0.0))
                .andExpect(jsonPath("$.discountPercent").value(0.0))
                .andExpect(jsonPath("$.courtesy").value(true));
    }

    @Test
    void should_reflect_discounted_revenue_in_daily_summary() throws Exception {
        Fixture f = fixture("D14F", LocalDate.of(2027, 6, 6), "200.00");

        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(ticketJson(f, false, null, "25", f.employeeId())))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/reports/daily-summary?date=2027-06-06"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carsWashed").value(1))
                .andExpect(jsonPath("$.ticketRevenue").value(150.00)); // discounted price, not base
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Fixture fixture(String prefix, LocalDate date, String price) throws Exception {
        Long employeeId = createEmployee(prefix + " Juan");
        Long serviceTypeId = createServiceType(prefix + "_SVC", prefix + " Servicio");
        Long vehicleSizeId = createVehicleSize(prefix + "_SIZE", prefix + " Tamano");
        createServicePrice(serviceTypeId, vehicleSizeId, "MXN", price, date.minusDays(1).toString());
        Long businessDayId = openBusinessDay(date);
        Long shiftId = openShift(businessDayId);
        return new Fixture(businessDayId, shiftId, serviceTypeId, vehicleSizeId, employeeId);
    }

    private String ticketJson(Fixture f, boolean courtesy, String courtesyReason, String discountPercent,
            Long employeeId) {
        String reasonJson = courtesyReason == null ? "null" : "\"" + courtesyReason + "\"";
        return """
                {
                  "businessDayId": %d,
                  "shiftId": %d,
                  "serviceTypeId": %d,
                  "vehicleSizeId": %d,
                  "currency": "MXN",
                  "vehicleDescription": "Tsuru rojo",
                  "courtesy": %s,
                  "courtesyReason": %s,
                  "discountPercent": %s,
                  "employeeIds": [%d]
                }
                """.formatted(f.businessDayId(), f.shiftId(), f.serviceTypeId(), f.vehicleSizeId(),
                courtesy, reasonJson, discountPercent, employeeId);
    }

    private Long createEmployee(String fullName) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "%s", "phone": "899-555-0100"}
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
