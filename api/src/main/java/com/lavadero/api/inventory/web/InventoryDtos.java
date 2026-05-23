package com.lavadero.api.inventory.web;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.inventory.domain.MovementType;
import com.lavadero.api.inventory.domain.Product;
import com.lavadero.api.inventory.domain.ProductCategory;
import com.lavadero.api.inventory.domain.ProductMovement;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class InventoryDtos {
    private InventoryDtos() {
    }

    public record CreateProductRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 60) String sku,
            @NotNull @DecimalMin("0.00") BigDecimal currentUnitPrice,
            Boolean trackInventory,
            ProductCategory category) {
    }

    public record UpdateProductRequest(
            @Size(min = 1, max = 120) String name,
            @Size(min = 1, max = 60) String sku,
            @DecimalMin("0.00") BigDecimal currentUnitPrice,
            Boolean trackInventory,
            Boolean active,
            ProductCategory category) {
    }

    public record ProductResponse(Long id, String name, String sku, BigDecimal currentUnitPrice,
            boolean trackInventory, boolean active, ProductCategory category, Instant createdAt, Instant updatedAt) {
        public static ProductResponse from(Product product) {
            return new ProductResponse(product.getId(), product.getName(), product.getSku(),
                    product.getCurrentUnitPrice(), product.isTrackInventory(), product.isActive(),
                    product.getCategory(), product.getCreatedAt(), product.getUpdatedAt());
        }
    }

    public record CreateSaleRequest(@NotNull Long productId, @NotNull @DecimalMin("0.01") BigDecimal quantity,
            BigDecimal unitPrice, Boolean fiado, Instant movementDate, Long employeeId, Long shiftId) {
    }

    public record CreatePurchaseRequest(@NotNull Long productId, @NotNull @DecimalMin("0.01") BigDecimal quantity,
            @NotNull @DecimalMin("0.00") BigDecimal unitPrice, Instant movementDate) {
    }

    public record CreateAdjustmentRequest(@NotNull Long productId, @NotNull BigDecimal quantity,
            @NotBlank @Size(max = 500) String reason, Instant movementDate) {
    }

    public record MovementResponse(Long id, Long productId, String productName, MovementType movementType,
            Instant movementDate, BigDecimal quantity, BigDecimal unitPrice, BigDecimal totalAmount, String reason,
            Long employeeId, String employeeName) {
        public static MovementResponse from(ProductMovement movement) {
            Employee emp = movement.getEmployee();
            return new MovementResponse(movement.getId(), movement.getProduct().getId(), movement.getProduct().getName(),
                    movement.getMovementType(), movement.getMovementDate(), movement.getQuantity(),
                    movement.getUnitPrice(), movement.getTotalAmount(), movement.getReason(),
                    emp != null ? emp.getId() : null, emp != null ? emp.getFullName() : null);
        }
    }

    public record InventorySnapshotResponse(Instant asOf, List<ProductSnapshotResponse> products) {
    }

    public record ProductSnapshotResponse(ProductResponse product, BigDecimal quantityOnHand,
            List<MovementResponse> recentMovements) {
    }
}
