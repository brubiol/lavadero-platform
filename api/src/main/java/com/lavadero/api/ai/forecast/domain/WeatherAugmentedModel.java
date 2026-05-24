package com.lavadero.api.ai.forecast.domain;

/**
 * Wraps a fitted seasonal model with the OLS coefficients of its weather
 * residual regression. {@code residualSigmaWithWeather} is recomputed after
 * the OLS pass, so prediction intervals tighten on weather-explainable days.
 */
public record WeatherAugmentedModel(
        ForecastModel seasonal,
        double[] betas,
        double residualSigmaWithWeather) {

    public String version() {
        return seasonal.version()
                + "/wb=[%.2f,%.2f,%.2f,%.2f]".formatted(
                        betas.length > 0 ? betas[0] : 0.0,
                        betas.length > 1 ? betas[1] : 0.0,
                        betas.length > 2 ? betas[2] : 0.0,
                        betas.length > 3 ? betas[3] : 0.0);
    }
}
