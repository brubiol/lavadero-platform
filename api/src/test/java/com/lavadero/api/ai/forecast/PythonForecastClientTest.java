package com.lavadero.api.ai.forecast;

import com.lavadero.api.AbstractIntegrationTest;
import com.lavadero.api.ai.forecast.config.ForecastProperties;
import com.lavadero.api.ai.forecast.service.PythonForecastClient;
import com.lavadero.api.ai.forecast.service.PythonForecastClient.PythonForecastException;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.FeatureImportance;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.HorizonRow;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastRequest;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastResponse;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.TrainingRow;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PythonForecastClientTest extends AbstractIntegrationTest {

    @Autowired
    PythonForecastClient client;

    @Autowired
    ForecastProperties properties;

    private HttpServer server;
    private String previousBaseUrl;
    private int previousTimeout;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        previousBaseUrl = properties.getPythonBaseUrl();
        previousTimeout = properties.getPythonTimeoutSeconds();
        properties.setPythonBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
    }

    @AfterEach
    void stop() {
        server.stop(0);
        properties.setPythonBaseUrl(previousBaseUrl);
        properties.setPythonTimeoutSeconds(previousTimeout);
    }

    @Test
    void should_parse_predictions_when_python_returns_200() {
        server.createContext("/forecast", exchange -> {
            byte[] body = (""
                    + "{\"predictions\":["
                    + "{\"date\":\"2026-06-01\",\"predicted\":42.0,\"low\":35.0,\"high\":49.0},"
                    + "{\"date\":\"2026-06-02\",\"predicted\":50.0,\"low\":40.0,\"high\":60.0}"
                    + "],\"model_version\":\"lgbm-1.0\","
                    + "\"feature_importance\":["
                    + "{\"name\":\"precip_mm\",\"gain\":0.4},"
                    + "{\"name\":\"dow\",\"gain\":0.3}"
                    + "]}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });

        PythonForecastResponse response = client.forecast(sampleRequest());

        assertThat(response.modelVersion()).isEqualTo("lgbm-1.0");
        assertThat(response.predictions()).hasSize(2);
        assertThat(response.predictions().get(0).date()).isEqualTo(LocalDate.parse("2026-06-01"));
        assertThat(response.predictions().get(0).predicted()).isEqualTo(42.0);
        assertThat(response.featureImportance())
                .extracting(FeatureImportance::name, FeatureImportance::gain)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("precip_mm", 0.4),
                        org.assertj.core.groups.Tuple.tuple("dow", 0.3));
    }

    @Test
    void should_throw_when_python_returns_500() {
        server.createContext("/forecast", exchange -> {
            byte[] body = "{\"detail\":\"boom\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(500, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });

        assertThatThrownBy(() -> client.forecast(sampleRequest()))
                .isInstanceOf(PythonForecastException.class)
                .hasMessageContaining("500");
    }

    @Test
    void should_throw_when_python_times_out() {
        properties.setPythonTimeoutSeconds(1);
        server.createContext("/forecast", exchange -> {
            try {
                Thread.sleep(2500);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            byte[] body = "{}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });

        assertThatThrownBy(() -> client.forecast(sampleRequest()))
                .isInstanceOf(PythonForecastException.class);
    }

    private static PythonForecastRequest sampleRequest() {
        List<TrainingRow> training = List.of(new TrainingRow(
                LocalDate.parse("2026-05-01"), 30.0,
                0.0, 32.0, 22.0, 8.0,
                false, false, false, false, false, null));
        List<HorizonRow> horizon = List.of(new HorizonRow(
                LocalDate.parse("2026-06-01"),
                0.0, 33.0, 23.0, 9.0,
                false, false, false, false, false, null));
        return new PythonForecastRequest(LocalDate.parse("2026-05-31"), 1, "cars", training, horizon);
    }
}
