package com.lavadero.api.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import com.lavadero.api.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class HealthControllerTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void health_returns_ok() {
        ResponseEntity<Map<String, String>> resp = this.rest.exchange(
                "/api/v1/health",
                org.springframework.http.HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {
                });

        Map<String, String> res = resp.getBody();
        assertThat(res).containsEntry("status", "ok");
    }

}
