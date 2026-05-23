package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Utility for obtaining real Bearer tokens via the login endpoint.
 *
 * Use this in tests that need lavadero.auth.enabled=true and must exercise
 * RBAC. The methods perform an actual HTTP login so the token is a genuine
 * HMAC-SHA256 JWT accepted by the real security filter chain.
 *
 * The bootstrap owner (dueno / cambia-esto-123) is always available in the
 * test profile via the bootstrapOwner ApplicationRunner in AuthService.
 */
public final class TestAuthHelper {

    private TestAuthHelper() {
    }

    /**
     * Logs in with the given credentials and returns a ready-to-use
     * "Bearer <token>" string for the Authorization header.
     */
    public static String bearerToken(MockMvc mvc, ObjectMapper mapper,
            String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username": "%s", "password": "%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = mapper.readTree(result.getResponse().getContentAsString());
        return "Bearer " + body.get("accessToken").asText();
    }

    /**
     * Creates a user via the admin endpoint (requires a DUENO token) and
     * returns the Bearer token for the newly created user.
     */
    public static String createUserAndGetToken(MockMvc mvc, ObjectMapper mapper,
            String duenoToken, String username, String password,
            String fullName, String role) throws Exception {
        mvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", duenoToken)
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
        return bearerToken(mvc, mapper, username, password);
    }
}
