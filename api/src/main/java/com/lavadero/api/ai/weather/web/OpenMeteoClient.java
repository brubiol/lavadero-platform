package com.lavadero.api.ai.weather.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.ai.weather.config.WeatherProperties;
import com.lavadero.api.ai.weather.dto.DailyWeatherDto;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Open-Meteo HTTP client. Two endpoints: historical reanalysis (archive) and
 * forward forecast. Mirrors {@code ConfiguredAiProvider}'s use of
 * {@code java.net.http.HttpClient} — no Spring RestTemplate / WebClient.
 *
 * <p>The base URLs are injected so tests can swap them for a MockWebServer.
 */
@Component
public class OpenMeteoClient {

    private static final String DAILY_FIELDS = "precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max";
    private static final String TIMEZONE = "America/Monterrey";
    private static final String WIND_UNIT = "kmh";

    private final WeatherProperties properties;
    private final ObjectMapper objectMapper;

    public OpenMeteoClient(WeatherProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public List<DailyWeatherDto> fetchArchive(LocalDate from, LocalDate to) {
        String url = properties.getArchiveBaseUrl()
                + "?latitude=" + properties.getLat()
                + "&longitude=" + properties.getLon()
                + "&start_date=" + from
                + "&end_date=" + to
                + "&daily=" + encode(DAILY_FIELDS)
                + "&wind_speed_unit=" + WIND_UNIT
                + "&timezone=" + encode(TIMEZONE);
        return execute(url);
    }

    public List<DailyWeatherDto> fetchForecast(int days) {
        int safeDays = Math.max(1, Math.min(days, 16));
        String url = properties.getForecastBaseUrl()
                + "?latitude=" + properties.getLat()
                + "&longitude=" + properties.getLon()
                + "&daily=" + encode(DAILY_FIELDS)
                + "&forecast_days=" + safeDays
                + "&past_days=1"
                + "&wind_speed_unit=" + WIND_UNIT
                + "&timezone=" + encode(TIMEZONE);
        return execute(url);
    }

    private List<DailyWeatherDto> execute(String url) {
        try {
            Duration timeout = Duration.ofSeconds(Math.max(1, properties.getTimeoutSeconds()));
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(timeout)
                    .GET()
                    .build();
            HttpResponse<String> response = HttpClient.newBuilder()
                    .connectTimeout(timeout)
                    .build()
                    .send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new OpenMeteoException("Open-Meteo returned HTTP " + response.statusCode() + ": " + response.body());
            }
            return parse(response.body());
        } catch (OpenMeteoException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new OpenMeteoException("Open-Meteo request failed: " + ex.getMessage(), ex);
        }
    }

    private List<DailyWeatherDto> parse(String body) throws Exception {
        JsonNode root = objectMapper.readTree(body);
        JsonNode daily = root.path("daily");
        JsonNode dates = daily.path("time");
        JsonNode precip = daily.path("precipitation_sum");
        JsonNode tmax = daily.path("temperature_2m_max");
        JsonNode tmin = daily.path("temperature_2m_min");
        JsonNode wind = daily.path("wind_speed_10m_max");

        int n = dates.isArray() ? dates.size() : 0;
        List<DailyWeatherDto> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            LocalDate date = LocalDate.parse(dates.get(i).asText());
            out.add(new DailyWeatherDto(
                    date,
                    decimal(precip.get(i), 2, BigDecimal.ZERO),
                    decimal(tmax.get(i), 1, null),
                    decimal(tmin.get(i), 1, null),
                    decimal(wind.get(i), 1, null)));
        }
        return out;
    }

    private static BigDecimal decimal(JsonNode node, int scale, BigDecimal nullDefault) {
        if (node == null || node.isNull()) {
            return nullDefault;
        }
        return BigDecimal.valueOf(node.asDouble()).setScale(scale, RoundingMode.HALF_UP);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public static final class OpenMeteoException extends RuntimeException {
        public OpenMeteoException(String message) { super(message); }
        public OpenMeteoException(String message, Throwable cause) { super(message, cause); }
    }
}
