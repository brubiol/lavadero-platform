package com.lavadero.api.ai.forecast.web;

import com.lavadero.api.ai.forecast.service.ForecastService;
import com.lavadero.api.ai.forecast.web.ForecastDtos.ForecastResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * DUENO-only forecast endpoints. Role check is enforced globally via
 * SecurityConfig path matcher on {@code /api/v1/ai/**}.
 */
@RestController
@RequestMapping("/api/v1/ai/forecast")
public class AiForecastController {

    private final ForecastService forecast;

    public AiForecastController(ForecastService forecast) {
        this.forecast = forecast;
    }

    @GetMapping("/upcoming")
    public ForecastResponse upcoming(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate snapshotDate) {
        if (snapshotDate != null) {
            return forecast.forSnapshot(snapshotDate, days);
        }
        return forecast.latest(days);
    }

    @PostMapping("/run")
    public ForecastResponse run(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate snapshotDate,
            @RequestParam(defaultValue = "7") int days) {
        LocalDate snapshot = snapshotDate == null ? LocalDate.now() : snapshotDate;
        return forecast.runForecast(snapshot, days);
    }
}
