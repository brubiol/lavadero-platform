package com.lavadero.api.inventory.web;

import com.lavadero.api.inventory.service.InventoryService;
import com.lavadero.api.inventory.web.InventoryDtos.CreateProductRequest;
import com.lavadero.api.inventory.web.InventoryDtos.ProductResponse;
import com.lavadero.api.inventory.web.InventoryDtos.UpdateProductRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    private final InventoryService inventory;

    public ProductController(InventoryService inventory) {
        this.inventory = inventory;
    }

    @GetMapping
    public List<ProductResponse> list(@RequestParam(required = false) Boolean active) {
        return inventory.listProducts(active).stream().map(ProductResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody CreateProductRequest request) {
        return ProductResponse.from(inventory.createProduct(request));
    }

    @PatchMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody UpdateProductRequest request) {
        return ProductResponse.from(inventory.updateProduct(id, request));
    }
}
