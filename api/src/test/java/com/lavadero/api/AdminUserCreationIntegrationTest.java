package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "lavadero.auth.enabled=true")
@TestPropertySource(properties = "lavadero.auth.enabled=true")
class AdminUserCreationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_create_user_with_specified_role() throws Exception {
        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", bearerToken("dueno", "cambia-esto-123"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_operador",
                                  "password": "supersecret123",
                                  "fullName": "Test Operador",
                                  "role": "OPERADOR"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("admin_test_operador"))
                .andExpect(jsonPath("$.role").value("OPERADOR"))
                .andExpect(jsonPath("$.fullName").value("Test Operador"));
    }

    @Test
    void should_reject_duplicate_username() throws Exception {
        String duenoToken = bearerToken("dueno", "cambia-esto-123");
        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", duenoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_dup",
                                  "password": "supersecret123",
                                  "fullName": "First",
                                  "role": "GERENTE"
                                }
                                """))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", duenoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_dup",
                                  "password": "anotherpass123",
                                  "fullName": "Second",
                                  "role": "OPERADOR"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_reject_password_shorter_than_8_chars() throws Exception {
        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", bearerToken("dueno", "cambia-esto-123"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_shortpw",
                                  "password": "short",
                                  "fullName": "X",
                                  "role": "OPERADOR"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void created_user_can_authenticate_via_login() throws Exception {
        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", bearerToken("dueno", "cambia-esto-123"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_login",
                                  "password": "supersecret123",
                                  "fullName": "Login Test",
                                  "role": "GERENTE"
                                }
                                """))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_login",
                                  "password": "supersecret123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.role").value("GERENTE"));
    }

    @Test
    void should_reject_admin_user_creation_without_dueno_role() throws Exception {
        String duenoToken = bearerToken("dueno", "cambia-esto-123");
        createUser("admin_test_manager", "supersecret123", "Manager", "GERENTE", duenoToken);
        createUser("admin_test_operator", "supersecret123", "Operator", "OPERADOR", duenoToken);

        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", bearerToken("admin_test_manager", "supersecret123"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_forbidden_by_manager",
                                  "password": "supersecret123",
                                  "fullName": "Forbidden",
                                  "role": "OPERADOR"
                                }
                                """))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", bearerToken("admin_test_operator", "supersecret123"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_forbidden_by_operator",
                                  "password": "supersecret123",
                                  "fullName": "Forbidden",
                                  "role": "OPERADOR"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void should_reject_admin_user_creation_without_token() throws Exception {
        mvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "admin_test_no_token",
                                  "password": "supersecret123",
                                  "fullName": "No Token",
                                  "role": "OPERADOR"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    private void createUser(String username, String password, String fullName, String role, String token)
            throws Exception {
        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "%s",
                                  "fullName": "%s",
                                  "role": "%s"
                                }
                                """.formatted(username, password, fullName, role)))
                .andExpect(status().isCreated());
    }

    private String bearerToken(String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "%s",
                                  "password": "%s"
                                }
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return "Bearer " + body.get("accessToken").asText();
    }
}
