package com.lavadero.api.ai.forecast.domain;

import java.time.LocalDate;

public record HistoricalPoint(LocalDate date, double value) {
}
