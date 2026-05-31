package com.lavadero.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RBAC boundary tests — the most important security tests in the suite.
 *
 * These tests run with lavadero.auth.enabled=true so the real Spring Security
 * filter chain is active. Every test either:
 *   - expects 401 when no token is provided to a secured endpoint
 *   - expects 403 when a lower-privileged role tries to reach a higher one
 *   - expects 2xx to confirm a role CAN reach its own endpoints
 *
 * The role hierarchy is: OPERADOR < GERENTE < DUENO (hierarchical — DUENO
 * inherits all GERENTE and OPERADOR permissions).
 *
 * User names use the "rbac_" prefix and unique suffixes to avoid collisions
 * with the Phase1–Phase15 fixtures that run in the same Postgres container.
 */
@SpringBootTest(properties = "lavadero.auth.enabled=true")
@TestPropertySource(properties = "lavadero.auth.enabled=true")
class RbacSecurityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    // These tokens are refreshed before each test to be safe. In practice they
    // remain valid for the whole test run (480-minute access token TTL), but
    // using @BeforeEach makes each test self-contained.
    private String duenoToken;
    private String gerenteToken;
    private String operadorToken;

    @BeforeEach
    void setupTokens() throws Exception {
        // Bootstrap owner is always available in the test profile.
        duenoToken = TestAuthHelper.bearerToken(mvc, objectMapper, "dueno", "cambia-esto-123");

        // Create GERENTE and OPERADOR users on first run; subsequent runs will
        // hit the duplicate-username path and skip creation gracefully.
        ensureUser("rbac_gerente_01", "rbac-gerente-pass", "RBAC Gerente", "GERENTE");
        ensureUser("rbac_operador_01", "rbac-operador-pass", "RBAC Operador", "OPERADOR");

        gerenteToken = TestAuthHelper.bearerToken(mvc, objectMapper, "rbac_gerente_01", "rbac-gerente-pass");
        operadorToken = TestAuthHelper.bearerToken(mvc, objectMapper, "rbac_operador_01", "rbac-operador-pass");
    }

    // -------------------------------------------------------------------------
    // Auth endpoints — public (no token required)
    // -------------------------------------------------------------------------

    @Nested
    class AuthEndpoints {

        @Test
        void should_allow_login_without_token() throws Exception {
            mvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"username": "dueno", "password": "cambia-esto-123"}
                                    """))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_401_when_login_credentials_are_wrong() throws Exception {
            mvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"username": "dueno", "password": "wrongpassword"}
                                    """))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_allow_health_without_token() throws Exception {
            mvc.perform(get("/api/v1/health"))
                    .andExpect(status().isOk());
        }
    }

    // -------------------------------------------------------------------------
    // Unauthenticated requests to secured endpoints must return 401
    // -------------------------------------------------------------------------

    @Nested
    class UnauthenticatedRequests {

        @Test
        void should_return_401_when_creating_ticket_without_token() throws Exception {
            mvc.perform(post("/api/v1/tickets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_listing_tickets_without_token() throws Exception {
            mvc.perform(get("/api/v1/tickets"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_creating_employee_without_token() throws Exception {
            mvc.perform(post("/api/v1/employees")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_accessing_payroll_without_token() throws Exception {
            mvc.perform(get("/api/v1/payroll/periods"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_accessing_ai_without_token() throws Exception {
            mvc.perform(post("/api/v1/ai/briefs/daily?date=2026-01-01"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_accessing_audit_events_without_token() throws Exception {
            mvc.perform(get("/api/v1/audit-events"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_accessing_admin_users_without_token() throws Exception {
            mvc.perform(get("/api/v1/admin/users"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_accessing_reports_without_token() throws Exception {
            mvc.perform(get("/api/v1/reports/daily-summary?date=2026-01-01"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // -------------------------------------------------------------------------
    // AI endpoints — DUENO only
    // -------------------------------------------------------------------------

    @Nested
    class AiEndpoints {

        @Test
        void should_allow_dueno_to_trigger_daily_brief() throws Exception {
            mvc.perform(post("/api/v1/ai/briefs/daily?date=2025-12-01")
                            .header("Authorization", duenoToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_403_when_gerente_triggers_ai_brief() throws Exception {
            mvc.perform(post("/api/v1/ai/briefs/daily?date=2025-12-02")
                            .header("Authorization", gerenteToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_triggers_ai_brief() throws Exception {
            mvc.perform(post("/api/v1/ai/briefs/daily?date=2025-12-03")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_gerente_runs_ai_alerts() throws Exception {
            mvc.perform(post("/api/v1/ai/alerts/run?from=2025-12-01&to=2025-12-01")
                            .header("Authorization", gerenteToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_accesses_ai_insights() throws Exception {
            mvc.perform(get("/api/v1/ai/insights")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isForbidden());
        }
    }

    // -------------------------------------------------------------------------
    // Admin user management — DUENO only
    // -------------------------------------------------------------------------

    @Nested
    class AdminUserManagement {

        @Test
        void should_allow_dueno_to_list_users() throws Exception {
            mvc.perform(get("/api/v1/admin/users")
                            .header("Authorization", duenoToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_403_when_gerente_creates_user() throws Exception {
            mvc.perform(post("/api/v1/admin/users")
                            .header("Authorization", gerenteToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "username": "rbac_blocked_by_gerente",
                                      "password": "supersecret123",
                                      "fullName": "Blocked",
                                      "role": "OPERADOR"
                                    }
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_creates_user() throws Exception {
            mvc.perform(post("/api/v1/admin/users")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "username": "rbac_blocked_by_operador",
                                      "password": "supersecret123",
                                      "fullName": "Blocked",
                                      "role": "OPERADOR"
                                    }
                                    """))
                    .andExpect(status().isForbidden());
        }
    }

    // -------------------------------------------------------------------------
    // Payroll — requires PAYROLL_ACCESS.
    //
    // DUENO always has it. GERENTE gets it by default (payrollAccess=true in
    // AppUser) because the CreateUserRequest DTO does not expose the flag —
    // so any GERENTE created via the API starts with payroll access. The
    // OPERADOR role never receives ROLE_PAYROLL_ACCESS regardless of the flag.
    // -------------------------------------------------------------------------

    @Nested
    class PayrollEndpoints {

        @Test
        void should_allow_dueno_to_list_payroll_periods() throws Exception {
            mvc.perform(get("/api/v1/payroll/periods")
                            .header("Authorization", duenoToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_allow_gerente_to_list_payroll_periods_with_default_payroll_access() throws Exception {
            // GERENTE users created via the API receive payrollAccess=true by default,
            // so they can access payroll endpoints. The flag can only be disabled
            // directly in the database.
            mvc.perform(get("/api/v1/payroll/periods")
                            .header("Authorization", gerenteToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_403_when_operador_accesses_payroll() throws Exception {
            // OPERADOR never gets ROLE_PAYROLL_ACCESS — this is the hard boundary.
            mvc.perform(get("/api/v1/payroll/periods")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_creates_payroll_period() throws Exception {
            mvc.perform(post("/api/v1/payroll/periods")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"startDate": "2035-01-05"}
                                    """))
                    .andExpect(status().isForbidden());
        }
    }

    // -------------------------------------------------------------------------
    // Catalog (employees, service types) — GERENTE minimum
    // -------------------------------------------------------------------------

    @Nested
    class CatalogEndpoints {

        @Test
        void should_allow_dueno_to_create_employee() throws Exception {
            mvc.perform(post("/api/v1/employees")
                            .header("Authorization", duenoToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"fullName": "RBAC Test Dueno Emp", "phone": "899-000-0001"}
                                    """))
                    .andExpect(status().isCreated());
        }

        @Test
        void should_allow_gerente_to_create_employee() throws Exception {
            mvc.perform(post("/api/v1/employees")
                            .header("Authorization", gerenteToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"fullName": "RBAC Test Gerente Emp", "phone": "899-000-0002"}
                                    """))
                    .andExpect(status().isCreated());
        }

        @Test
        void should_return_403_when_operador_creates_employee() throws Exception {
            mvc.perform(post("/api/v1/employees")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"fullName": "RBAC Blocked Emp", "phone": "899-000-0003"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_creates_service_type() throws Exception {
            mvc.perform(post("/api/v1/service-types")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"code": "RBAC_BLOCK", "name": "Blocked", "description": "x"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_creates_vehicle_size() throws Exception {
            mvc.perform(post("/api/v1/vehicle-sizes")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"code": "RBAC_BLOCK_SIZE", "name": "Blocked", "sortOrder": 99}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_creates_service_price() throws Exception {
            mvc.perform(post("/api/v1/service-prices")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "serviceTypeId": 1, "vehicleSizeId": 1,
                                      "amount": 100, "currency": "MXN",
                                      "effectiveFrom": "2026-01-01"
                                    }
                                    """))
                    .andExpect(status().isForbidden());
        }
    }

    // -------------------------------------------------------------------------
    // Tickets — OPERADOR can create and read; GERENTE can patch and void
    // -------------------------------------------------------------------------

    @Nested
    class TicketEndpoints {

        @Test
        void should_allow_operador_to_read_tickets() throws Exception {
            mvc.perform(get("/api/v1/tickets")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_403_when_operador_patches_ticket() throws Exception {
            // The endpoint requires GERENTE; OPERADOR must get 403.
            // We use a non-existent ID — if security passes, we'd get 404,
            // but we expect the security layer to reject before that.
            mvc.perform(patch("/api/v1/tickets/999999")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"vehicleDescription": "blocked"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_voids_ticket() throws Exception {
            mvc.perform(post("/api/v1/tickets/999999/void")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"reason": "blocked"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_allow_gerente_to_void_ticket_that_does_not_exist_and_get_404() throws Exception {
            // GERENTE has the role; security passes; service throws EntityNotFoundException.
            mvc.perform(post("/api/v1/tickets/999999/void")
                            .header("Authorization", gerenteToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"reason": "error test"}
                                    """))
                    .andExpect(status().isNotFound());
        }
    }

    // -------------------------------------------------------------------------
    // Customers — GERENTE to create/update/delete; OPERADOR to read
    // -------------------------------------------------------------------------

    @Nested
    class CustomerEndpoints {

        @Test
        void should_allow_operador_to_list_customers() throws Exception {
            mvc.perform(get("/api/v1/customers")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_403_when_operador_creates_customer() throws Exception {
            mvc.perform(post("/api/v1/customers")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"name": "Blocked Customer", "phone": "899-000-0000"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_patches_customer() throws Exception {
            mvc.perform(patch("/api/v1/customers/999999")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"name": "Blocked"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_deletes_customer() throws Exception {
            mvc.perform(delete("/api/v1/customers/999999")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_allow_gerente_to_create_customer() throws Exception {
            mvc.perform(post("/api/v1/customers")
                            .header("Authorization", gerenteToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"name": "RBAC Gerente Customer", "phone": "899-111-2222"}
                                    """))
                    .andExpect(status().isCreated());
        }
    }

    // -------------------------------------------------------------------------
    // Inventory — GERENTE minimum
    // -------------------------------------------------------------------------

    @Nested
    class InventoryEndpoints {

        @Test
        void should_return_403_when_operador_creates_product() throws Exception {
            mvc.perform(post("/api/v1/products")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"name": "Blocked Product", "unit": "L"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_records_inventory_movement() throws Exception {
            mvc.perform(post("/api/v1/inventory")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"productId": 1, "movementType": "IN", "quantity": 10}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_allow_gerente_to_list_products() throws Exception {
            mvc.perform(get("/api/v1/products")
                            .header("Authorization", gerenteToken))
                    .andExpect(status().isOk());
        }
    }

    // -------------------------------------------------------------------------
    // Reports — daily-summary OPERADOR+, historical GERENTE+, everything else DUENO
    // -------------------------------------------------------------------------

    @Nested
    class ReportEndpoints {

        @Test
        void should_allow_dueno_to_get_daily_summary() throws Exception {
            mvc.perform(get("/api/v1/reports/daily-summary?date=2025-12-01")
                            .header("Authorization", duenoToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_allow_operador_to_get_daily_summary() throws Exception {
            mvc.perform(get("/api/v1/reports/daily-summary?date=2025-12-01")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_allow_gerente_to_get_historical() throws Exception {
            mvc.perform(get("/api/v1/reports/historical?from=2025-12-01&to=2025-12-01")
                            .header("Authorization", gerenteToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_403_when_operador_gets_historical() throws Exception {
            mvc.perform(get("/api/v1/reports/historical?from=2025-12-01&to=2025-12-01")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_gerente_gets_employee_performance() throws Exception {
            mvc.perform(get("/api/v1/reports/employee-performance?from=2025-12-01&to=2025-12-01")
                            .header("Authorization", gerenteToken))
                    .andExpect(status().isForbidden());
        }
    }

    // -------------------------------------------------------------------------
    // Audit events — DUENO only
    // -------------------------------------------------------------------------

    @Nested
    class AuditEventEndpoints {

        @Test
        void should_allow_dueno_to_list_audit_events() throws Exception {
            mvc.perform(get("/api/v1/audit-events")
                            .header("Authorization", duenoToken))
                    .andExpect(status().isOk());
        }

        @Test
        void should_return_403_when_gerente_lists_audit_events() throws Exception {
            mvc.perform(get("/api/v1/audit-events")
                            .header("Authorization", gerenteToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_lists_audit_events() throws Exception {
            mvc.perform(get("/api/v1/audit-events")
                            .header("Authorization", operadorToken))
                    .andExpect(status().isForbidden());
        }
    }

    // -------------------------------------------------------------------------
    // Money — withdrawals and advances require GERENTE; expenses require OPERADOR
    // -------------------------------------------------------------------------

    @Nested
    class MoneyEndpoints {

        @Test
        void should_return_403_when_operador_creates_withdrawal() throws Exception {
            mvc.perform(post("/api/v1/withdrawals")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "withdrawalDate": "2026-01-01",
                                      "amount": 100.00,
                                      "reason": "blocked"
                                    }
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_creates_employee_advance() throws Exception {
            mvc.perform(post("/api/v1/employee-advances")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "employeeId": 1,
                                      "advanceDate": "2026-01-01",
                                      "amount": 50.00,
                                      "reason": "blocked"
                                    }
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_allow_operador_to_create_expense() throws Exception {
            // Expenses are permitted for OPERADOR; we expect 400 (validation)
            // not 403, proving security passed.
            mvc.perform(post("/api/v1/expenses")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }
    }

    // -------------------------------------------------------------------------
    // Corrections — DUENO only
    // -------------------------------------------------------------------------

    @Nested
    class CorrectionEndpoints {

        @Test
        void should_return_403_when_gerente_unlocks_payroll_period() throws Exception {
            mvc.perform(post("/api/v1/corrections/payroll-periods/999999/unlock")
                            .header("Authorization", gerenteToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"reason": "blocked"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_return_403_when_operador_reopens_shift() throws Exception {
            mvc.perform(post("/api/v1/corrections/shifts/999999/reopen")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"reason": "blocked"}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_allow_dueno_to_reopen_shift_that_does_not_exist_and_get_404() throws Exception {
            // Security passes for DUENO; service throws EntityNotFoundException.
            mvc.perform(post("/api/v1/corrections/shifts/999999/reopen")
                            .header("Authorization", duenoToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"reason": "audit test"}
                                    """))
                    .andExpect(status().isNotFound());
        }
    }

    // -------------------------------------------------------------------------
    // Shift close — GERENTE minimum
    // -------------------------------------------------------------------------

    @Nested
    class ShiftCloseEndpoints {

        @Test
        void should_return_403_when_operador_closes_shift() throws Exception {
            mvc.perform(post("/api/v1/shifts/999999/close")
                            .header("Authorization", operadorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"cashCountId": 1}
                                    """))
                    .andExpect(status().isForbidden());
        }

        @Test
        void should_allow_gerente_to_close_shift_and_get_404_for_unknown_shift() throws Exception {
            // Security passes for GERENTE; service throws EntityNotFoundException.
            mvc.perform(post("/api/v1/shifts/999999/close")
                            .header("Authorization", gerenteToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"cashCountId": 1}
                                    """))
                    .andExpect(status().isNotFound());
        }
    }

    // -------------------------------------------------------------------------
    // Token validity — expired/tampered token must return 401
    // -------------------------------------------------------------------------

    @Nested
    class TokenValidity {

        @Test
        void should_return_401_when_bearer_token_is_malformed() throws Exception {
            mvc.perform(get("/api/v1/tickets")
                            .header("Authorization", "Bearer not.a.real.jwt"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        void should_return_401_when_authorization_header_scheme_is_wrong() throws Exception {
            // "Basic" scheme instead of "Bearer"
            mvc.perform(get("/api/v1/tickets")
                            .header("Authorization", "Basic dXNlcjpwYXNz"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Tries to create the user. Swallows duplicate-username 400 so tests
     * are idempotent across repeated runs against the same Postgres container.
     */
    private void ensureUser(String username, String password, String fullName, String role)
            throws Exception {
        mvc.perform(post("/api/v1/admin/users")
                .header("Authorization",
                        TestAuthHelper.bearerToken(mvc, objectMapper, "dueno", "cambia-esto-123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "username": "%s",
                          "password": "%s",
                          "fullName": "%s",
                          "role": "%s"
                        }
                        """.formatted(username, password, fullName, role)));
        // We intentionally do not assert the status here: 201 on first run,
        // 400 on subsequent runs — both are acceptable for setup.
    }
}
