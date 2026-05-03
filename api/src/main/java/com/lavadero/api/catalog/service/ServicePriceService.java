package com.lavadero.api.catalog.service;

import com.lavadero.api.catalog.domain.ServicePrice;
import com.lavadero.api.catalog.domain.ServiceType;
import com.lavadero.api.catalog.domain.VehicleSize;
import com.lavadero.api.catalog.repository.ServicePriceRepository;
import com.lavadero.api.catalog.web.ServicePriceDtos.CreateServicePriceRequest;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicePriceService {
    private static final LocalDate OPEN_ENDED = LocalDate.of(9999, 12, 31);

    private final ServicePriceRepository servicePrices;
    private final ServiceTypeService serviceTypes;
    private final VehicleSizeService vehicleSizes;

    public ServicePriceService(ServicePriceRepository servicePrices, ServiceTypeService serviceTypes,
            VehicleSizeService vehicleSizes) {
        this.servicePrices = servicePrices;
        this.serviceTypes = serviceTypes;
        this.vehicleSizes = vehicleSizes;
    }

    @Transactional(readOnly = true)
    public List<ServicePrice> list(LocalDate effectiveOn) {
        if (effectiveOn == null) {
            return servicePrices.findAllWithCatalog();
        }
        return servicePrices.findEffectiveOn(effectiveOn);
    }

    @Transactional
    public ServicePrice create(CreateServicePriceRequest request) {
        if (request.effectiveTo() != null && request.effectiveTo().isBefore(request.effectiveFrom())) {
            throw new IllegalArgumentException("effectiveTo must be on or after effectiveFrom");
        }

        String currency = request.currency() == null ? "MXN" : request.currency();
        LocalDate effectiveTo = request.effectiveTo() == null ? OPEN_ENDED : request.effectiveTo();
        if (servicePrices.existsOverlapping(request.serviceTypeId(), request.vehicleSizeId(), currency,
                request.effectiveFrom(), effectiveTo)) {
            throw new IllegalArgumentException("Service price overlaps an existing effective date range");
        }

        ServiceType serviceType = serviceTypes.get(request.serviceTypeId());
        VehicleSize vehicleSize = vehicleSizes.get(request.vehicleSizeId());
        return servicePrices.save(new ServicePrice(serviceType, vehicleSize, request.amount(), currency,
                request.effectiveFrom(), request.effectiveTo()));
    }
}
