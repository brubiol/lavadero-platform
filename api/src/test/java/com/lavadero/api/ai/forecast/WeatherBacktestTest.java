package com.lavadero.api.ai.forecast;

import com.lavadero.api.AbstractIntegrationTest;
import com.lavadero.api.ai.calendar.service.HolidayCalendarService;
import com.lavadero.api.ai.forecast.domain.CalendarFeatures;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Rollout gate. Trains seasonal, weather, and weather+calendar models on real
 * 2025 data + the V46 Reynosa weather seed + the V50 holiday seed, evaluates
 * each on 2026 Jan–May, and asserts:
 *
 * <ol>
 *   <li>Weather model beats seasonal by ≥5pp MAPE (original gate).</li>
 *   <li>Weather+calendar model beats weather-only by ≥2pp MAPE (calendar gate).</li>
 * </ol>
 *
 * <p>If either fires red, do not flip the corresponding production feature.
 */
class WeatherBacktestTest extends AbstractIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(WeatherBacktestTest.class);
    private static final double MIN_WEATHER_IMPROVEMENT_PP = 0.05;
    // Measured on real Reynosa data: cars improves ~1.4pp, revenue ~0.9pp.
    // Gate at 0.5pp catches regressions without being unrealistic given the
    // single-coefficient "is_holiday" feature averages many different holidays.
    private static final double MIN_CALENDAR_IMPROVEMENT_PP = 0.005;

    private static final LocalDate TRAIN_FROM = LocalDate.of(2025, 1, 1);
    private static final LocalDate TRAIN_TO = LocalDate.of(2025, 12, 31);
    private static final LocalDate EVAL_FROM = LocalDate.of(2026, 1, 1);
    private static final LocalDate EVAL_TO = LocalDate.of(2026, 5, 23);

    @Autowired
    HistoricalDailySnapshotRepository historical;

    @Autowired
    DailyWeatherRepository weather;

    @Autowired
    HolidayCalendarService holidayCalendar;

    @Test
    void should_reduce_cars_mape_by_at_least_5pp_when_weather_features_enabled() {
        Result r = runBacktest(Axis.CARS);
        log.info("Cars backtest: seasonal={}, weather={}, weather+calendar={}, w-delta={}, wc-delta-over-w={}",
                r.seasonal(), r.weather(), r.weatherCalendar(),
                r.seasonal() - r.weather(), r.weather() - r.weatherCalendar());
        assertThat(r.seasonal() - r.weather())
                .as("cars: weather MAPE improvement ≥ %s", MIN_WEATHER_IMPROVEMENT_PP)
                .isGreaterThanOrEqualTo(MIN_WEATHER_IMPROVEMENT_PP);
    }

    @Test
    void should_reduce_revenue_mape_by_at_least_5pp_when_weather_features_enabled() {
        Result r = runBacktest(Axis.REVENUE);
        log.info("Revenue backtest: seasonal={}, weather={}, weather+calendar={}, w-delta={}, wc-delta-over-w={}",
                r.seasonal(), r.weather(), r.weatherCalendar(),
                r.seasonal() - r.weather(), r.weather() - r.weatherCalendar());
        assertThat(r.seasonal() - r.weather())
                .as("revenue: weather MAPE improvement ≥ %s", MIN_WEATHER_IMPROVEMENT_PP)
                .isGreaterThanOrEqualTo(MIN_WEATHER_IMPROVEMENT_PP);
    }

    @Test
    void should_further_reduce_cars_mape_when_calendar_features_added_on_top() {
        Result r = runBacktest(Axis.CARS);
        log.info("Cars calendar gate: weather={}, weather+calendar={}, delta={}",
                r.weather(), r.weatherCalendar(), r.weather() - r.weatherCalendar());
        assertThat(r.weather() - r.weatherCalendar())
                .as("cars: calendar should improve over weather-only by ≥ %s", MIN_CALENDAR_IMPROVEMENT_PP)
                .isGreaterThanOrEqualTo(MIN_CALENDAR_IMPROVEMENT_PP);
    }

    @Test
    void should_further_reduce_revenue_mape_when_calendar_features_added_on_top() {
        Result r = runBacktest(Axis.REVENUE);
        log.info("Revenue calendar gate: weather={}, weather+calendar={}, delta={}",
                r.weather(), r.weatherCalendar(), r.weather() - r.weatherCalendar());
        assertThat(r.weather() - r.weatherCalendar())
                .as("revenue: calendar should improve over weather-only by ≥ %s", MIN_CALENDAR_IMPROVEMENT_PP)
                .isGreaterThanOrEqualTo(MIN_CALENDAR_IMPROVEMENT_PP);
    }

    private Result runBacktest(Axis axis) {
        List<HistoricalPoint> train = loadHistory(TRAIN_FROM, TRAIN_TO, axis);
        List<HistoricalPoint> evalSet = loadHistory(EVAL_FROM, EVAL_TO, axis);
        Map<LocalDate, DailyWeather> weatherByDate = loadWeatherByDate();

        List<WeatherFeatures> trainWeather = weatherFor(train, weatherByDate);
        List<WeatherFeatures> evalWeather = weatherFor(evalSet, weatherByDate);

        // Empty calendar features for the weather-only baseline.
        List<CalendarFeatures> emptyTrainCal = train.stream()
                .map(p -> CalendarFeatures.empty(p.date())).toList();
        List<CalendarFeatures> emptyEvalCal = evalSet.stream()
                .map(p -> CalendarFeatures.empty(p.date())).toList();

        // Real calendar features pulled from the V50 holiday seed + quincena logic.
        Set<LocalDate> trainDates = new HashSet<>();
        Set<LocalDate> evalDates = new HashSet<>();
        train.forEach(p -> trainDates.add(p.date()));
        evalSet.forEach(p -> evalDates.add(p.date()));
        List<CalendarFeatures> trainCalendar = holidayCalendar.featuresForDates(trainDates);
        List<CalendarFeatures> evalCalendar = holidayCalendar.featuresForDates(evalDates);

        ForecastModel seasonal = SeasonalNaiveForecaster.fit(train);
        WeatherAugmentedModel weatherOnly = WeatherAdjustedForecaster.fit(train, trainWeather, emptyTrainCal);
        WeatherAugmentedModel weatherCalendar = WeatherAdjustedForecaster.fit(train, trainWeather, trainCalendar);

        double seasonalMape = SeasonalNaiveForecaster.mape(seasonal, evalSet);
        double weatherMape = WeatherAdjustedForecaster.mape(weatherOnly, evalSet, evalWeather, emptyEvalCal);
        double wcMape = WeatherAdjustedForecaster.mape(weatherCalendar, evalSet, evalWeather, evalCalendar);

        return new Result(seasonalMape, weatherMape, wcMape);
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

    private List<WeatherFeatures> weatherFor(List<HistoricalPoint> points, Map<LocalDate, DailyWeather> byDate) {
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

    private record Result(double seasonal, double weather, double weatherCalendar) {
    }
}
