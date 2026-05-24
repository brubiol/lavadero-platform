package com.lavadero.api.ai.weather.service;

import com.lavadero.api.ai.weather.domain.DailyWeather;
import com.lavadero.api.ai.weather.domain.WeatherSource;
import com.lavadero.api.ai.weather.dto.DailyWeatherDto;
import com.lavadero.api.ai.weather.repository.DailyWeatherRepository;
import com.lavadero.api.ai.weather.web.OpenMeteoClient;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestrates weather data lifecycle: one-time backfill from the archive
 * endpoint, and daily refresh that pulls yesterday's actual + the next two
 * weeks of forecast. Idempotent: re-running for the same range updates rows
 * in place via the natural (tenant, date) key.
 *
 * <p>Promotion rule: when archive data arrives for a date that already has a
 * FORECAST row, the row is replaced with the observed value. Once observed=true,
 * subsequent forecast fetches do not overwrite it.
 */
@Service
public class WeatherService {

    private static final Logger log = LoggerFactory.getLogger(WeatherService.class);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final OpenMeteoClient client;
    private final DailyWeatherRepository repository;

    public WeatherService(OpenMeteoClient client, DailyWeatherRepository repository) {
        this.client = client;
        this.repository = repository;
    }

    /**
     * Pulls archive data for [from, to] and upserts each day as observed=true.
     * Returns the number of rows written (created + updated).
     */
    @Transactional
    public int backfill(LocalDate from, LocalDate to) {
        validateRange(from, to);
        List<DailyWeatherDto> rows = client.fetchArchive(from, to);
        return upsert(rows, WeatherSource.ARCHIVE, true);
    }

    /**
     * Daily refresh — pulls forecast (which includes past_days=1 as actual)
     * and upserts each day. Past days marked observed=true; future days as
     * FORECAST rows; existing observed rows are not regressed back to forecast.
     */
    @Transactional
    public int refresh(LocalDate today, int forecastDays) {
        List<DailyWeatherDto> rows = client.fetchForecast(forecastDays);
        int written = 0;
        for (DailyWeatherDto row : rows) {
            boolean isObserved = !row.date().isAfter(today.minusDays(1));
            WeatherSource source = isObserved ? WeatherSource.ARCHIVE : WeatherSource.FORECAST;
            written += upsertOne(row, source, isObserved) ? 1 : 0;
        }
        log.info("Weather refresh wrote {} rows ({} returned by Open-Meteo)", written, rows.size());
        return written;
    }

    @Transactional(readOnly = true)
    public List<DailyWeather> range(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return repository.findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to);
    }

    @Transactional(readOnly = true)
    public long countBetween(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return repository.countBySnapshotDateBetween(from, to);
    }

    private int upsert(List<DailyWeatherDto> rows, WeatherSource source, boolean observed) {
        int written = 0;
        for (DailyWeatherDto row : rows) {
            written += upsertOne(row, source, observed) ? 1 : 0;
        }
        return written;
    }

    private boolean upsertOne(DailyWeatherDto row, WeatherSource source, boolean observed) {
        Optional<DailyWeather> existing = repository.findBySnapshotDate(row.date());
        if (existing.isPresent()) {
            DailyWeather current = existing.get();
            // Don't regress an already-observed row back to a forecast.
            if (current.isObserved() && !observed) {
                return false;
            }
            current.replaceWith(
                    nullSafe(row.precipitationMm()),
                    nullSafe(row.tempMaxC()),
                    nullSafe(row.tempMinC()),
                    row.windMaxKph(),
                    source,
                    observed);
            return true;
        }
        repository.save(new DailyWeather(
                row.date(),
                nullSafe(row.precipitationMm()),
                nullSafe(row.tempMaxC()),
                nullSafe(row.tempMinC()),
                row.windMaxKph(),
                source,
                observed));
        return true;
    }

    private static BigDecimal nullSafe(BigDecimal value) {
        return value == null ? ZERO : value;
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("Date range is invalid");
        }
    }
}
