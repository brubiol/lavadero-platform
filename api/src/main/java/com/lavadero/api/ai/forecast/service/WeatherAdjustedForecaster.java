package com.lavadero.api.ai.forecast.service;

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
 * then fits an OLS regression of seasonal residuals against weather features
 * (precip, max temp, yesterday's precip).
 *
 * <p>Prediction = seasonal_prediction + ols_residual(weather_for_date).
 * Prediction interval uses the post-OLS residual sigma, so days with strong
 * weather signal get tighter bands.
 */
public final class WeatherAdjustedForecaster {

    private static final double Z_95 = 1.96;

    private WeatherAdjustedForecaster() {
    }

    public static WeatherAugmentedModel fit(List<HistoricalPoint> history, List<WeatherFeatures> weatherTraining) {
        ForecastModel seasonal = SeasonalNaiveForecaster.fit(history);

        Map<LocalDate, WeatherFeatures> byDate = new HashMap<>();
        for (WeatherFeatures w : weatherTraining) {
            byDate.put(w.date(), w);
        }

        List<double[]> rows = new ArrayList<>();
        List<Double> residuals = new ArrayList<>();
        for (HistoricalPoint p : history) {
            if (p.value() <= 0.0) continue;
            WeatherFeatures w = byDate.get(p.date());
            if (w == null) continue;
            double predicted = seasonalPoint(seasonal, p.date());
            double residual = p.value() - predicted;
            rows.add(w.asVector());
            residuals.add(residual);
        }

        double[] betas;
        if (rows.size() < 30) {
            // Not enough overlap between history and weather to regress; fall back
            // to a no-weather correction so the model is still callable.
            betas = new double[] { 0.0, 0.0, 0.0, 0.0 };
        } else {
            double[][] x = rows.toArray(double[][]::new);
            double[] y = residuals.stream().mapToDouble(Double::doubleValue).toArray();
            betas = OrdinaryLeastSquares.fit(x, y);
        }

        double sigmaAfter = recomputeSigma(history, seasonal, betas, byDate);
        return new WeatherAugmentedModel(seasonal, betas, sigmaAfter);
    }

    public static List<ForecastPoint> predict(WeatherAugmentedModel model, LocalDate startInclusive,
            int horizonDays, List<WeatherFeatures> forecastWeather) {
        if (horizonDays <= 0) {
            throw new IllegalArgumentException("horizonDays must be positive");
        }
        Map<LocalDate, WeatherFeatures> byDate = new HashMap<>();
        for (WeatherFeatures w : forecastWeather) {
            byDate.put(w.date(), w);
        }

        List<ForecastPoint> out = new ArrayList<>(horizonDays);
        double sigma = model.residualSigmaWithWeather();
        for (int h = 0; h < horizonDays; h++) {
            LocalDate d = startInclusive.plusDays(h);
            double seasonal = predictSeasonalAt(model.seasonal(), d, h + 1);
            WeatherFeatures w = byDate.get(d);
            double correction = w == null
                    ? 0.0
                    : OrdinaryLeastSquares.predict(model.betas(), w.asVector());
            double predicted = Math.max(0.0, seasonal + correction);
            double low = Math.max(0.0, predicted - Z_95 * sigma);
            double high = predicted + Z_95 * sigma;
            out.add(new ForecastPoint(d, predicted, low, high));
        }
        return out;
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
            double[] betas, Map<LocalDate, WeatherFeatures> byDate) {
        double sumSq = 0.0;
        int n = 0;
        for (HistoricalPoint p : history) {
            if (p.value() <= 0.0) continue;
            double seasonalPart = seasonalPoint(seasonal, p.date());
            WeatherFeatures w = byDate.get(p.date());
            double correction = w == null ? 0.0 : OrdinaryLeastSquares.predict(betas, w.asVector());
            double err = p.value() - (seasonalPart + correction);
            sumSq += err * err;
            n++;
        }
        if (n <= 1) {
            return seasonal.residualSigma();
        }
        return Math.sqrt(sumSq / (n - 1));
    }

    /**
     * MAPE of the weather-augmented model against an evaluation set, used by
     * the rollout-gate backtest test.
     */
    public static double mape(WeatherAugmentedModel model, List<HistoricalPoint> evaluation,
            List<WeatherFeatures> evaluationWeather) {
        if (evaluation.isEmpty()) return 0.0;
        Map<LocalDate, WeatherFeatures> byDate = new HashMap<>();
        for (WeatherFeatures w : evaluationWeather) {
            byDate.put(w.date(), w);
        }
        double sum = 0.0;
        int n = 0;
        for (HistoricalPoint p : evaluation) {
            if (p.value() <= 0.0) continue;
            double seasonal = seasonalPoint(model.seasonal(), p.date());
            WeatherFeatures w = byDate.get(p.date());
            double correction = w == null ? 0.0 : OrdinaryLeastSquares.predict(model.betas(), w.asVector());
            double predicted = Math.max(0.0, seasonal + correction);
            sum += Math.abs(predicted - p.value()) / p.value();
            n++;
        }
        return n == 0 ? 0.0 : sum / n;
    }
}
