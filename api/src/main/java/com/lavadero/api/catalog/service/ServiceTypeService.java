package com.lavadero.api.catalog.service;

import com.lavadero.api.catalog.domain.ServiceType;
import com.lavadero.api.catalog.repository.ServiceTypeRepository;
import com.lavadero.api.catalog.web.ServiceTypeDtos.CreateServiceTypeRequest;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServiceTypeService {
    private final ServiceTypeRepository serviceTypes;

    public ServiceTypeService(ServiceTypeRepository serviceTypes) {
        this.serviceTypes = serviceTypes;
    }

    @Transactional(readOnly = true)
    public List<ServiceType> list() {
        return serviceTypes.findByActiveTrueOrderByNameAsc();
    }

    @Transactional
    public ServiceType create(CreateServiceTypeRequest request) {
        if (serviceTypes.existsByCode(request.code())) {
            throw new IllegalArgumentException("Service type code already exists");
        }
        return serviceTypes.save(new ServiceType(request.code(), request.name(), request.description()));
    }

    @Transactional(readOnly = true)
    public ServiceType get(Long id) {
        return serviceTypes.findById(id).orElseThrow(() -> new EntityNotFoundException("Service type not found"));
    }
}
