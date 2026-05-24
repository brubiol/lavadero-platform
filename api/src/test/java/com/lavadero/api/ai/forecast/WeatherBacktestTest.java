package com.lavadero.api.ai.forecast;

import com.lavadero.api.AbstractIntegrationTest;
import com.lavadero.api.ai.forecast.domain.ForecastModel;
import com.lavadero.api.ai.forecast.domain.HistoricalPoint;
import com.lavadero.api.ai.forecast.domain.WeatherAugmentedModel;
import com.lavadero.api.ai.forecast.domain.WeatherFeatures;
import com.lavadero.api.ai.forecast.service.SeasonalNaiveForecaster;
import com.lavadero.api.ai.forecast.service.WeatherAdjustedForecaster;
import com.lavadero.api.ai.weather.domain.DailyWeather;
import com.lavadero.api.ai.weather.repository.DailyWeatherRepository;
import com.lavadero.api.reports.domain.HistoricalDailySnapshot;
import com.lavadero.api.reports.repository.HistoricalDailySnapshotRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Rollout gate. Trains both the bare seasonal model and the weather-augmented
 * model on real 2025 data + V46 Reynosa weather seed, evaluates each on 2026
 * Jan–May, and asserts the weather model wins by at least 5pp of MAPE.
 *
 * <p>If this test fires red, do <strong>not</strong> flip
 * {@code LAVADERO_WEATHER_ENABLED=true} in production — the weather model has
 * regressed (or never improved enough) and the cutover would degrade forecasts.
 */
class WeatherBacktestTest extends AbstractIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(WeatherBacktestTest.class);
    private static final double MIN_IMPROVEMENT_PP = 0.05;

    private static final LocalDate TRAIN_FROM = LocalDate.of(2025, 1, 1);
    private static final LocalDate TRAIN_TO = LocalDate.of(2025, 12, 31);
    private static final LocalDate EVAL_FROM = LocalDate.of(2026, 1, 1);
    private static final LocalDate EVAL_TO = LocalDate.of(2026, 5, 23);

    @Autowired
    HistoricalDailySnapshotRepository historical;

    @Autowired
    DailyWeatherRepository weather;

    @Test
    void should_reduce_cars_mape_by_at_least_5pp_when_weather_features_enabled() {
        Result result = runBacktest(Axis.CARS);
        log.info("Cars backtest: seasonal MAPE={}, weather MAPE={}, delta={}",
                result.seasonalMape(), result.weatherMape(), result.improvement());
        assertThat(result.improvement())
                .as("cars MAPE improvement expected >= %s but was %s (seasonal=%s, weather=%s)",
                        MIN_IMPROVEMENT_PP, result.improvement(), result.seasonalMape(), result.weatherMape())
                .isGreaterThanOrEqualTo(MIN_IMPROVEMENT_PP);
    }

    @Test
    void should_reduce_revenue_mape_by_at_least_5pp_when_weather_features_enabled() {
        Result result = runBacktest(Axis.REVENUE);
        log.info("Revenue backtest: seasonal MAPE={}, weather MAPE={}, delta={}",
                result.seasonalMape(), result.weatherMape(), result.improvement());
        assertThat(result.improvement())
                .as("revenue MAPE improvement expected >= %s but was %s (seasonal=%s, weather=%s)",
                        MIN_IMPROVEMENT_PP, result.improvement(), result.seasonalMape(), result.weatherMape())
                .isGreaterThanOrEqualTo(MIN_IMPROVEMENT_PP);
    }

    private Result runBacktest(Axis axis) {
        List<HistoricalPoint> train = loadHistory(TRAIN_FROM, TRAIN_TO, axis);
        List<HistoricalPoint> evalSet = loadHistory(EVAL_FROM, EVAL_TO, axis);
        Map<LocalDate, DailyWeather> weatherByDate = loadWeatherByDate();

        List<WeatherFeatures> trainWeather = featuresFor(train, weatherByDate);
        List<WeatherFeatures> evalWeather = featuresFor(evalSet, weatherByDate);

        ForecastModel seasonal = SeasonalNaiveForecaster.fit(train);
        WeatherAugmentedModel weatherModel = WeatherAdjustedForecaster.fit(train, trainWeather);

        double seasonalMape = SeasonalNaiveForecaster.mape(seasonal, evalSet);
        double weatherMape = WeatherAdjustedForecaster.mape(weatherModel, evalSet, evalWeather);
        return new Result(seasonalMape, weatherMape);
    }

    private List<HistoricalPoint> loadHistory(LocalDate from, LocalDate to, Axis axis) {
        List<HistoricalDailySnapshot> rows = historical.findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to);
        List<HistoricalPoint> out = new ArrayList<>();
        for (HistoricalDailySnapshot s : rows) {
            double v = axis == Axis.CARS
                    ? (s.getTotalCars() == null ? 0.0 : s.getTotalCars().doubleValue())
                    : (s.getRevenueMxn() == null ? 0.0 : s.getRevenueMxn().doubleValue());
            if (v > 0.0) {
                out.add(new HistoricalPoint(s.getSnapshotDate(), v));
            }
        }
        return out;
    }

    private Map<LocalDate, DailyWeather> loadWeatherByDate() {
        Map<LocalDate, DailyWeather> map = new HashMap<>();
        for (DailyWeather w : weather.findAll()) {
            map.put(w.getSnapshotDate(), w);
        }
        return map;
    }

    private List<WeatherFeatures> featuresFor(List<HistoricalPoint> points, Map<LocalDate, DailyWeather> byDate) {
        List<WeatherFeatures> out = new ArrayList<>(points.size());
        for (HistoricalPoint p : points) {
            DailyWeather today = byDate.get(p.date());
            DailyWeather yesterday = byDate.get(p.date().minusDays(1));
            double precip = today == null ? 0.0 : today.getPrecipitationMm().doubleValue();
            double tmax = today == null ? 0.0 : today.getTempMaxC().doubleValue();
            double precipYesterday = yesterday == null ? 0.0 : yesterday.getPrecipitationMm().doubleValue();
            out.add(new WeatherFeatures(p.date(), precip, tmax, precipYesterday));
        }
        return out;
    }

    private enum Axis { CARS, REVENUE }

    private record Result(double seasonalMape, double weatherMape) {
        double improvement() { return seasonalMape - weatherMape; }
    }
}
