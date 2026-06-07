package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.service.DiscountService;
import com.lavadero.api.catalog.web.DiscountDtos.CreateDiscountRequest;
import com.lavadero.api.catalog.web.DiscountDtos.DiscountResponse;
import com.lavadero.api.catalog.web.DiscountDtos.UpdateDiscountRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Manager-only discount catalog. Gated to GERENTE via SecurityConfig
 * ("/api/v1/discounts/**"). Cashiers never touch discounts during ticket capture.
 */
@RestController
@RequestMapping("/api/v1/discounts")
public class DiscountController {
    private final DiscountService discounts;

    public DiscountController(DiscountService discounts) {
        this.discounts = discounts;
    }

    @GetMapping
    public List<DiscountResponse> list() {
        return discounts.list().stream().map(DiscountResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DiscountResponse create(@Valid @RequestBody CreateDiscountRequest request) {
        return DiscountResponse.from(discounts.create(request));
    }

    @PatchMapping("/{id}")
    public DiscountResponse update(@PathVariable Long id, @Valid @RequestBody UpdateDiscountRequest request) {
        return DiscountResponse.from(discounts.update(id, request));
    }
}
