package com.lavadero.api.ai.forecast.domain;

import java.time.LocalDate;

/**
 * Per-day weather covariates fed into {@link com.lavadero.api.ai.forecast.service.WeatherAdjustedForecaster}.
 * {@code precipYesterdayMm} is computed by the caller from the prior day's value
 * (0 when no prior data exists).
 */
public record WeatherFeatures(LocalDate date, double precipMm, double tempMaxC, double precipYesterdayMm) {

    public static final int DIMENSION = 3;

    public double[] asVector() {
        return new double[] { precipMm, tempMaxC, precipYesterdayMm };
    }
}
