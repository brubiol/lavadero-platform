package com.lavadero.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasSize;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Phase7InventoryIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void should_calculate_snapshot_from_movements() throws Exception {
        Long productId = createProduct("P7 Shampoo", "P7_SHAMPOO");
        createPurchase(productId, "10.00", "25.00", "2026-12-01T10:00:00Z");
        createSale(productId, "2.00", "30.00", false, "2026-12-01T11:00:00Z");
        createSale(productId, "1.00", "30.00", true, "2026-12-01T12:00:00Z");
        createAdjustment(productId, "-1.00", "Merma", "2026-12-01T13:00:00Z");

        MvcResult result = mvc.perform(get("/api/v1/inventory/snapshot?as_of=2026-12-01T14:00:00Z"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode product = productFromSnapshot(result, productId);
        assertThat(product.get("quantityOnHand").decimalValue()).isEqualByComparingTo("6.00");
        assertThat(product.get("recentMovements")).hasSize(4);
    }

    @Test
    void should_reject_adjustment_without_reason() throws Exception {
        Long productId = createProduct("P7 Armor", "P7_ARMOR");

        mvc.perform(post("/api/v1/inventory/adjustments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": 1.00
                                }
                                """.formatted(productId)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void should_list_active_products_only() throws Exception {
        createProduct("P7 Active", "P7_ACTIVE");

        mvc.perform(get("/api/v1/products?active=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.sku == 'P7_ACTIVE')]", hasSize(1)));
    }

    private Long createProduct(String name, String sku) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "sku": "%s",
                                  "currentUnitPrice": 30.00,
                                  "trackInventory": true
                                }
                                """.formatted(name, sku)))
                .andExpect(status().isCreated())
                .andReturn();
        return idFrom(result);
    }

    private void createPurchase(Long productId, String quantity, String unitPrice, String movementDate)
            throws Exception {
        mvc.perform(post("/api/v1/inventory/purchases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": %s,
                                  "unitPrice": %s,
                                  "movementDate": "%s"
                                }
                                """.formatted(productId, quantity, unitPrice, movementDate)))
                .andExpect(status().isCreated());
    }

    private void createSale(Long productId, String quantity, String unitPrice, boolean fiado, String movementDate)
            throws Exception {
        mvc.perform(post("/api/v1/inventory/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": %s,
                                  "unitPrice": %s,
                                  "fiado": %s,
                                  "movementDate": "%s"
                                }
                                """.formatted(productId, quantity, unitPrice, fiado, movementDate)))
                .andExpect(status().isCreated());
    }

    private void createAdjustment(Long productId, String quantity, String reason, String movementDate)
            throws Exception {
        mvc.perform(post("/api/v1/inventory/adjustments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": %d,
                                  "quantity": %s,
                                  "reason": "%s",
                                  "movementDate": "%s"
                                }
                                """.formatted(productId, quantity, reason, movementDate)))
                .andExpect(status().isCreated());
    }

    private Long idFrom(MvcResult result) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("id").asLong();
    }

    private JsonNode productFromSnapshot(MvcResult result, Long productId) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode product : node.get("products")) {
            if (product.get("product").get("id").asLong() == productId) {
                return product;
            }
        }
        throw new AssertionError("Product not found in snapshot");
    }
}
