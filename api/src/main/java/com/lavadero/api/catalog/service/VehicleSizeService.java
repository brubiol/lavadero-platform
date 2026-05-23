package com.lavadero.api.catalog.service;

import com.lavadero.api.catalog.domain.VehicleSize;
import com.lavadero.api.catalog.repository.VehicleSizeRepository;
import com.lavadero.api.catalog.web.VehicleSizeDtos.CreateVehicleSizeRequest;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VehicleSizeService {
    private final VehicleSizeRepository vehicleSizes;

    public VehicleSizeService(VehicleSizeRepository vehicleSizes) {
        this.vehicleSizes = vehicleSizes;
    }

    @Transactional(readOnly = true)
    public List<VehicleSize> list() {
        return vehicleSizes.findByActiveTrueOrderBySortOrderAscNameAsc();
    }

    @Transactional
    public VehicleSize create(CreateVehicleSizeRequest request) {
        if (vehicleSizes.existsByCode(request.code())) {
            throw new IllegalArgumentException("Vehicle size code already exists");
        }
        return vehicleSizes.save(new VehicleSize(request.code(), request.name(), request.sortOrder(),
                request.category()));
    }

    @Transactional(readOnly = true)
    public VehicleSize get(Long id) {
        return vehicleSizes.findById(id).orElseThrow(() -> new EntityNotFoundException("Vehicle size not found"));
    }
}
