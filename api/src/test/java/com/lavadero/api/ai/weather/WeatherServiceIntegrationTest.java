package com.lavadero.api.ai.weather;

import com.lavadero.api.AbstractIntegrationTest;
import com.lavadero.api.ai.weather.config.WeatherProperties;
import com.lavadero.api.ai.weather.domain.DailyWeather;
import com.lavadero.api.ai.weather.repository.DailyWeatherRepository;
import com.lavadero.api.ai.weather.service.WeatherService;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class WeatherServiceIntegrationTest extends AbstractIntegrationTest {

    // Far-future dates so the test rows never collide with the V46 Reynosa seed
    // (which covers 2025-01-01 .. 2026-05-23). Using deleteAll() here would wipe
    // the seed and break WeatherBacktestTest / ForecastServiceIntegrationTest
    // depending on test ordering — so we scope cleanup to this window only.
    private static final LocalDate TEST_WINDOW_FROM = LocalDate.of(2030, 6, 1);
    private static final LocalDate TEST_WINDOW_TO = LocalDate.of(2030, 6, 30);

    @Autowired
    WeatherService service;

    @Autowired
    WeatherProperties properties;

    @Autowired
    DailyWeatherRepository repository;

    private HttpServer server;
    private String previousArchive;
    private String previousForecast;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        previousArchive = properties.getArchiveBaseUrl();
        previousForecast = properties.getForecastBaseUrl();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        properties.setArchiveBaseUrl(base + "/archive");
        properties.setForecastBaseUrl(base + "/forecast");
        clearTestWindow();
    }

    @AfterEach
    void stop() {
        server.stop(0);
        properties.setArchiveBaseUrl(previousArchive);
        properties.setForecastBaseUrl(previousForecast);
        clearTestWindow();
    }

    private void clearTestWindow() {
        List<DailyWeather> rows = repository.findBySnapshotDateBetweenOrderBySnapshotDateAsc(
                TEST_WINDOW_FROM, TEST_WINDOW_TO);
        if (!rows.isEmpty()) {
            repository.deleteAll(rows);
        }
    }

    @Test
    void should_persist_archive_rows_when_backfill_runs() {
        mockJson("/archive", req -> archiveBody(List.of(
                row("2030-06-01", 0.0, 32.0, 22.0, 8.0),
                row("2030-06-02", 5.5, 28.0, 21.0, 12.0),
                row("2030-06-03", 0.0, 33.0, 23.0, 9.0))));

        int written = service.backfill(LocalDate.parse("2030-06-01"), LocalDate.parse("2030-06-03"));
        assertThat(written).isEqualTo(3);

        List<DailyWeather> rows = repository.findBySnapshotDateBetweenOrderBySnapshotDateAsc(
                LocalDate.parse("2030-06-01"), LocalDate.parse("2030-06-03"));
        assertThat(rows).hasSize(3);
        assertThat(rows.get(1).getPrecipitationMm().doubleValue()).isEqualTo(5.5);
        assertThat(rows.get(0).isObserved()).isTrue();
        assertThat(rows.get(0).getSource().name()).isEqualTo("ARCHIVE");
    }

    @Test
    void should_be_idempotent_when_backfill_runs_twice_for_same_range() {
        mockJson("/archive", req -> archiveBody(List.of(
                row("2030-06-01", 0.0, 32.0, 22.0, 8.0),
                row("2030-06-02", 1.0, 30.0, 22.0, 10.0))));

        service.backfill(LocalDate.parse("2030-06-01"), LocalDate.parse("2030-06-02"));
        service.backfill(LocalDate.parse("2030-06-01"), LocalDate.parse("2030-06-02"));

        long inWindow = repository.countBySnapshotDateBetween(TEST_WINDOW_FROM, TEST_WINDOW_TO);
        assertThat(inWindow).isEqualTo(2L);
    }

    @Test
    void should_overwrite_forecast_row_with_archive_row_when_day_becomes_observed() {
        AtomicInteger callCount = new AtomicInteger(0);
        mockJson("/forecast", req -> {
            int n = callCount.incrementAndGet();
            return n == 1
                    ? archiveBody(List.of(row("2030-06-05", 8.0, 30.0, 22.0, 12.0)))
                    : archiveBody(List.of(row("2030-06-05", 12.0, 29.0, 21.0, 14.0)));
        });

        // Call 1: today is 2030-06-04, so 2030-06-05 is future → FORECAST.
        service.refresh(LocalDate.parse("2030-06-04"), 1);
        DailyWeather first = repository.findBySnapshotDate(LocalDate.parse("2030-06-05")).orElseThrow();
        assertThat(first.isObserved()).isFalse();
        assertThat(first.getSource().name()).isEqualTo("FORECAST");
        assertThat(first.getPrecipitationMm().doubleValue()).isEqualTo(8.0);

        // Call 2: today is 2030-06-06, so 2030-06-05 is past → promoted to ARCHIVE.
        service.refresh(LocalDate.parse("2030-06-06"), 1);
        DailyWeather second = repository.findBySnapshotDate(LocalDate.parse("2030-06-05")).orElseThrow();
        assertThat(second.isObserved()).isTrue();
        assertThat(second.getSource().name()).isEqualTo("ARCHIVE");
        assertThat(second.getPrecipitationMm().doubleValue()).isEqualTo(12.0);
    }

    @Test
    void should_not_regress_observed_row_back_to_forecast() {
        mockJson("/archive", req -> archiveBody(List.of(row("2030-06-05", 12.0, 29.0, 21.0, 14.0))));
        service.backfill(LocalDate.parse("2030-06-05"), LocalDate.parse("2030-06-05"));

        mockJson("/forecast", req -> archiveBody(List.of(row("2030-06-05", 0.0, 35.0, 25.0, 5.0))));
        service.refresh(LocalDate.parse("2030-06-04"), 1);

        DailyWeather row = repository.findBySnapshotDate(LocalDate.parse("2030-06-05")).orElseThrow();
        assertThat(row.isObserved()).isTrue();
        assertThat(row.getPrecipitationMm().doubleValue()).isEqualTo(12.0);
    }

    // ── Mock helpers ──────────────────────────────────────────────

    private void mockJson(String path, Function<String, String> bodyFn) {
        try {
            server.removeContext(path);
        } catch (IllegalArgumentException ignored) {
            // Context wasn't registered yet — that's the expected first-call path.
        }
        server.createContext(path, exchange -> {
            String query = exchange.getRequestURI().getRawQuery();
            byte[] body = bodyFn.apply(query == null ? "" : query).getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
    }

    private static String archiveBody(List<DailyRow> rows) {
        StringBuilder dates = new StringBuilder();
        StringBuilder precip = new StringBuilder();
        StringBuilder tmax = new StringBuilder();
        StringBuilder tmin = new StringBuilder();
        StringBuilder wind = new StringBuilder();
        for (int i = 0; i < rows.size(); i++) {
            if (i > 0) {
                dates.append(',');
                precip.append(',');
                tmax.append(',');
                tmin.append(',');
                wind.append(',');
            }
            DailyRow r = rows.get(i);
            dates.append('"').append(r.date()).append('"');
            precip.append(r.precipMm());
            tmax.append(r.tmaxC());
            tmin.append(r.tminC());
            wind.append(r.windKph());
        }
        return "{\"daily\":{"
                + "\"time\":[" + dates + "],"
                + "\"precipitation_sum\":[" + precip + "],"
                + "\"temperature_2m_max\":[" + tmax + "],"
                + "\"temperature_2m_min\":[" + tmin + "],"
                + "\"wind_speed_10m_max\":[" + wind + "]"
                + "}}";
    }

    private static DailyRow row(String date, double precip, double tmax, double tmin, double wind) {
        return new DailyRow(date, precip, tmax, tmin, wind);
    }

    private record DailyRow(String date, double precipMm, double tmaxC, double tminC, double windKph) {
    }
}
