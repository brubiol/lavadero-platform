package com.lavadero.api.ai.weather.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Normalized one-day weather observation or forecast, regardless of which
 * Open-Meteo endpoint it came from. Nullable wind because the archive API
 * occasionally returns nulls and we don't gate on it.
 */
public record DailyWeatherDto(
        LocalDate date,
        BigDecimal precipitationMm,
        BigDecimal tempMaxC,
        BigDecimal tempMinC,
        BigDecimal windMaxKph) {
}
