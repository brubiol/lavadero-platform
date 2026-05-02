package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.service.VehicleSizeService;
import com.lavadero.api.catalog.web.VehicleSizeDtos.CreateVehicleSizeRequest;
import com.lavadero.api.catalog.web.VehicleSizeDtos.VehicleSizeResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vehicle-sizes")
public class VehicleSizeController {
    private final VehicleSizeService vehicleSizes;

    public VehicleSizeController(VehicleSizeService vehicleSizes) {
        this.vehicleSizes = vehicleSizes;
    }

    @GetMapping
    public List<VehicleSizeResponse> list() {
        return vehicleSizes.list().stream().map(VehicleSizeResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleSizeResponse create(@Valid @RequestBody CreateVehicleSizeRequest request) {
        return VehicleSizeResponse.from(vehicleSizes.create(request));
    }
}
