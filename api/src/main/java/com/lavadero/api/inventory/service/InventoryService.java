package com.lavadero.api.inventory.service;

import com.lavadero.api.inventory.domain.MovementType;
import com.lavadero.api.inventory.domain.Product;
import com.lavadero.api.inventory.domain.ProductMovement;
import com.lavadero.api.inventory.repository.ProductMovementRepository;
import com.lavadero.api.inventory.repository.ProductRepository;
import com.lavadero.api.inventory.web.InventoryDtos.CreateAdjustmentRequest;
import com.lavadero.api.inventory.web.InventoryDtos.CreateProductRequest;
import com.lavadero.api.inventory.web.InventoryDtos.CreatePurchaseRequest;
import com.lavadero.api.inventory.web.InventoryDtos.CreateSaleRequest;
import com.lavadero.api.inventory.web.InventoryDtos.InventorySnapshotResponse;
import com.lavadero.api.inventory.web.InventoryDtos.MovementResponse;
import com.lavadero.api.inventory.web.InventoryDtos.ProductResponse;
import com.lavadero.api.inventory.web.InventoryDtos.ProductSnapshotResponse;
import com.lavadero.api.inventory.web.InventoryDtos.UpdateProductRequest;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final ProductRepository products;
    private final ProductMovementRepository movements;

    public InventoryService(ProductRepository products, ProductMovementRepository movements) {
        this.products = products;
        this.movements = movements;
    }

    @Transactional(readOnly = true)
    public List<Product> listProducts(Boolean active) {
        if (active == null) {
            return products.findAllByOrderByNameAsc();
        }
        return products.findByActiveOrderByNameAsc(active);
    }

    @Transactional
    public Product createProduct(CreateProductRequest request) {
        boolean trackInventory = request.trackInventory() == null || request.trackInventory();
        return products.save(new Product(request.name().trim(), request.sku().trim().toUpperCase(),
                money(request.currentUnitPrice()), trackInventory));
    }

    @Transactional
    public Product updateProduct(Long id, UpdateProductRequest request) {
        Product product = getProduct(id);
        product.update(trim(request.name()), trimUpper(request.sku()), moneyOrNull(request.currentUnitPrice()),
                request.trackInventory(), request.active());
        return product;
    }

    @Transactional(readOnly = true)
    public InventorySnapshotResponse snapshot(Instant asOf) {
        Instant effectiveAsOf = asOf == null ? Instant.now() : asOf;
        Map<Long, BigDecimal> quantities = new HashMap<>();
        for (ProductMovement movement : movements.findByMovementDateLessThanEqualOrderByMovementDateAscCreatedAtAsc(
                effectiveAsOf)) {
            Long productId = movement.getProduct().getId();
            quantities.merge(productId, movement.getQuantity(), BigDecimal::add);
        }
        List<ProductSnapshotResponse> rows = products.findAllByOrderByNameAsc().stream()
                .map(product -> new ProductSnapshotResponse(
                        ProductResponse.from(product),
                        money(quantities.getOrDefault(product.getId(), ZERO)),
                        movements.findTop5ByProductIdAndMovementDateLessThanEqualOrderByMovementDateDescCreatedAtDesc(
                                        product.getId(), effectiveAsOf)
                                .stream()
                                .map(MovementResponse::from)
                                .toList()))
                .toList();
        return new InventorySnapshotResponse(effectiveAsOf, rows);
    }

    @Transactional
    public ProductMovement sale(CreateSaleRequest request) {
        Product product = activeProduct(request.productId());
        BigDecimal quantity = positive(request.quantity(), "quantity must be positive").negate();
        BigDecimal unitPrice = moneyOrDefault(request.unitPrice(), product.getCurrentUnitPrice());
        MovementType type = Boolean.TRUE.equals(request.fiado()) ? MovementType.FIADO : MovementType.SALE;
        return movements.save(new ProductMovement(product, type, movementDate(request.movementDate()), quantity,
                unitPrice, money(unitPrice.multiply(quantity.abs())), null));
    }

    @Transactional
    public ProductMovement purchase(CreatePurchaseRequest request) {
        Product product = activeProduct(request.productId());
        BigDecimal quantity = positive(request.quantity(), "quantity must be positive");
        BigDecimal unitPrice = money(request.unitPrice());
        return movements.save(new ProductMovement(product, MovementType.PURCHASE, movementDate(request.movementDate()),
                quantity, unitPrice, money(unitPrice.multiply(quantity)), null));
    }

    @Transactional
    public ProductMovement adjustment(CreateAdjustmentRequest request) {
        Product product = activeProduct(request.productId());
        BigDecimal quantity = money(request.quantity());
        if (quantity.signum() == 0) {
            throw new IllegalArgumentException("quantity must not be zero");
        }
        if (request.reason() == null || request.reason().isBlank()) {
            throw new IllegalArgumentException("reason is required for adjustments");
        }
        return movements.save(new ProductMovement(product, MovementType.ADJUSTMENT, movementDate(request.movementDate()),
                quantity, null, null, request.reason().trim()));
    }

    private Product getProduct(Long id) {
        return products.findById(id).orElseThrow(() -> new EntityNotFoundException("Product not found"));
    }

    private Product activeProduct(Long id) {
        Product product = getProduct(id);
        if (!product.isActive()) {
            throw new IllegalArgumentException("Product must be active");
        }
        return product;
    }

    private Instant movementDate(Instant value) {
        return value == null ? Instant.now() : value;
    }

    private BigDecimal positive(BigDecimal value, String message) {
        BigDecimal amount = money(value);
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException(message);
        }
        return amount;
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal moneyOrNull(BigDecimal value) {
        return value == null ? null : money(value);
    }

    private BigDecimal moneyOrDefault(BigDecimal value, BigDecimal defaultValue) {
        return value == null ? money(defaultValue) : money(value);
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimUpper(String value) {
        return value == null ? null : value.trim().toUpperCase();
    }
}
