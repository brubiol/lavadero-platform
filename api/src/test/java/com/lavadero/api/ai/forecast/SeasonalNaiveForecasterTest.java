package com.lavadero.api.ai.forecast;

import com.lavadero.api.ai.forecast.domain.ForecastModel;
import com.lavadero.api.ai.forecast.domain.ForecastPoint;
import com.lavadero.api.ai.forecast.domain.HistoricalPoint;
import com.lavadero.api.ai.forecast.service.SeasonalNaiveForecaster;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SeasonalNaiveForecasterTest {

    private static final double EPSILON = 0.001;

    @Test
    void should_recover_dow_pattern_when_fit_on_synthetic_weekly_series() {
        // Saturday/Sunday at ~140%, weekdays at 90% of a 50-car mean. 16 weeks.
        double[] weekdayFactors = {0.9, 0.85, 0.9, 0.95, 1.0, 1.4, 1.4};
        double mean = 50.0;
        List<HistoricalPoint> series = syntheticSeries(LocalDate.of(2025, 1, 6), 16 * 7,
                d -> mean * weekdayFactors[d.getDayOfWeek().getValue() - 1]);

        ForecastModel model = SeasonalNaiveForecaster.fit(series);

        // Saturday factor (index 5) should be close to 1.4/avg, Tuesday (index 1) close to 0.85/avg.
        double overallMean = avg(weekdayFactors);
        assertThat(model.dowFactors()[DayOfWeek.SATURDAY.getValue() - 1])
                .isCloseTo(weekdayFactors[DayOfWeek.SATURDAY.getValue() - 1] / overallMean,
                        org.assertj.core.data.Offset.offset(0.05));
        assertThat(model.dowFactors()[DayOfWeek.TUESDAY.getValue() - 1])
                .isCloseTo(weekdayFactors[DayOfWeek.TUESDAY.getValue() - 1] / overallMean,
                        org.assertj.core.data.Offset.offset(0.05));
        assertThat(model.baseline()).isCloseTo(mean * overallMean, org.assertj.core.data.Offset.offset(2.0));
    }

    @Test
    void should_extrapolate_trend_when_fit_on_linear_growth() {
        // Pure linear growth: 30 + 0.5 * day_index, no seasonality.
        List<HistoricalPoint> series = syntheticSeries(LocalDate.of(2025, 6, 1), 90,
                d -> 30.0 + 0.5 * (LocalDate.of(2025, 6, 1).until(d).getDays()));

        ForecastModel model = SeasonalNaiveForecaster.fit(series);
        List<ForecastPoint> predictions = SeasonalNaiveForecaster
                .predict(model, LocalDate.of(2025, 8, 30).plusDays(1), 14);

        // Slope must be positive and a same-DOW point 7 days later must be higher
        // (compare h=0 vs h=7 to neutralize any DOW-factor noise from the fit).
        assertThat(model.trendSlope()).isGreaterThan(0.0);
        assertThat(predictions.get(7).predicted())
                .isGreaterThan(predictions.get(0).predicted() + EPSILON);
        assertThat(predictions.get(13).predicted())
                .isGreaterThan(predictions.get(6).predicted() + EPSILON);
    }

    @Test
    void should_widen_intervals_when_residual_variance_increases() {
        LocalDate start = LocalDate.of(2025, 1, 6);
        List<HistoricalPoint> quiet = syntheticSeries(start, 90, d -> 50.0);
        List<HistoricalPoint> noisy = noisySeries(start, 90, 50.0, 15.0, 42L);

        ForecastModel quietModel = SeasonalNaiveForecaster.fit(quiet);
        ForecastModel noisyModel = SeasonalNaiveForecaster.fit(noisy);
        List<ForecastPoint> quietPred = SeasonalNaiveForecaster.predict(quietModel, start.plusDays(100), 3);
        List<ForecastPoint> noisyPred = SeasonalNaiveForecaster.predict(noisyModel, start.plusDays(100), 3);

        double quietWidth = quietPred.get(0).high() - quietPred.get(0).low();
        double noisyWidth = noisyPred.get(0).high() - noisyPred.get(0).low();
        assertThat(noisyWidth).isGreaterThan(quietWidth);
    }

    @Test
    void should_reject_when_history_is_too_short() {
        List<HistoricalPoint> tiny = syntheticSeries(LocalDate.of(2025, 1, 1), 7, d -> 50.0);
        assertThatThrownBy(() -> SeasonalNaiveForecaster.fit(tiny))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static List<HistoricalPoint> syntheticSeries(LocalDate start, int days,
            java.util.function.ToDoubleFunction<LocalDate> valueFn) {
        List<HistoricalPoint> points = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            LocalDate d = start.plusDays(i);
            points.add(new HistoricalPoint(d, valueFn.applyAsDouble(d)));
        }
        return points;
    }

    private static List<HistoricalPoint> noisySeries(LocalDate start, int days, double mean, double stddev, long seed) {
        Random rng = new Random(seed);
        List<HistoricalPoint> points = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            double v = Math.max(1.0, mean + rng.nextGaussian() * stddev);
            points.add(new HistoricalPoint(start.plusDays(i), v));
        }
        return points;
    }

    private static double avg(double[] arr) {
        double sum = 0.0;
        for (double v : arr) sum += v;
        return sum / arr.length;
    }
}
