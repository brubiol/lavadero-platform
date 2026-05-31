package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for the Customer CRM feature.
 *
 * Business context: Turbo Lavado Reynosa — repeat customers who bring their
 * vehicles to the lavadero regularly are tracked for loyalty rewards.
 * Every 10 paid, non-courtesy washes earns a recognition reward.
 */
@DisplayName("Phase 12 — Customer CRM")
class Phase12CrmIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    // -------------------------------------------------------------------------
    // Customer CRUD
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("should create customer and return 201 with correct fields")
    void should_create_customer_when_valid_request() throws Exception {
        mvc.perform(post("/api/v1/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Roberto Garza Trevino",
                                  "phone": "899-123-4567",
                                  "notes": "Trae Tsuru rojo casi cada semana"
                                }
                                """))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Roberto Garza Trevino"))
                .andExpect(jsonPath("$.phone").value("899-123-4567"))
                .andExpect(jsonPath("$.loyaltyStatus").value("REGULAR"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @DisplayName("should reject create when name is blank")
    void should_return_400_when_customer_name_is_blank() throws Exception {
        mvc.perform(post("/api/v1/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "  ", "phone": "899-000-0001"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("should find customer by name search")
    void should_return_customer_when_searched_by_name() throws Exception {
        createCustomer("Maria Gonzalez Flores", "899-555-1111", "Cliente frecuente, Sentra plateado");
        createCustomer("Jose Martinez Lopez", "899-555-2222", null);

        mvc.perform(get("/api/v1/customers?q=Gonzalez"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Maria Gonzalez Flores"));
    }

    @Test
    @DisplayName("should find customer by partial phone search")
    void should_return_customer_when_searched_by_phone() throws Exception {
        createCustomer("Carlos Reyes Salinas", "899-777-9090", "Camioneta gris");

        mvc.perform(get("/api/v1/customers?q=777-9090"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Carlos Reyes Salinas"));
    }

    @Test
    @DisplayName("should return empty list when no customer matches search")
    void should_return_empty_list_when_no_customer_matches() throws Exception {
        mvc.perform(get("/api/v1/customers?q=ClienteQueNoExiste99999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("should update customer name and mark as VIP")
    void should_update_customer_and_mark_vip() throws Exception {
        Long id = createCustomer("Ana Hernandez", "899-321-0000", null);

        mvc.perform(patch("/api/v1/customers/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Ana Hernandez Molina",
                                  "loyaltyStatus": "VIP"
                                }
                                """))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ana Hernandez Molina"))
                .andExpect(jsonPath("$.loyaltyStatus").value("VIP"));
    }

    @Test
    @DisplayName("should deactivate customer and return 204")
    void should_deactivate_customer_when_delete_called() throws Exception {
        Long id = createCustomer("Cliente Temporal", null, null);

        mvc.perform(delete("/api/v1/customers/{id}", id))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/customers/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("should return 404 for unknown customer")
    void should_return_404_when_customer_not_found() throws Exception {
        mvc.perform(get("/api/v1/customers/999999"))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // Customer linked to tickets
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("should attach customer to ticket and reflect in ticket response")
    void should_attach_customer_to_ticket_and_appear_in_response() throws Exception {
        Long customerId = createCustomer("Fernando Solis Ramos", "899-444-5566",
                "Viene los viernes con Expedition blanca");
        TicketFixture fix = ticketFixture("C12A", LocalDate.of(2027, 1, 1), "MXN", "150.00");
        Long ticketId = createTicket(fix);

        mvc.perform(post("/api/v1/tickets/{id}/attach-customer", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId": %d}
                                """.formatted(customerId)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerId").value(customerId))
                .andExpect(jsonPath("$.customerName").value("Fernando Solis Ramos"));

        mvc.perform(get("/api/v1/tickets/{id}", ticketId))
                .andExpect(jsonPath("$.customerId").value(customerId))
                .andExpect(jsonPath("$.customerName").value("Fernando Solis Ramos"));
    }

    @Test
    @DisplayName("should return 404 when attaching non-existent customer to ticket")
    void should_return_404_when_attaching_unknown_customer() throws Exception {
        TicketFixture fix = ticketFixture("C12B", LocalDate.of(2027, 1, 2), "MXN", "160.00");
        Long ticketId = createTicket(fix);

        mvc.perform(post("/api/v1/tickets/{id}/attach-customer", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId": 999999}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("should return 400 when attaching customer to voided ticket")
    void should_return_400_when_attaching_customer_to_voided_ticket() throws Exception {
        Long customerId = createCustomer("Cliente Void Test", null, null);
        TicketFixture fix = ticketFixture("C12C", LocalDate.of(2027, 1, 3), "MXN", "170.00");
        Long ticketId = createTicket(fix);

        mvc.perform(post("/api/v1/tickets/{id}/void", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason": "Capturado por error"}
                                """))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/tickets/{id}/attach-customer", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId": %d}
                                """.formatted(customerId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("should create ticket without customer — backward compatible")
    void should_create_ticket_without_customer_and_return_null_customer_fields() throws Exception {
        TicketFixture fix = ticketFixture("C12D", LocalDate.of(2027, 1, 4), "MXN", "180.00");
        Long ticketId = createTicket(fix);

        mvc.perform(get("/api/v1/tickets/{id}", ticketId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerId").doesNotExist())
                .andExpect(jsonPath("$.customerName").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Customer profile and loyalty
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("should show correct visit count and spend in profile after linking tickets")
    void should_calculate_profile_metrics_from_linked_tickets() throws Exception {
        Long customerId = createCustomer("Lucia Perez Villarreal", "899-100-2200",
                "Paga siempre en efectivo, Versa azul");

        // Three paid MXN washes
        for (int i = 0; i < 3; i++) {
            TicketFixture fix = ticketFixture("C12E-" + i, LocalDate.of(2027, 1, 5 + i), "MXN", "150.00");
            Long ticketId = createTicket(fix);
            attachCustomer(ticketId, customerId);
        }

        mvc.perform(get("/api/v1/customers/{id}/profile", customerId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Lucia Perez Villarreal"))
                .andExpect(jsonPath("$.totalVisits").value(3))
                .andExpect(jsonPath("$.totalSpentMxn").value(450.00))
                .andExpect(jsonPath("$.loyaltyProgress").value(3))
                .andExpect(jsonPath("$.loyaltyRewardsEarned").value(0))
                .andExpect(jsonPath("$.lastVisitDate").value(containsString("2027-01")));
    }

    @Test
    @DisplayName("should exclude voided tickets from loyalty count")
    void should_exclude_voided_tickets_from_loyalty() throws Exception {
        Long customerId = createCustomer("Pedro Ramirez Ibarra", "899-200-3300", null);

        // Two valid washes + one voided
        for (int i = 0; i < 2; i++) {
            TicketFixture fix = ticketFixture("C12F-ok-" + i, LocalDate.of(2027, 1, 10 + i), "MXN", "150.00");
            attachCustomer(createTicket(fix), customerId);
        }
        TicketFixture voidFix = ticketFixture("C12F-void", LocalDate.of(2027, 1, 12), "MXN", "150.00");
        Long voidedId = createTicket(voidFix);
        attachCustomer(voidedId, customerId);
        mvc.perform(post("/api/v1/tickets/{id}/void", voidedId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason": "Se fue sin pagar"}
                                """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/customers/{id}/profile", customerId))
                .andExpect(jsonPath("$.totalVisits").value(2))
                .andExpect(jsonPath("$.totalSpentMxn").value(300.00));
    }

    @Test
    @DisplayName("should exclude courtesy tickets from loyalty count")
    void should_exclude_courtesy_tickets_from_loyalty() throws Exception {
        Long customerId = createCustomer("Senora Norma Castillo", "899-300-4400",
                "Familiar del dueno, a veces cortesia");

        // One paid + one courtesy
        TicketFixture paidFix = ticketFixture("C12G-paid", LocalDate.of(2027, 1, 15), "MXN", "150.00");
        attachCustomer(createTicket(paidFix), customerId);

        TicketFixture courtesyFix = ticketFixture("C12G-cort", LocalDate.of(2027, 1, 16), "MXN", "150.00");
        Long courtesyId = createCourtesyTicket(courtesyFix, "Familiar del dueno");
        attachCustomer(courtesyId, customerId);

        mvc.perform(get("/api/v1/customers/{id}/profile", customerId))
                .andExpect(jsonPath("$.totalVisits").value(1))
                .andExpect(jsonPath("$.totalSpentMxn").value(150.00));
    }

    @Test
    @DisplayName("should show loyalty rewards earned after 10 qualifying washes")
    void should_show_loyalty_reward_earned_after_10_washes() throws Exception {
        Long customerId = createCustomer("Don Ramon Salazar", "899-400-5500",
                "Cliente leal desde hace anos, viene cada lunes");

        for (int i = 0; i < 10; i++) {
            TicketFixture fix = ticketFixture("C12H-" + i, LocalDate.of(2027, 1, 20 + i), "MXN", "150.00");
            attachCustomer(createTicket(fix), customerId);
        }

        mvc.perform(get("/api/v1/customers/{id}/profile", customerId))
                .andDo(print())
                .andExpect(jsonPath("$.totalVisits").value(10))
                .andExpect(jsonPath("$.loyaltyProgress").value(0))
                .andExpect(jsonPath("$.loyaltyRewardsEarned").value(1));
    }

    @Test
    @DisplayName("should advance the punch card when a courtesy ticket is a loyalty redemption")
    void should_count_loyalty_courtesy_toward_progress() throws Exception {
        Long customerId = createCustomer("Mariana Aguilar Cantu", "899-500-6600",
                "Cliente con tarjeta llena, redime el 10mo");

        // 9 paid washes — customer is one away from the free wash.
        for (int i = 0; i < 9; i++) {
            TicketFixture fix = ticketFixture("C12I-" + i, LocalDate.of(2027, 2, 1 + i), "MXN", "150.00");
            attachCustomer(createTicket(fix), customerId);
        }

        mvc.perform(get("/api/v1/customers/{id}/profile", customerId))
                .andExpect(jsonPath("$.totalVisits").value(9))
                .andExpect(jsonPath("$.loyaltyProgress").value(9))
                .andExpect(jsonPath("$.loyaltyRewardsEarned").value(0));

        // 10th visit is the redemption — courtesy with a "Lealtad:" reason MUST advance the card.
        TicketFixture redemption = ticketFixture("C12I-redeem", LocalDate.of(2027, 2, 11), "MXN", "150.00");
        Long redemptionId = createCourtesyTicket(redemption, "Lealtad: lavado 10/10");
        attachCustomer(redemptionId, customerId);

        mvc.perform(get("/api/v1/customers/{id}/profile", customerId))
                .andExpect(jsonPath("$.totalVisits").value(10))
                .andExpect(jsonPath("$.loyaltyProgress").value(0))
                .andExpect(jsonPath("$.loyaltyRewardsEarned").value(1));
    }

    @Test
    @DisplayName("should accept customerId at ticket creation and attach in one call")
    void should_attach_customer_at_ticket_creation() throws Exception {
        Long customerId = createCustomer("Tony Vargas Mendoza", "899-600-7700", null);
        TicketFixture fix = ticketFixture("C12J", LocalDate.of(2027, 7, 1), "MXN", "150.00");

        mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "%s",
                                  "vehicleDescription": "Auto cliente",
                                  "courtesy": false,
                                  "employeeIds": [%d],
                                  "customerId": %d
                                }
                                """.formatted(fix.businessDayId(), fix.shiftId(), fix.serviceTypeId(),
                                fix.vehicleSizeId(), fix.currency(), fix.employeeId(), customerId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerId").value(customerId));

        mvc.perform(get("/api/v1/customers/{id}/profile", customerId))
                .andExpect(jsonPath("$.totalVisits").value(1))
                .andExpect(jsonPath("$.loyaltyProgress").value(1));
    }

    @Test
    @DisplayName("should expose loyaltyProgress + loyaltyRewardsEarned on the list endpoint")
    void should_include_loyalty_progress_on_customers_list() throws Exception {
        Long customerId = createCustomer("Karla Quintero Vela", "899-700-8800", null);
        for (int i = 0; i < 6; i++) {
            TicketFixture fix = ticketFixture("C12K-" + i, LocalDate.of(2027, 4, 1 + i), "MXN", "150.00");
            attachCustomer(createTicket(fix), customerId);
        }

        mvc.perform(get("/api/v1/customers").param("q", "Karla Quintero"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Karla Quintero Vela"))
                .andExpect(jsonPath("$[0].loyaltyProgress").value(6))
                .andExpect(jsonPath("$[0].loyaltyRewardsEarned").value(0));
    }

    @Test
    @DisplayName("should show empty profile metrics when customer has no tickets")
    void should_return_zero_metrics_when_customer_has_no_tickets() throws Exception {
        Long id = createCustomer("Cliente Nuevo Sin Historial", "899-000-9999", null);

        mvc.perform(get("/api/v1/customers/{id}/profile", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVisits").value(0))
                .andExpect(jsonPath("$.totalSpentMxn").value(0))
                .andExpect(jsonPath("$.lastVisitDate").doesNotExist())
                .andExpect(jsonPath("$.loyaltyProgress").value(0))
                .andExpect(jsonPath("$.loyaltyRewardsEarned").value(0));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Long createCustomer(String name, String phone, String notes) throws Exception {
        String phoneJson = phone == null ? "null" : "\"" + phone + "\"";
        String notesJson = notes == null ? "null" : "\"" + notes + "\"";
        MvcResult result = mvc.perform(post("/api/v1/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "%s", "phone": %s, "notes": %s}
                                """.formatted(name, phoneJson, notesJson)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private void attachCustomer(Long ticketId, Long customerId) throws Exception {
        mvc.perform(post("/api/v1/tickets/{id}/attach-customer", ticketId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId": %d}
                                """.formatted(customerId)))
                .andExpect(status().isOk());
    }

    private Long createTicket(TicketFixture fix) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "%s",
                                  "vehicleDescription": "Auto cliente",
                                  "courtesy": false,
                                  "employeeIds": [%d]
                                }
                                """.formatted(fix.businessDayId(), fix.shiftId(), fix.serviceTypeId(),
                                fix.vehicleSizeId(), fix.currency(), fix.employeeId())))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private Long createCourtesyTicket(TicketFixture fix, String reason) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/tickets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "businessDayId": %d,
                                  "shiftId": %d,
                                  "serviceTypeId": %d,
                                  "vehicleSizeId": %d,
                                  "currency": "%s",
                                  "vehicleDescription": "Cortesia",
                                  "courtesy": true,
                                  "courtesyReason": "%s",
                                  "employeeIds": [%d]
                                }
                                """.formatted(fix.businessDayId(), fix.shiftId(), fix.serviceTypeId(),
                                fix.vehicleSizeId(), fix.currency(), reason, fix.employeeId())))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private TicketFixture ticketFixture(String prefix, LocalDate date, String currency, String amount)
            throws Exception {
        // Service type/size codes must be ^[A-Z0-9_]+$ — strip hyphens from prefix
        String codePrefix = prefix.replace("-", "_").toUpperCase();
        Long employeeId = createEmployee(prefix + " Juan Lavador");
        Long serviceTypeId = createServiceType(codePrefix + "_LAVADO", prefix + " Lavado");
        Long vehicleSizeId = createVehicleSize(codePrefix + "_MED", prefix + " Mediano");
        createServicePrice(serviceTypeId, vehicleSizeId, currency, amount, date.minusDays(1).toString());
        Long businessDayId = openBusinessDay(date);
        Long shiftId = openShift(businessDayId);
        return new TicketFixture(businessDayId, shiftId, serviceTypeId, vehicleSizeId, currency, employeeId);
    }

    private Long createEmployee(String fullName) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName": "%s", "phone": "899-000-0000"}
                                """.formatted(fullName)))
                .andExpect(status().isCreated()).andReturn();
        return idFrom(r);
    }

    private Long createServiceType(String code, String name) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/service-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "%s", "name": "%s", "description": "Lavado CRM test"}
                                """.formatted(code, name)))
                .andExpect(status().isCreated()).andReturn();
        return idFrom(r);
    }

    private Long createVehicleSize(String code, String name) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/vehicle-sizes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code": "%s", "name": "%s", "sortOrder": 1}
                                """.formatted(code, name)))
                .andExpect(status().isCreated()).andReturn();
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
                .andExpect(status().isCreated()).andReturn();
        return idFrom(r);
    }

    private Long openShift(Long businessDayId) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/shifts/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessDayId": %d, "shiftType": "MATUTINO"}
                                """.formatted(businessDayId)))
                .andExpect(status().isCreated()).andReturn();
        return idFrom(r);
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }

    private record TicketFixture(Long businessDayId, Long shiftId, Long serviceTypeId, Long vehicleSizeId,
            String currency, Long employeeId) {
    }
}
