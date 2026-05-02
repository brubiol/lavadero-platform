package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.service.ServiceTypeService;
import com.lavadero.api.catalog.web.ServiceTypeDtos.CreateServiceTypeRequest;
import com.lavadero.api.catalog.web.ServiceTypeDtos.ServiceTypeResponse;
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
@RequestMapping("/api/v1/service-types")
public class ServiceTypeController {
    private final ServiceTypeService serviceTypes;

    public ServiceTypeController(ServiceTypeService serviceTypes) {
        this.serviceTypes = serviceTypes;
    }

    @GetMapping
    public List<ServiceTypeResponse> list() {
        return serviceTypes.list().stream().map(ServiceTypeResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceTypeResponse create(@Valid @RequestBody CreateServiceTypeRequest request) {
        return ServiceTypeResponse.from(serviceTypes.create(request));
    }
}
