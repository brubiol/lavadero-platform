package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.service.ServicePriceService;
import com.lavadero.api.catalog.web.ServicePriceDtos.CreateServicePriceRequest;
import com.lavadero.api.catalog.web.ServicePriceDtos.ServicePriceResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/service-prices")
public class ServicePriceController {
    private final ServicePriceService servicePrices;

    public ServicePriceController(ServicePriceService servicePrices) {
        this.servicePrices = servicePrices;
    }

    @GetMapping
    public List<ServicePriceResponse> list(
            @RequestParam(name = "effective_on", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveOn) {
        return servicePrices.list(effectiveOn).stream().map(ServicePriceResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServicePriceResponse create(@Valid @RequestBody CreateServicePriceRequest request) {
        return ServicePriceResponse.from(servicePrices.create(request));
    }
}
