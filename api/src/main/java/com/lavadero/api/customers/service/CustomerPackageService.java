package com.lavadero.api.customers.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.catalog.domain.ServicePrice;
import com.lavadero.api.catalog.domain.ServiceType;
import com.lavadero.api.catalog.domain.VehicleSize;
import com.lavadero.api.catalog.repository.ServicePriceRepository;
import com.lavadero.api.catalog.service.ServiceTypeService;
import com.lavadero.api.catalog.service.VehicleSizeService;
import com.lavadero.api.customers.domain.Customer;
import com.lavadero.api.customers.domain.CustomerPackage;
import com.lavadero.api.customers.domain.PackageStatus;
import com.lavadero.api.customers.repository.CustomerPackageRepository;
import com.lavadero.api.customers.repository.CustomerRepository;
import com.lavadero.api.customers.web.CustomerPackageDtos.BuyPackageRequest;
import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.TicketCurrency;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerPackageService {
    private static final ZoneId MX_ZONE = ZoneId.of("America/Monterrey");

    private final CustomerPackageRepository packages;
    private final CustomerRepository customers;
    private final ServiceTypeService serviceTypes;
    private final VehicleSizeService vehicleSizes;
    private final ServicePriceRepository servicePrices;
    private final AuditService audit;

    public CustomerPackageService(CustomerPackageRepository packages, CustomerRepository customers,
            ServiceTypeService serviceTypes, VehicleSizeService vehicleSizes, ServicePriceRepository servicePrices,
            AuditService audit) {
        this.packages = packages;
        this.customers = customers;
        this.serviceTypes = serviceTypes;
        this.vehicleSizes = vehicleSizes;
        this.servicePrices = servicePrices;
        this.audit = audit;
    }

    @Transactional
    public CustomerPackage buy(Long customerId, BuyPackageRequest request) {
        Customer customer = customers.findByIdAndActiveTrue(customerId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        ServiceType serviceType = serviceTypes.get(request.serviceTypeId());
        VehicleSize vehicleSize = vehicleSizes.get(request.vehicleSizeId());
        BigDecimal unitPrice = currentPrice(serviceType.getId(), vehicleSize.getId());
        BigDecimal amountPaid = request.amountPaid() != null
                ? request.amountPaid().setScale(2, RoundingMode.HALF_UP)
                : unitPrice.multiply(BigDecimal.valueOf(request.washesTotal())).setScale(2, RoundingMode.HALF_UP);
        PaymentMethod paymentMethod = request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.CASH;
        CustomerPackage saved = packages.save(new CustomerPackage(customer, serviceType, vehicleSize,
                request.washesTotal(), unitPrice, amountPaid, TicketCurrency.MXN, paymentMethod, request.notes(),
                Instant.now()));
        audit.record("CUSTOMER_PACKAGE_BOUGHT", "CUSTOMER_PACKAGE", saved.getId(), customer.getName(),
                request.washesTotal() + " lavados " + serviceType.getName() + " / " + vehicleSize.getName()
                        + " = $" + amountPaid.toPlainString());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<CustomerPackage> listForCustomer(Long customerId) {
        return packages.findByCustomerIdOrderByPurchasedAtDesc(customerId);
    }

    @Transactional(readOnly = true)
    public List<CustomerPackage> activeForCustomer(Long customerId) {
        return packages.findByCustomerIdAndStatusOrderByPurchasedAtAsc(customerId, PackageStatus.ACTIVE);
    }

    @Transactional
    public CustomerPackage cancel(Long packageId) {
        CustomerPackage pkg = packages.findWithDetailsById(packageId)
                .orElseThrow(() -> new EntityNotFoundException("Package not found"));
        pkg.cancel();
        audit.record("CUSTOMER_PACKAGE_CANCELLED", "CUSTOMER_PACKAGE", pkg.getId(), pkg.getCustomer().getName(),
                "Cancelado con " + pkg.remaining() + " lavados restantes");
        return pkg;
    }

    private BigDecimal currentPrice(Long serviceTypeId, Long vehicleSizeId) {
        return servicePrices.findCurrentPrices(serviceTypeId, vehicleSizeId, TicketCurrency.MXN.name(),
                        LocalDate.now(MX_ZONE), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(ServicePrice::getAmount)
                .orElseThrow(() -> new IllegalArgumentException("No hay precio de catálogo para ese servicio/vehículo"));
    }
}
