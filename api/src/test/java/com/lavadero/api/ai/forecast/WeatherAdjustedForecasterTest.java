package com.lavadero.api.ai.forecast;

import com.lavadero.api.ai.forecast.domain.CalendarFeatures;
import com.lavadero.api.ai.forecast.domain.ForecastPoint;
import com.lavadero.api.ai.forecast.domain.HistoricalPoint;
import com.lavadero.api.ai.forecast.domain.WeatherAugmentedModel;
import com.lavadero.api.ai.forecast.domain.WeatherFeatures;
import com.lavadero.api.ai.forecast.service.SeasonalNaiveForecaster;
import com.lavadero.api.ai.forecast.service.WeatherAdjustedForecaster;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WeatherAdjustedForecasterTest {

    private static List<CalendarFeatures> emptyCalendarFor(List<? extends Object> dated) {
        List<CalendarFeatures> out = new ArrayList<>();
        for (Object o : dated) {
            LocalDate d = (o instanceof WeatherFeatures w) ? w.date() : ((HistoricalPoint) o).date();
            out.add(CalendarFeatures.empty(d));
        }
        return out;
    }

    @Test
    void should_recover_negative_rain_coefficient_when_rain_correlates_with_drops() {
        LocalDate start = LocalDate.of(2025, 1, 6);
        Random rng = new Random(11);
        List<HistoricalPoint> history = new ArrayList<>();
        List<WeatherFeatures> weather = new ArrayList<>();
        for (int i = 0; i < 180; i++) {
            LocalDate d = start.plusDays(i);
            double precip = (i % 5 == 0) ? 2.0 + rng.nextDouble() : 0.0;
            double tmax = 28.0 + rng.nextGaussian();
            double value = Math.max(1.0, 50.0 - 20.0 * precip + rng.nextGaussian() * 1.0);
            history.add(new HistoricalPoint(d, value));
            double prevPrecip = i == 0 ? 0.0 : weather.get(i - 1).precipMm();
            weather.add(new WeatherFeatures(d, precip, tmax, prevPrecip));
        }

        WeatherAugmentedModel model = WeatherAdjustedForecaster.fit(history, weather, emptyCalendarFor(weather));
        // betas[0]=intercept, [1]=precip, [2]=tmax, [3]=precip_yesterday,
        // [4..8] = the 5 calendar features (all zero here).
        assertThat(model.betas()[1]).as("precipitation coefficient should be strongly negative")
                .isLessThan(-10.0);
    }

    @Test
    void should_recover_positive_holiday_coefficient_when_holidays_boost_demand() {
        // Synthetic series: ~50 cars baseline, +30 cars on holidays.
        LocalDate start = LocalDate.of(2025, 1, 1);
        Random rng = new Random(7);
        List<HistoricalPoint> history = new ArrayList<>();
        List<WeatherFeatures> weather = new ArrayList<>();
        List<CalendarFeatures> calendar = new ArrayList<>();
        for (int i = 0; i < 200; i++) {
            LocalDate d = start.plusDays(i);
            // Every 10th day is a "holiday".
            boolean holiday = i % 10 == 0;
            double value = Math.max(1.0, 50.0 + (holiday ? 30.0 : 0.0) + rng.nextGaussian() * 1.5);
            history.add(new HistoricalPoint(d, value));
            weather.add(new WeatherFeatures(d, 0.0, 28.0, 0.0));
            calendar.add(new CalendarFeatures(d, holiday, false, false, false, false));
        }

        WeatherAugmentedModel model = WeatherAdjustedForecaster.fit(history, weather, calendar);
        // betas[4] = isHoliday coefficient (first calendar feature after the 3 weather ones + intercept).
        assertThat(model.betas()[4]).as("isHoliday coefficient should be strongly positive")
                .isGreaterThan(15.0);
    }

    @Test
    void should_fall_back_to_seasonal_when_weather_features_are_constant() {
        LocalDate start = LocalDate.of(2025, 1, 6);
        List<HistoricalPoint> history = new ArrayList<>();
        List<WeatherFeatures> weather = new ArrayList<>();
        List<CalendarFeatures> calendar = new ArrayList<>();
        double[] dowMultipliers = { 0.9, 0.85, 0.9, 0.95, 1.0, 1.4, 1.4 };
        for (int i = 0; i < 120; i++) {
            LocalDate d = start.plusDays(i);
            double v = 50.0 * dowMultipliers[d.getDayOfWeek().getValue() - 1];
            history.add(new HistoricalPoint(d, v));
            weather.add(new WeatherFeatures(d, 0.0, 28.0, 0.0));
            calendar.add(CalendarFeatures.empty(d));
        }
        WeatherAugmentedModel adjusted = WeatherAdjustedForecaster.fit(history, weather, calendar);

        List<WeatherFeatures> horizonWeather = new ArrayList<>();
        List<CalendarFeatures> horizonCalendar = new ArrayList<>();
        for (int h = 0; h < 7; h++) {
            LocalDate d = start.plusDays(125 + h);
            horizonWeather.add(new WeatherFeatures(d, 0.0, 28.0, 0.0));
            horizonCalendar.add(CalendarFeatures.empty(d));
        }

        List<ForecastPoint> withWeather = WeatherAdjustedForecaster.predict(
                adjusted, start.plusDays(125), 7, horizonWeather, horizonCalendar);
        List<ForecastPoint> bare = SeasonalNaiveForecaster.predict(
                SeasonalNaiveForecaster.fit(history), start.plusDays(125), 7);

        for (int i = 0; i < 7; i++) {
            assertThat(withWeather.get(i).predicted())
                    .isCloseTo(bare.get(i).predicted(), Offset.offset(0.5));
        }
    }

    @Test
    void should_apply_forecast_weather_to_horizon_predictions() {
        LocalDate start = LocalDate.of(2025, 1, 6);
        Random rng = new Random(99);
        List<HistoricalPoint> history = new ArrayList<>();
        List<WeatherFeatures> weather = new ArrayList<>();
        for (int i = 0; i < 180; i++) {
            LocalDate d = start.plusDays(i);
            double precip = (i % 6 == 0) ? 5.0 : 0.0;
            double tmax = 28.0 + rng.nextGaussian() * 0.5;
            double value = Math.max(1.0, 60.0 - 8.0 * precip + rng.nextGaussian() * 0.5);
            history.add(new HistoricalPoint(d, value));
            double prevPrecip = i == 0 ? 0.0 : weather.get(i - 1).precipMm();
            weather.add(new WeatherFeatures(d, precip, tmax, prevPrecip));
        }

        WeatherAugmentedModel model = WeatherAdjustedForecaster.fit(history, weather, emptyCalendarFor(weather));

        LocalDate horizonStart = start.plusDays(200);
        List<WeatherFeatures> dryForecast = List.of(new WeatherFeatures(horizonStart, 0.0, 28.0, 0.0));
        List<WeatherFeatures> rainyForecast = List.of(new WeatherFeatures(horizonStart, 10.0, 28.0, 0.0));
        List<CalendarFeatures> emptyCal = List.of(CalendarFeatures.empty(horizonStart));

        double dry = WeatherAdjustedForecaster
                .predict(model, horizonStart, 1, dryForecast, emptyCal).get(0).predicted();
        double rainy = WeatherAdjustedForecaster
                .predict(model, horizonStart, 1, rainyForecast, emptyCal).get(0).predicted();

        assertThat(rainy).as("rainy-day forecast must be lower than dry-day forecast")
                .isLessThan(dry - 10.0);
    }
}
