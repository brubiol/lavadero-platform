package com.lavadero.api.ai.forecast.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.ai.forecast.config.ForecastProperties;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastRequest;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.stereotype.Component;

/**
 * Thin HTTP client for the Python forecast sidecar. Uses {@code java.net.http.HttpClient}
 * to match {@link com.lavadero.api.ai.weather.web.OpenMeteoClient} and
 * {@link com.lavadero.api.ai.provider.ConfiguredAiProvider} — no RestTemplate / WebClient.
 *
 * <p>Lazy by design: no startup probe of {@code /health}. If the sidecar is down,
 * the first {@link #forecast(PythonForecastRequest)} call throws
 * {@link PythonForecastException} and {@link ForecastService} falls back to the
 * in-process Java path.
 */
@Component
public class PythonForecastClient {

    private final ForecastProperties properties;
    private final ObjectMapper objectMapper;

    public PythonForecastClient(ForecastProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public PythonForecastResponse forecast(PythonForecastRequest request) {
        try {
            Duration timeout = Duration.ofSeconds(Math.max(1, properties.getPythonTimeoutSeconds()));
            String body = objectMapper.writeValueAsString(request);
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(properties.getPythonBaseUrl() + "/forecast"))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            // Force HTTP/1.1 — Java 21+ HttpClient defaults to HTTP/2 and sends an
            // h2c Upgrade header that uvicorn does not handle, causing the body to
            // never reach FastAPI and pydantic to return 422 "Field required" on body.
            HttpResponse<String> response = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .connectTimeout(timeout)
                    .build()
                    .send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new PythonForecastException("Python forecast returned HTTP "
                        + response.statusCode() + ": " + response.body());
            }
            return objectMapper.readValue(response.body(), PythonForecastResponse.class);
        } catch (PythonForecastException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PythonForecastException("Python forecast request failed: " + ex.getMessage(), ex);
        }
    }

    public static final class PythonForecastException extends RuntimeException {
        public PythonForecastException(String message) { super(message); }
        public PythonForecastException(String message, Throwable cause) { super(message, cause); }
    }
}
