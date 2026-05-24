package com.lavadero.api.ai.forecast.domain;

import java.time.LocalDate;

/**
 * Fitted coefficients for the seasonal-naive forecaster.
 *
 * <p>Each factor is a multiplier vs. the overall historical mean ({@link #baseline}).
 * A {@code dowFactors[5]} of 1.4 means Saturdays run 40% above average.
 * Coefficients are interpretable enough to sanity-check directly.
 */
public record ForecastModel(
        double baseline,
        double trendSlope,
        double[] dowFactors,
        double[] monthFactors,
        double residualSigma,
        LocalDate fittedThrough,
        int trainingSize) {

    public String version() {
        // Stable, debuggable version string: training size + last training date + sigma.
        // Two refits over the same data on the same day produce the same version.
        return "snf-1.0/n=%d/through=%s/sigma=%.2f".formatted(trainingSize, fittedThrough, residualSigma);
    }
}
