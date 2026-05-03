package com.lavadero.api.cash.web;

import com.lavadero.api.cash.domain.CashCount;
import com.lavadero.api.operations.domain.TicketCurrency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public final class CashCountDtos {
    private CashCountDtos() {
    }

    public record CreateCashCountRequest(
            @NotNull Long shiftId,
            @NotNull TicketCurrency currency,
            @Min(0) Integer bills1000,
            @Min(0) Integer bills500,
            @Min(0) Integer bills200,
            @Min(0) Integer bills100,
            @Min(0) Integer bills50,
            @Min(0) Integer bills20,
            @Min(0) Integer coins10,
            @Min(0) Integer coins5,
            @Min(0) Integer coins2,
            @Min(0) Integer coins1,
            @Min(0) Integer coins05,
            @DecimalMin(value = "0.00") BigDecimal morrallaTotal) {
    }

    public record CashCountResponse(Long id, Long shiftId, TicketCurrency currency, int bills1000, int bills500,
            int bills200, int bills100, int bills50, int bills20, int coins10, int coins5, int coins2, int coins1,
            int coins05, BigDecimal morrallaTotal, BigDecimal totalCounted, Instant createdAt, Instant updatedAt) {
        public static CashCountResponse from(CashCount cashCount) {
            return new CashCountResponse(cashCount.getId(), cashCount.getShift().getId(), cashCount.getCurrency(),
                    cashCount.getBills1000(), cashCount.getBills500(), cashCount.getBills200(),
                    cashCount.getBills100(), cashCount.getBills50(), cashCount.getBills20(), cashCount.getCoins10(),
                    cashCount.getCoins5(), cashCount.getCoins2(), cashCount.getCoins1(), cashCount.getCoins05(),
                    cashCount.getMorrallaTotal(), cashCount.getTotalCounted(), cashCount.getCreatedAt(),
                    cashCount.getUpdatedAt());
        }
    }
}
