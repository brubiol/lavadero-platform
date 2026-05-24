package com.lavadero.api.ai.forecast.domain;

import java.time.LocalDate;

public record ForecastPoint(LocalDate date, double predicted, double low, double high) {
}
