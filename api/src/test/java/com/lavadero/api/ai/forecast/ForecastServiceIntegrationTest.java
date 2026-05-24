package com.lavadero.api.ai.forecast;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.AbstractIntegrationTest;
import com.lavadero.api.ai.domain.AiFeatureType;
import com.lavadero.api.ai.forecast.config.ForecastProperties;
import com.lavadero.api.ai.forecast.repository.DailyForecastRepository;
import com.lavadero.api.ai.repository.AiInsightRepository;
import com.lavadero.api.ai.weather.config.WeatherProperties;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ForecastServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    DailyForecastRepository forecasts;

    @Autowired
    AiInsightRepository insights;

    @Autowired
    @SuppressWarnings("unused")
    ObjectMapper objectMapper;

    @Autowired
    WeatherProperties weatherProperties;

    @Autowired
    ForecastProperties forecastProperties;

    private String previousProvider;
    private String previousPythonBaseUrl;

    @org.junit.jupiter.api.BeforeEach
    void snapshotForecastProperties() {
        previousProvider = forecastProperties.getProvider();
        previousPythonBaseUrl = forecastProperties.getPythonBaseUrl();
    }

    @AfterEach
    void resetWeatherFlag() {
        // Tests that toggle weather must leave the global properties bean clean.
        weatherProperties.setEnabled(false);
        forecastProperties.setProvider(previousProvider == null ? "java" : previousProvider);
        forecastProperties.setPythonBaseUrl(previousPythonBaseUrl);
    }

    @Test
    void should_persist_seven_predictions_when_forecast_runs() throws Exception {
        long before = forecasts.count();

        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-31&days=7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.horizonDays").value(7))
                .andExpect(jsonPath("$.points", Matchers.hasSize(7)))
                .andExpect(jsonPath("$.points[0].predictedCars").isNumber())
                .andExpect(jsonPath("$.points[0].predictedRevenueMxn").isNumber())
                .andExpect(jsonPath("$.modelVersion").isNotEmpty());

        assertThat(forecasts.count() - before).isEqualTo(7L);
    }

    @Test
    void should_emit_demand_forecast_insight_when_forecast_runs() throws Exception {
        long before = insights.findByFeatureTypeOrderByGeneratedAtDesc(AiFeatureType.DEMAND_FORECAST).size();

        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-30&days=7"))
                .andExpect(status().isOk());

        long after = insights.findByFeatureTypeOrderByGeneratedAtDesc(AiFeatureType.DEMAND_FORECAST).size();
        assertThat(after - before).isEqualTo(1L);

        mvc.perform(get("/api/v1/ai/insights?feature_type=DEMAND_FORECAST"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].featureType").value("DEMAND_FORECAST"))
                .andExpect(jsonPath("$[0].severity").value("INFO"))
                .andExpect(jsonPath("$[0].details.forecast", Matchers.hasSize(7)));
    }

    @Test
    void should_overwrite_predictions_when_rerun_same_day() throws Exception {
        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-29&days=7"))
                .andExpect(status().isOk());
        long firstRun = forecasts.findBySnapshotDateOrderByHorizonDateAsc(java.time.LocalDate.of(2026, 5, 29)).size();
        assertThat(firstRun).isEqualTo(7);

        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-29&days=7"))
                .andExpect(status().isOk());
        long secondRun = forecasts.findBySnapshotDateOrderByHorizonDateAsc(java.time.LocalDate.of(2026, 5, 29)).size();
        assertThat(secondRun).isEqualTo(7);
    }

    @Test
    void should_return_latest_forecast_when_upcoming_called_without_snapshot() throws Exception {
        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-28&days=7"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/ai/forecast/upcoming?days=7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points", Matchers.hasSize(7)))
                .andExpect(jsonPath("$.modelVersion").isNotEmpty());
    }

    @Test
    void should_include_expected_precipitation_when_weather_model_active() throws Exception {
        weatherProperties.setEnabled(true);

        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-22&days=7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelVersion").value(Matchers.containsString("+w")))
                .andExpect(jsonPath("$.points[0].expectedPrecipitationMm").exists())
                .andExpect(jsonPath("$.points[0].expectedTempMaxC").exists());
    }

    @Test
    void should_fall_back_to_seasonal_when_weather_disabled() throws Exception {
        weatherProperties.setEnabled(false);

        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-21&days=7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelVersion").value(Matchers.not(Matchers.containsString("+w"))))
                .andExpect(jsonPath("$.points[0].expectedPrecipitationMm").doesNotExist());
    }

    @Test
    void should_fall_back_to_java_when_python_is_unreachable() throws Exception {
        weatherProperties.setEnabled(true);
        forecastProperties.setProvider("python");
        // Port 1 is reserved (tcpmux) — connect should fail immediately on most hosts,
        // and even if it doesn't, the client times out in 30s. Either way: fallback.
        forecastProperties.setPythonBaseUrl("http://127.0.0.1:1");

        mvc.perform(post("/api/v1/ai/forecast/run?snapshotDate=2026-05-20&days=7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelVersion").value(Matchers.not(Matchers.containsString("+lgbm"))))
                .andExpect(jsonPath("$.points", Matchers.hasSize(7)));
    }
}
