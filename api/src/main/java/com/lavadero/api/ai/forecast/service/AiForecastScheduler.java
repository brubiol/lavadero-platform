package com.lavadero.api.ai.forecast.service;

import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Refits the demand forecast nightly. Guarded by the same flag as other autonomous
 * AI features so a single env var can disable all scheduled AI in prod.
 */
@Component
public class AiForecastScheduler {

    private static final Logger log = LoggerFactory.getLogger(AiForecastScheduler.class);

    private final ForecastService forecast;
    private final boolean enabled;

    public AiForecastScheduler(ForecastService forecast,
            @Value("${lavadero.ai.scheduler-enabled:false}") boolean enabled) {
        this.forecast = forecast;
        this.enabled = enabled;
    }

    @Scheduled(cron = "${lavadero.ai.forecast.cron:0 30 5 * * *}", zone = "America/Monterrey")
    public void nightlyRefit() {
        if (!enabled) {
            return;
        }
        try {
            forecast.runForecast(LocalDate.now(), ForecastService.DEFAULT_HORIZON_DAYS);
        } catch (Exception ex) {
            log.warn("Demand forecast nightly refit failed: {}", ex.getMessage());
        }
    }
}
