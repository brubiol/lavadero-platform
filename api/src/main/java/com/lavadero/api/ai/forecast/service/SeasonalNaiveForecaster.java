package com.lavadero.api.ai.forecast.service;

import com.lavadero.api.ai.forecast.domain.ForecastModel;
import com.lavadero.api.ai.forecast.domain.ForecastPoint;
import com.lavadero.api.ai.forecast.domain.HistoricalPoint;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Pure-Java multiplicative seasonal-naive forecaster with linear trend.
 *
 * forecast(d) = (baseline + trendSlope * horizon_index) * dowFactor[dow(d)] * monthFactor[month(d)]
 *
 * Coefficients are interpretable: each factor is a multiplier vs. the overall mean,
 * so they can be sanity-checked directly in psql or a unit test.
 */
public final class SeasonalNaiveForecaster {

    private static final int TREND_WINDOW_DAYS = 60;
    private static final double Z_95 = 1.96;
    private static final double MIN_FACTOR = 0.05;

    private SeasonalNaiveForecaster() {
    }

    public static ForecastModel fit(List<HistoricalPoint> history) {
        if (history == null || history.size() < 14) {
            throw new IllegalArgumentException("Need at least 14 historical points to fit; got "
                    + (history == null ? 0 : history.size()));
        }
        List<HistoricalPoint> sorted = history.stream()
                .filter(p -> p.value() > 0.0)
                .sorted((a, b) -> a.date().compareTo(b.date()))
                .toList();
        if (sorted.size() < 14) {
            throw new IllegalArgumentException("Need at least 14 non-zero historical points; got " + sorted.size());
        }

        double overallMean = sorted.stream().mapToDouble(HistoricalPoint::value).average().orElse(0.0);
        if (overallMean <= 0.0) {
            throw new IllegalArgumentException("Overall mean must be positive");
        }

        double[] dowFactors = factorsByBucket(sorted, p -> p.date().getDayOfWeek().getValue() - 1, 7, overallMean);

        // Month factors fit on data already de-seasonalized by day-of-week,
        // so monthly lift isn't double-counted into Saturday spikes.
        double[] monthFactors = new double[12];
        Arrays.fill(monthFactors, 1.0);
        double[] sums = new double[12];
        int[] counts = new int[12];
        for (HistoricalPoint p : sorted) {
            double dowFactor = dowFactors[p.date().getDayOfWeek().getValue() - 1];
            if (dowFactor <= 0.0) continue;
            double deSeasoned = p.value() / (overallMean * dowFactor);
            int monthIdx = p.date().getMonthValue() - 1;
            sums[monthIdx] += deSeasoned;
            counts[monthIdx]++;
        }
        for (int i = 0; i < 12; i++) {
            if (counts[i] > 0) {
                monthFactors[i] = Math.max(MIN_FACTOR, sums[i] / counts[i]);
            }
        }

        // Linear trend on the trailing window of de-seasonalized values,
        // so the slope reflects underlying business growth and not seasonality.
        int start = Math.max(0, sorted.size() - TREND_WINDOW_DAYS);
        List<HistoricalPoint> tail = sorted.subList(start, sorted.size());
        double[] xs = new double[tail.size()];
        double[] ys = new double[tail.size()];
        for (int i = 0; i < tail.size(); i++) {
            HistoricalPoint p = tail.get(i);
            double dowFactor = dowFactors[p.date().getDayOfWeek().getValue() - 1];
            double monthFactor = monthFactors[p.date().getMonthValue() - 1];
            double denom = dowFactor * monthFactor;
            xs[i] = i;
            ys[i] = denom > 0.0 ? p.value() / denom : p.value();
        }
        double trendSlope = simpleSlope(xs, ys);
        double baseline = overallMean;

        // Residual sigma drives the prediction interval; computed on the full training set
        // so the interval reflects total noise, not just the trailing window.
        double sumSq = 0.0;
        int n = 0;
        for (HistoricalPoint p : sorted) {
            double predicted = baseline
                    * dowFactors[p.date().getDayOfWeek().getValue() - 1]
                    * monthFactors[p.date().getMonthValue() - 1];
            double err = p.value() - predicted;
            sumSq += err * err;
            n++;
        }
        double sigma = n > 1 ? Math.sqrt(sumSq / (n - 1)) : 0.0;

        LocalDate fittedThrough = sorted.get(sorted.size() - 1).date();
        return new ForecastModel(baseline, trendSlope, dowFactors, monthFactors, sigma, fittedThrough, sorted.size());
    }

    public static List<ForecastPoint> predict(ForecastModel model, LocalDate startInclusive, int horizonDays) {
        if (horizonDays <= 0) {
            throw new IllegalArgumentException("horizonDays must be positive");
        }
        List<ForecastPoint> out = new ArrayList<>(horizonDays);
        for (int h = 0; h < horizonDays; h++) {
            LocalDate d = startInclusive.plusDays(h);
            double level = model.baseline() + model.trendSlope() * (h + 1);
            int dowIdx = d.getDayOfWeek().getValue() - 1;
            int monthIdx = d.getMonthValue() - 1;
            double predicted = level * model.dowFactors()[dowIdx] * model.monthFactors()[monthIdx];
            double sigma = model.residualSigma();
            double low = Math.max(0.0, predicted - Z_95 * sigma);
            double high = predicted + Z_95 * sigma;
            out.add(new ForecastPoint(d, predicted, low, high));
        }
        return out;
    }

    private static double[] factorsByBucket(List<HistoricalPoint> sorted,
            java.util.function.ToIntFunction<HistoricalPoint> bucketFn, int buckets, double overallMean) {
        double[] sums = new double[buckets];
        int[] counts = new int[buckets];
        for (HistoricalPoint p : sorted) {
            int b = bucketFn.applyAsInt(p);
            sums[b] += p.value();
            counts[b]++;
        }
        double[] factors = new double[buckets];
        for (int i = 0; i < buckets; i++) {
            if (counts[i] == 0) {
                factors[i] = 1.0;
            } else {
                double bucketMean = sums[i] / counts[i];
                factors[i] = Math.max(MIN_FACTOR, bucketMean / overallMean);
            }
        }
        return factors;
    }

    private static double simpleSlope(double[] xs, double[] ys) {
        if (xs.length < 2) return 0.0;
        double meanX = 0.0;
        double meanY = 0.0;
        for (int i = 0; i < xs.length; i++) {
            meanX += xs[i];
            meanY += ys[i];
        }
        meanX /= xs.length;
        meanY /= xs.length;
        double num = 0.0;
        double den = 0.0;
        for (int i = 0; i < xs.length; i++) {
            double dx = xs[i] - meanX;
            num += dx * (ys[i] - meanY);
            den += dx * dx;
        }
        if (den == 0.0) return 0.0;
        // Convert slope of de-seasonalized values back to an additive delta on the baseline.
        // Slope is per-day on de-seasonalized scale, which is already in baseline units,
        // so returning it directly lets predict() compose level + h * slope.
        return num / den;
    }

    /**
     * Mean Absolute Percentage Error of model predictions against the supplied points.
     * Used by the backtest test to guard against model regressions.
     */
    public static double mape(ForecastModel model, List<HistoricalPoint> evaluation) {
        if (evaluation.isEmpty()) return 0.0;
        double sum = 0.0;
        int n = 0;
        for (HistoricalPoint p : evaluation) {
            if (p.value() <= 0.0) continue;
            int dowIdx = p.date().getDayOfWeek().getValue() - 1;
            int monthIdx = p.date().getMonthValue() - 1;
            double predicted = model.baseline()
                    * model.dowFactors()[dowIdx]
                    * model.monthFactors()[monthIdx];
            sum += Math.abs(predicted - p.value()) / p.value();
            n++;
        }
        return n == 0 ? 0.0 : sum / n;
    }
}
