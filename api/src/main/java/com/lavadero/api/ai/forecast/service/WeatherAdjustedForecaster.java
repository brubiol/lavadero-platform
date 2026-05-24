package com.lavadero.api.ai.forecast.service;

import com.lavadero.api.ai.forecast.domain.CalendarFeatures;
import com.lavadero.api.ai.forecast.domain.ForecastModel;
import com.lavadero.api.ai.forecast.domain.ForecastPoint;
import com.lavadero.api.ai.forecast.domain.HistoricalPoint;
import com.lavadero.api.ai.forecast.domain.WeatherAugmentedModel;
import com.lavadero.api.ai.forecast.domain.WeatherFeatures;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Two-stage forecaster: fits {@link SeasonalNaiveForecaster} on the level,
 * then fits an OLS regression of seasonal residuals against an exogenous
 * feature vector built from {@link WeatherFeatures} (3 dims) and
 * {@link CalendarFeatures} (5 dims). The OLS has 8 inputs + intercept = 9
 * coefficients.
 *
 * <p>Prediction = seasonal_prediction + ols_residual(weather_for_d, calendar_for_d).
 * Prediction interval uses the post-OLS residual sigma, so days with strong
 * exogenous signal (rain, holiday) get tighter bands.
 *
 * <p>Passing empty / null calendar features makes this fall back to the
 * weather-only model (zero coefficients on the calendar dimensions).
 */
public final class WeatherAdjustedForecaster {

    private static final double Z_95 = 1.96;
    private static final int MIN_OVERLAP_FOR_OLS = 30;

    private WeatherAdjustedForecaster() {
    }

    public static WeatherAugmentedModel fit(List<HistoricalPoint> history,
            List<WeatherFeatures> weatherTraining,
            List<CalendarFeatures> calendarTraining) {
        ForecastModel seasonal = SeasonalNaiveForecaster.fit(history);

        Map<LocalDate, WeatherFeatures> weatherByDate = indexWeather(weatherTraining);
        Map<LocalDate, CalendarFeatures> calendarByDate = indexCalendar(calendarTraining);

        List<double[]> rows = new ArrayList<>();
        List<Double> residuals = new ArrayList<>();
        for (HistoricalPoint p : history) {
            if (p.value() <= 0.0) continue;
            WeatherFeatures w = weatherByDate.get(p.date());
            if (w == null) continue;
            CalendarFeatures c = calendarByDate.getOrDefault(p.date(), CalendarFeatures.empty(p.date()));
            double predicted = seasonalPoint(seasonal, p.date());
            double residual = p.value() - predicted;
            rows.add(combine(w.asVector(), c.asVector()));
            residuals.add(residual);
        }

        int featureCount = WeatherFeatures.DIMENSION + CalendarFeatures.DIMENSION;
        double[] betas;
        if (rows.size() < MIN_OVERLAP_FOR_OLS) {
            // Not enough overlap between history and exogenous data — degrade to zero
            // contribution so callers still get a usable model.
            betas = new double[featureCount + 1];
        } else {
            double[][] x = rows.toArray(double[][]::new);
            double[] y = residuals.stream().mapToDouble(Double::doubleValue).toArray();
            betas = OrdinaryLeastSquares.fit(x, y);
        }

        double sigmaAfter = recomputeSigma(history, seasonal, betas, weatherByDate, calendarByDate);
        return new WeatherAugmentedModel(seasonal, betas, sigmaAfter);
    }

    public static List<ForecastPoint> predict(WeatherAugmentedModel model, LocalDate startInclusive,
            int horizonDays, List<WeatherFeatures> forecastWeather,
            List<CalendarFeatures> forecastCalendar) {
        if (horizonDays <= 0) {
            throw new IllegalArgumentException("horizonDays must be positive");
        }
        Map<LocalDate, WeatherFeatures> weatherByDate = indexWeather(forecastWeather);
        Map<LocalDate, CalendarFeatures> calendarByDate = indexCalendar(forecastCalendar);

        List<ForecastPoint> out = new ArrayList<>(horizonDays);
        double sigma = model.residualSigmaWithWeather();
        for (int h = 0; h < horizonDays; h++) {
            LocalDate d = startInclusive.plusDays(h);
            double seasonal = predictSeasonalAt(model.seasonal(), d, h + 1);
            WeatherFeatures w = weatherByDate.get(d);
            CalendarFeatures c = calendarByDate.getOrDefault(d, CalendarFeatures.empty(d));
            double correction;
            if (w == null) {
                correction = 0.0;
            } else {
                correction = OrdinaryLeastSquares.predict(model.betas(), combine(w.asVector(), c.asVector()));
            }
            double predicted = Math.max(0.0, seasonal + correction);
            double low = Math.max(0.0, predicted - Z_95 * sigma);
            double high = predicted + Z_95 * sigma;
            out.add(new ForecastPoint(d, predicted, low, high));
        }
        return out;
    }

    /**
     * MAPE against an evaluation set using both feature axes, used by the
     * rollout-gate backtest tests.
     */
    public static double mape(WeatherAugmentedModel model, List<HistoricalPoint> evaluation,
            List<WeatherFeatures> evaluationWeather, List<CalendarFeatures> evaluationCalendar) {
        if (evaluation.isEmpty()) return 0.0;
        Map<LocalDate, WeatherFeatures> weatherByDate = indexWeather(evaluationWeather);
        Map<LocalDate, CalendarFeatures> calendarByDate = indexCalendar(evaluationCalendar);
        double sum = 0.0;
        int n = 0;
        for (HistoricalPoint p : evaluation) {
            if (p.value() <= 0.0) continue;
            double seasonal = seasonalPoint(model.seasonal(), p.date());
            WeatherFeatures w = weatherByDate.get(p.date());
            CalendarFeatures c = calendarByDate.getOrDefault(p.date(), CalendarFeatures.empty(p.date()));
            double correction = w == null
                    ? 0.0
                    : OrdinaryLeastSquares.predict(model.betas(), combine(w.asVector(), c.asVector()));
            double predicted = Math.max(0.0, seasonal + correction);
            sum += Math.abs(predicted - p.value()) / p.value();
            n++;
        }
        return n == 0 ? 0.0 : sum / n;
    }

    private static double seasonalPoint(ForecastModel model, LocalDate d) {
        int dowIdx = d.getDayOfWeek().getValue() - 1;
        int monthIdx = d.getMonthValue() - 1;
        return model.baseline() * model.dowFactors()[dowIdx] * model.monthFactors()[monthIdx];
    }

    private static double predictSeasonalAt(ForecastModel model, LocalDate d, int horizonOneBased) {
        int dowIdx = d.getDayOfWeek().getValue() - 1;
        int monthIdx = d.getMonthValue() - 1;
        double level = model.baseline() + model.trendSlope() * horizonOneBased;
        return level * model.dowFactors()[dowIdx] * model.monthFactors()[monthIdx];
    }

    private static double recomputeSigma(List<HistoricalPoint> history, ForecastModel seasonal,
            double[] betas, Map<LocalDate, WeatherFeatures> weatherByDate,
            Map<LocalDate, CalendarFeatures> calendarByDate) {
        double sumSq = 0.0;
        int n = 0;
        for (HistoricalPoint p : history) {
            if (p.value() <= 0.0) continue;
            double seasonalPart = seasonalPoint(seasonal, p.date());
            WeatherFeatures w = weatherByDate.get(p.date());
            CalendarFeatures c = calendarByDate.getOrDefault(p.date(), CalendarFeatures.empty(p.date()));
            double correction = w == null
                    ? 0.0
                    : OrdinaryLeastSquares.predict(betas, combine(w.asVector(), c.asVector()));
            double err = p.value() - (seasonalPart + correction);
            sumSq += err * err;
            n++;
        }
        if (n <= 1) {
            return seasonal.residualSigma();
        }
        return Math.sqrt(sumSq / (n - 1));
    }

    private static Map<LocalDate, WeatherFeatures> indexWeather(List<WeatherFeatures> list) {
        Map<LocalDate, WeatherFeatures> map = new HashMap<>();
        if (list != null) {
            for (WeatherFeatures w : list) map.put(w.date(), w);
        }
        return map;
    }

    private static Map<LocalDate, CalendarFeatures> indexCalendar(List<CalendarFeatures> list) {
        Map<LocalDate, CalendarFeatures> map = new HashMap<>();
        if (list != null) {
            for (CalendarFeatures c : list) map.put(c.date(), c);
        }
        return map;
    }

    private static double[] combine(double[] a, double[] b) {
        double[] out = new double[a.length + b.length];
        System.arraycopy(a, 0, out, 0, a.length);
        System.arraycopy(b, 0, out, a.length, b.length);
        return out;
    }
}
