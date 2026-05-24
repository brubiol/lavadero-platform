package com.lavadero.api.ai.forecast.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.List;

/**
 * Wire contract for the Python forecast sidecar. Field names are wire-shaped
 * via {@link JsonProperty} (snake_case) so the Java side can keep idiomatic
 * camelCase identifiers without a custom Jackson naming strategy.
 *
 * <p>The contract is symmetric: training rows include the observed {@code value};
 * horizon rows omit it because that is what the model predicts. Calendar and
 * weather covariates are sent as-is; the Python service computes lag features,
 * day-of-year cycles, and days-since-rain itself.
 */
public final class PythonForecastDtos {

    private PythonForecastDtos() {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PythonForecastRequest(
            @JsonProperty("snapshot_date") LocalDate snapshotDate,
            @JsonProperty("horizon_days") int horizonDays,
            @JsonProperty("axis") String axis,
            @JsonProperty("training") List<TrainingRow> training,
            @JsonProperty("horizon") List<HorizonRow> horizon) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record TrainingRow(
            @JsonProperty("date") LocalDate date,
            @JsonProperty("value") double value,
            @JsonProperty("precip_mm") double precipMm,
            @JsonProperty("temp_max_c") double tempMaxC,
            @JsonProperty("temp_min_c") double tempMinC,
            @JsonProperty("wind_max_kph") double windMaxKph,
            @JsonProperty("is_holiday") boolean isHoliday,
            @JsonProperty("day_before_holiday") boolean dayBeforeHoliday,
            @JsonProperty("day_after_holiday") boolean dayAfterHoliday,
            @JsonProperty("is_quincena_post") boolean isQuincenaPost,
            @JsonProperty("is_border_traffic_holiday") boolean isBorderTrafficHoliday,
            @JsonProperty("holiday_name") String holidayName) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record HorizonRow(
            @JsonProperty("date") LocalDate date,
            @JsonProperty("precip_mm") double precipMm,
            @JsonProperty("temp_max_c") double tempMaxC,
            @JsonProperty("temp_min_c") double tempMinC,
            @JsonProperty("wind_max_kph") double windMaxKph,
            @JsonProperty("is_holiday") boolean isHoliday,
            @JsonProperty("day_before_holiday") boolean dayBeforeHoliday,
            @JsonProperty("day_after_holiday") boolean dayAfterHoliday,
            @JsonProperty("is_quincena_post") boolean isQuincenaPost,
            @JsonProperty("is_border_traffic_holiday") boolean isBorderTrafficHoliday,
            @JsonProperty("holiday_name") String holidayName) {
    }

    public record PythonForecastResponse(
            @JsonProperty("predictions") List<Prediction> predictions,
            @JsonProperty("model_version") String modelVersion,
            @JsonProperty("feature_importance") List<FeatureImportance> featureImportance) {
    }

    public record Prediction(
            @JsonProperty("date") LocalDate date,
            @JsonProperty("predicted") double predicted,
            @JsonProperty("low") double low,
            @JsonProperty("high") double high) {
    }

    public record FeatureImportance(
            @JsonProperty("name") String name,
            @JsonProperty("gain") double gain) {
    }
}
