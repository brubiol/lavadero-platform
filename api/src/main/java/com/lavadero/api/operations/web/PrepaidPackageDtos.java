package com.lavadero.api.operations.web;

import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.PrepaidPackage;
import com.lavadero.api.operations.domain.TicketCurrency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class PrepaidPackageDtos {
    private PrepaidPackageDtos() {}

    public record CreateRequest(
            @NotNull Long businessDayId,
            @NotNull Long shiftId,
            @Min(1) int washesIncluded,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            TicketCurrency currency,
            PaymentMethod paymentMethod,
            @Size(max = 500) String notes,
            Instant occurredAt) {
    }

    public record PackageResponse(
            Long id,
            Long businessDayId,
            Long shiftId,
            int washesIncluded,
            BigDecimal amount,
            String currency,
            String paymentMethod,
            String notes,
            Instant occurredAt,
            Instant createdAt) {
        public static PackageResponse from(PrepaidPackage p) {
            return new PackageResponse(
                    p.getId(),
                    p.getBusinessDay().getId(),
                    p.getShift().getId(),
                    p.getWashesIncluded(),
                    p.getAmount(),
                    p.getCurrency().name(),
                    p.getPaymentMethod().name(),
                    p.getNotes(),
                    p.getOccurredAt(),
                    p.getCreatedAt());
        }
    }
}
