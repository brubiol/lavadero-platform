package com.lavadero.api.ai.weather.service;

import com.lavadero.api.ai.weather.config.WeatherProperties;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Pulls fresh weather every morning at 05:00 America/Monterrey — 30 min before
 * {@code AiForecastScheduler} runs at 05:30, so the forecaster sees up-to-date
 * weather. Same defensive pattern as {@code AiShiftCloseListener}: never let a
 * network blip cascade into other AI.
 *
 * <p>Gated by both the shared autonomous-AI flag and the weather-feature flag.
 */
@Component
public class WeatherScheduler {

    private static final Logger log = LoggerFactory.getLogger(WeatherScheduler.class);

    private final WeatherService service;
    private final WeatherProperties properties;
    private final boolean schedulerEnabled;

    public WeatherScheduler(WeatherService service, WeatherProperties properties,
            @Value("${lavadero.ai.scheduler.enabled:false}") boolean schedulerEnabled) {
        this.service = service;
        this.properties = properties;
        this.schedulerEnabled = schedulerEnabled;
    }

    @Scheduled(cron = "${lavadero.weather.cron:0 0 5 * * *}", zone = "America/Monterrey")
    public void nightlyRefresh() {
        if (!schedulerEnabled || !properties.isEnabled()) {
            return;
        }
        try {
            service.refresh(LocalDate.now(), properties.getForecastDays());
        } catch (Exception ex) {
            log.warn("Weather refresh failed: {}", ex.getMessage());
        }
    }
}
