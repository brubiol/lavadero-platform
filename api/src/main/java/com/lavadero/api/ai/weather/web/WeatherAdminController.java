package com.lavadero.api.ai.weather.web;

import com.lavadero.api.ai.weather.config.WeatherProperties;
import com.lavadero.api.ai.weather.domain.DailyWeather;
import com.lavadero.api.ai.weather.service.WeatherService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * DUENO-only weather endpoints. Path-based RBAC ({@code /api/v1/ai/**} →
 * hasRole DUENO) is enforced globally via SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/ai/weather")
public class WeatherAdminController {

    private final WeatherService service;
    private final WeatherProperties properties;

    public WeatherAdminController(WeatherService service, WeatherProperties properties) {
        this.service = service;
        this.properties = properties;
    }

    @PostMapping("/backfill")
    public Map<String, Object> backfill(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        int written = service.backfill(from, to);
        return Map.of("from", from, "to", to, "written", written);
    }

    @PostMapping("/refresh")
    public Map<String, Object> refresh() {
        int written = service.refresh(LocalDate.now(), properties.getForecastDays());
        return Map.of("written", written);
    }

    @GetMapping
    public List<WeatherRow> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.range(from, to).stream().map(WeatherRow::from).toList();
    }

    public record WeatherRow(
            LocalDate date,
            BigDecimal precipitationMm,
            BigDecimal tempMaxC,
            BigDecimal tempMinC,
            BigDecimal windMaxKph,
            String source,
            boolean observed) {
        public static WeatherRow from(DailyWeather w) {
            return new WeatherRow(
                    w.getSnapshotDate(),
                    w.getPrecipitationMm(),
                    w.getTempMaxC(),
                    w.getTempMinC(),
                    w.getWindMaxKph(),
                    w.getSource().name(),
                    w.isObserved());
        }
    }
}
