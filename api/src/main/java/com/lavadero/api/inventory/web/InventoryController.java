package com.lavadero.api.inventory.web;

import com.lavadero.api.inventory.service.InventoryService;
import com.lavadero.api.inventory.web.InventoryDtos.CreateAdjustmentRequest;
import com.lavadero.api.inventory.web.InventoryDtos.CreatePurchaseRequest;
import com.lavadero.api.inventory.web.InventoryDtos.CreateSaleRequest;
import com.lavadero.api.inventory.web.InventoryDtos.InventorySnapshotResponse;
import com.lavadero.api.inventory.web.InventoryDtos.MovementResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
    private final InventoryService inventory;

    public InventoryController(InventoryService inventory) {
        this.inventory = inventory;
    }

    @GetMapping("/snapshot")
    public InventorySnapshotResponse snapshot(@RequestParam(name = "as_of", required = false) Instant asOf) {
        return inventory.snapshot(asOf);
    }

    @PostMapping("/sales")
    @ResponseStatus(HttpStatus.CREATED)
    public MovementResponse sale(@Valid @RequestBody CreateSaleRequest request) {
        return MovementResponse.from(inventory.sale(request));
    }

    @PostMapping("/purchases")
    @ResponseStatus(HttpStatus.CREATED)
    public MovementResponse purchase(@Valid @RequestBody CreatePurchaseRequest request) {
        return MovementResponse.from(inventory.purchase(request));
    }

    @PostMapping("/adjustments")
    @ResponseStatus(HttpStatus.CREATED)
    public MovementResponse adjustment(@Valid @RequestBody CreateAdjustmentRequest request) {
        return MovementResponse.from(inventory.adjustment(request));
    }
}
