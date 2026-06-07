package com.lavadero.api.customers.web;

import com.lavadero.api.customers.domain.CustomerPackage;
import com.lavadero.api.operations.domain.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class CustomerPackageDtos {
    private CustomerPackageDtos() {
    }

    public record BuyPackageRequest(
            @NotNull Long serviceTypeId,
            @NotNull Long vehicleSizeId,
            @Min(1) int washesTotal,
            // Optional — total actually charged (e.g. a bulk discount). When null,
            // the server bills washesTotal x the catalog unit price.
            @DecimalMin("0.00") BigDecimal amountPaid,
            PaymentMethod paymentMethod,
            @Size(max = 500) String notes) {
    }

    public record CustomerPackageResponse(
            Long id,
            Long customerId,
            Long serviceTypeId,
            String serviceTypeName,
            Long vehicleSizeId,
            String vehicleSizeName,
            int washesTotal,
            int washesUsed,
            int remaining,
            BigDecimal unitPrice,
            BigDecimal amountPaid,
            String currency,
            String paymentMethod,
            String status,
            String notes,
            Instant purchasedAt) {
        public static CustomerPackageResponse from(CustomerPackage p) {
            return new CustomerPackageResponse(p.getId(), p.getCustomer().getId(),
                    p.getServiceType().getId(), p.getServiceType().getName(),
                    p.getVehicleSize().getId(), p.getVehicleSize().getName(),
                    p.getWashesTotal(), p.getWashesUsed(), p.remaining(), p.getUnitPrice(), p.getAmountPaid(),
                    p.getCurrency().name(), p.getPaymentMethod().name(), p.getStatus().name(), p.getNotes(),
                    p.getPurchasedAt());
        }
    }
}
