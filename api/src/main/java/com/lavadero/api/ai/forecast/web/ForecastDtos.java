package com.lavadero.api.ai.forecast.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ForecastDtos {

    private ForecastDtos() {
    }

    public record ForecastPointResponse(
            LocalDate date,
            int predictedCars,
            int predictedCarsLow,
            int predictedCarsHigh,
            BigDecimal predictedRevenueMxn,
            BigDecimal predictedRevenueMxnLow,
            BigDecimal predictedRevenueMxnHigh,
            BigDecimal expectedPrecipitationMm,
            BigDecimal expectedTempMaxC) {
    }

    public record ForecastResponse(
            LocalDate snapshotDate,
            Instant generatedAt,
            String modelVersion,
            int horizonDays,
            Double carsBacktestMape,
            Double revenueBacktestMape,
            List<ForecastPointResponse> points) {
    }
}
