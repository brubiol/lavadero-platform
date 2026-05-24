package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.inventory.service.InventoryService;
import com.lavadero.api.inventory.web.InventoryDtos.InventorySnapshotResponse;
import com.lavadero.api.inventory.web.InventoryDtos.ProductSnapshotResponse;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class InventorySnapshotTool implements AiTool {
    private static final BigDecimal LOW_THRESHOLD = new BigDecimal("5");

    private final InventoryService inventory;
    private final ObjectMapper objectMapper;

    InventorySnapshotTool(InventoryService inventory, ObjectMapper objectMapper) {
        this.inventory = inventory;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_inventory_snapshot";
    }

    @Override
    public String description() {
        return "Return current stock for every tracked miscellany product (aromas, sodas, tapetes, etc.) "
                + "derived live from the append-only product_movements ledger. Each row has the product "
                + "name, current quantity on hand, and a 'low' flag if quantity ≤ 5. Use for inventory "
                + "questions: 'qué productos están bajos', 'cuánto queda de X'.";
    }

    @Override
    public JsonNode parametersSchema() {
        // No parameters — always returns the current snapshot.
        return objectMapper.createObjectNode()
                .put("type", "object")
                .<ObjectNode>set("properties", objectMapper.createObjectNode());
    }

    @Override
    public JsonNode execute(JsonNode args) {
        try {
            InventorySnapshotResponse snap = inventory.snapshot(Instant.now());
            ObjectNode out = objectMapper.createObjectNode();
            out.put("asOf", snap.asOf().toString());
            var items = objectMapper.createArrayNode();
            int lowCount = 0;
            for (ProductSnapshotResponse p : snap.products()) {
                ObjectNode pn = objectMapper.createObjectNode();
                pn.put("productId", p.product().id());
                pn.put("name", p.product().name());
                pn.put("category", p.product().category() == null ? null : p.product().category().name());
                pn.put("quantityOnHand", p.quantityOnHand());
                boolean low = p.quantityOnHand() != null && p.quantityOnHand().compareTo(LOW_THRESHOLD) <= 0;
                pn.put("low", low);
                if (low) lowCount++;
                items.add(pn);
            }
            out.put("totalProducts", snap.products().size());
            out.put("lowStockCount", lowCount);
            out.set("products", items);
            return out;
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
