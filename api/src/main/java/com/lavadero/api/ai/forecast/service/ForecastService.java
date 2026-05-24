package com.lavadero.api.ai.forecast.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lavadero.api.ai.calendar.domain.HolidayCalendar;
import com.lavadero.api.ai.calendar.repository.HolidayCalendarRepository;
import com.lavadero.api.ai.calendar.service.HolidayCalendarService;
import com.lavadero.api.ai.domain.AiFeatureType;
import com.lavadero.api.ai.domain.AiInsight;
import com.lavadero.api.ai.domain.AiInsightSeverity;
import com.lavadero.api.ai.forecast.config.ForecastProperties;
import com.lavadero.api.ai.forecast.domain.CalendarFeatures;
import com.lavadero.api.ai.forecast.domain.DailyForecast;
import com.lavadero.api.ai.forecast.domain.ForecastModel;
import com.lavadero.api.ai.forecast.domain.ForecastPoint;
import com.lavadero.api.ai.forecast.domain.HistoricalPoint;
import com.lavadero.api.ai.forecast.domain.WeatherAugmentedModel;
import com.lavadero.api.ai.forecast.domain.WeatherFeatures;
import com.lavadero.api.ai.forecast.repository.DailyForecastRepository;
import com.lavadero.api.ai.forecast.service.PythonForecastClient.PythonForecastException;
import com.lavadero.api.ai.forecast.web.ForecastDtos.ForecastPointResponse;
import com.lavadero.api.ai.forecast.web.ForecastDtos.ForecastResponse;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.HorizonRow;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.Prediction;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastRequest;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastResponse;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.TrainingRow;
import com.lavadero.api.ai.repository.AiInsightRepository;
import com.lavadero.api.ai.weather.config.WeatherProperties;
import com.lavadero.api.ai.weather.domain.DailyWeather;
import com.lavadero.api.ai.weather.repository.DailyWeatherRepository;
import com.lavadero.api.reports.domain.HistoricalDailySnapshot;
import com.lavadero.api.reports.repository.HistoricalDailySnapshotRepository;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generates 7-day demand forecasts and persists them as audit-friendly rows
 * plus a single advisory AiInsight per snapshot. AI-as-advisory: forecast rows
 * are never read by other business logic for source-of-truth decisions.
 *
 * <p>When {@link WeatherProperties#isEnabled()} is true and the weather table
 * has at least {@link #MIN_WEATHER_ROWS_FOR_AUGMENT} rows, the seasonal-naive
 * model is upgraded to a weather-adjusted variant. Otherwise the original
 * seasonal-only path runs unchanged.
 */
@Service
public class ForecastService {

    private static final Logger log = LoggerFactory.getLogger(ForecastService.class);

    public static final int DEFAULT_HORIZON_DAYS = 7;
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final int MIN_TRAINING_DAYS = 14;
    private static final int RECENT_OPERATIONAL_LOOKBACK_DAYS = 60;
    private static final int BACKTEST_WINDOW_DAYS = 30;
    private static final int MIN_WEATHER_ROWS_FOR_AUGMENT = 30;

    private final HistoricalDailySnapshotRepository historical;
    private final DailySummaryService dailySummary;
    private final DailyForecastRepository forecasts;
    private final AiInsightRepository insights;
    private final DailyWeatherRepository weather;
    private final WeatherProperties weatherProperties;
    private final HolidayCalendarService holidayCalendar;
    private final HolidayCalendarRepository holidayCalendarRepository;
    private final ObjectMapper objectMapper;
    private final ForecastProperties forecastProperties;
    private final PythonForecastClient pythonClient;

    public ForecastService(HistoricalDailySnapshotRepository historical, DailySummaryService dailySummary,
            DailyForecastRepository forecasts, AiInsightRepository insights,
            DailyWeatherRepository weather, WeatherProperties weatherProperties,
            HolidayCalendarService holidayCalendar,
            HolidayCalendarRepository holidayCalendarRepository,
            ObjectMapper objectMapper,
            ForecastProperties forecastProperties,
            PythonForecastClient pythonClient) {
        this.historical = historical;
        this.dailySummary = dailySummary;
        this.forecasts = forecasts;
        this.insights = insights;
        this.weather = weather;
        this.weatherProperties = weatherProperties;
        this.holidayCalendar = holidayCalendar;
        this.holidayCalendarRepository = holidayCalendarRepository;
        this.objectMapper = objectMapper;
        this.forecastProperties = forecastProperties;
        this.pythonClient = pythonClient;
    }

    @Transactional
    public ForecastResponse runForecast(LocalDate snapshotDate, int horizonDays) {
        if (horizonDays <= 0) {
            throw new IllegalArgumentException("horizonDays must be positive");
        }
        List<HistoricalPoint> cars = loadHistory(snapshotDate, HistoryAxis.CARS);
        List<HistoricalPoint> revenue = loadHistory(snapshotDate, HistoryAxis.REVENUE);
        if (cars.size() < MIN_TRAINING_DAYS || revenue.size() < MIN_TRAINING_DAYS) {
            throw new IllegalStateException(
                    "Not enough historical data to fit forecast (cars=%d, revenue=%d, need %d)"
                            .formatted(cars.size(), revenue.size(), MIN_TRAINING_DAYS));
        }

        Generated generated;
        if (usePython() && useWeather()) {
            try {
                generated = generatePython(snapshotDate, horizonDays, cars, revenue);
            } catch (PythonForecastException ex) {
                log.warn("Python forecast unreachable, falling back to weather-adjusted Java path: {}",
                        ex.getMessage());
                generated = generateWithWeather(snapshotDate, horizonDays, cars, revenue);
            }
        } else if (useWeather()) {
            generated = generateWithWeather(snapshotDate, horizonDays, cars, revenue);
        } else {
            generated = generateSeasonal(snapshotDate, horizonDays, cars, revenue);
        }

        forecasts.deleteBySnapshotDate(snapshotDate);
        // Force the delete to flush before re-inserting; otherwise the unique
        // (tenant_id, snapshot_date, horizon_date) constraint fires on rerun-same-day.
        forecasts.flush();

        Map<LocalDate, WeatherFeatures> horizonByDate = byDate(generated.horizonWeather());
        List<ForecastPointResponse> responsePoints = new ArrayList<>(horizonDays);
        for (int i = 0; i < horizonDays; i++) {
            ForecastPoint cp = generated.carPoints().get(i);
            ForecastPoint rp = generated.revenuePoints().get(i);
            int predictedCars = (int) Math.round(cp.predicted());
            int predictedCarsLow = (int) Math.round(cp.low());
            int predictedCarsHigh = (int) Math.round(cp.high());
            BigDecimal predictedRevenue = bd(rp.predicted());
            BigDecimal predictedRevenueLow = bd(Math.max(0.0, rp.low()));
            BigDecimal predictedRevenueHigh = bd(rp.high());
            WeatherFeatures w = horizonByDate.get(cp.date());
            BigDecimal expectedPrecip = w == null ? null : bd(w.precipMm());
            BigDecimal expectedTempMax = w == null ? null : bd1(w.tempMaxC());

            forecasts.save(new DailyForecast(snapshotDate, cp.date(),
                    predictedCars, predictedCarsLow, predictedCarsHigh,
                    predictedRevenue, predictedRevenueLow, predictedRevenueHigh,
                    generated.modelVersion(),
                    expectedPrecip, expectedTempMax));
            responsePoints.add(new ForecastPointResponse(cp.date(),
                    predictedCars, predictedCarsLow, predictedCarsHigh,
                    predictedRevenue, predictedRevenueLow, predictedRevenueHigh,
                    expectedPrecip, expectedTempMax));
        }

        Double carsMape = rollingMape(snapshotDate, HistoryAxis.CARS);
        Double revenueMape = rollingMape(snapshotDate, HistoryAxis.REVENUE);
        ForecastResponse response = new ForecastResponse(snapshotDate, Instant.now(),
                generated.modelVersion(), horizonDays, carsMape, revenueMape, responsePoints);
        emitInsight(snapshotDate, response, generated.carsSeasonal(), generated.revenueSeasonal(),
                generated.weatherActive());
        return response;
    }

    @Transactional(readOnly = true)
    public ForecastResponse latest(int horizonDays) {
        return forecasts.findTopByOrderBySnapshotDateDesc()
                .map(latest -> assemble(latest.getSnapshotDate(), horizonDays))
                .orElseThrow(() -> new IllegalStateException("No forecast has been generated yet"));
    }

    @Transactional(readOnly = true)
    public ForecastResponse forSnapshot(LocalDate snapshotDate, int horizonDays) {
        return assemble(snapshotDate, horizonDays);
    }

    private ForecastResponse assemble(LocalDate snapshotDate, int horizonDays) {
        List<DailyForecast> rows = forecasts.findBySnapshotDateOrderByHorizonDateAsc(snapshotDate);
        if (rows.isEmpty()) {
            throw new IllegalStateException("No forecast persisted for snapshot " + snapshotDate);
        }
        List<ForecastPointResponse> points = rows.stream()
                .limit(horizonDays)
                .map(r -> new ForecastPointResponse(r.getHorizonDate(),
                        r.getPredictedCars(), r.getPredictedCarsLow(), r.getPredictedCarsHigh(),
                        r.getPredictedRevenueMxn(), r.getPredictedRevenueMxnLow(), r.getPredictedRevenueMxnHigh(),
                        r.getExpectedPrecipitationMm(), r.getExpectedTempMaxC()))
                .toList();
        Double carsMape = rollingMape(snapshotDate, HistoryAxis.CARS);
        Double revenueMape = rollingMape(snapshotDate, HistoryAxis.REVENUE);
        DailyForecast first = rows.get(0);
        return new ForecastResponse(snapshotDate, first.getCreatedAt(),
                first.getModelVersion(), points.size(), carsMape, revenueMape, points);
    }

    // ── Generation paths ─────────────────────────────────────────────

    private Generated generateSeasonal(LocalDate snapshotDate, int horizonDays,
            List<HistoricalPoint> cars, List<HistoricalPoint> revenue) {
        ForecastModel carsModel = SeasonalNaiveForecaster.fit(cars);
        ForecastModel revenueModel = SeasonalNaiveForecaster.fit(revenue);
        List<ForecastPoint> carPoints = SeasonalNaiveForecaster.predict(carsModel, snapshotDate.plusDays(1), horizonDays);
        List<ForecastPoint> revPoints = SeasonalNaiveForecaster.predict(revenueModel, snapshotDate.plusDays(1), horizonDays);
        String version = compactVersion(carsModel, revenueModel, false);
        return new Generated(carPoints, revPoints, List.of(), carsModel, revenueModel, version, false);
    }

    private Generated generateWithWeather(LocalDate snapshotDate, int horizonDays,
            List<HistoricalPoint> cars, List<HistoricalPoint> revenue) {
        java.util.Set<LocalDate> trainingDates = carsAndRevenueDates(cars, revenue);
        List<WeatherFeatures> trainWeather = weatherFeaturesForDates(trainingDates);
        List<CalendarFeatures> trainCalendar = holidayCalendar.featuresForDates(trainingDates);
        WeatherAugmentedModel carsModel = WeatherAdjustedForecaster.fit(cars, trainWeather, trainCalendar);
        WeatherAugmentedModel revenueModel = WeatherAdjustedForecaster.fit(revenue, trainWeather, trainCalendar);

        LocalDate horizonStart = snapshotDate.plusDays(1);
        LocalDate horizonEnd = snapshotDate.plusDays(horizonDays);
        List<WeatherFeatures> horizonWeather = weatherFeaturesForRange(horizonStart, horizonEnd);
        List<CalendarFeatures> horizonCalendar = holidayCalendar.featuresForRange(horizonStart, horizonEnd);

        List<ForecastPoint> carPoints = WeatherAdjustedForecaster.predict(
                carsModel, horizonStart, horizonDays, horizonWeather, horizonCalendar);
        List<ForecastPoint> revPoints = WeatherAdjustedForecaster.predict(
                revenueModel, horizonStart, horizonDays, horizonWeather, horizonCalendar);

        String version = compactVersion(carsModel.seasonal(), revenueModel.seasonal(), true);
        return new Generated(carPoints, revPoints, horizonWeather,
                carsModel.seasonal(), revenueModel.seasonal(), version, true);
    }

    private boolean useWeather() {
        return weatherProperties.isEnabled() && weather.count() >= MIN_WEATHER_ROWS_FOR_AUGMENT;
    }

    private boolean usePython() {
        return forecastProperties.getProvider() != null
                && forecastProperties.getProvider().equalsIgnoreCase("python");
    }

    private String compactVersion(ForecastModel cars, ForecastModel revenue, boolean weatherActive) {
        // +wc = weather + calendar features both active in the OLS residual model.
        String suffix = weatherActive ? "+wc" : "";
        return "snf-1.0%s/n=%d/through=%s/sc=%.1f/sr=%.0f".formatted(
                suffix, cars.trainingSize(), cars.fittedThrough(),
                cars.residualSigma(), revenue.residualSigma());
    }

    // ── Python sidecar generation path ───────────────────────────────

    private Generated generatePython(LocalDate snapshotDate, int horizonDays,
            List<HistoricalPoint> cars, List<HistoricalPoint> revenue) {
        // Two HTTP calls (one per axis) keep the contract simple and let the
        // Python service train a dedicated model per target.
        LocalDate horizonStart = snapshotDate.plusDays(1);
        LocalDate horizonEnd = snapshotDate.plusDays(horizonDays);

        java.util.Set<LocalDate> trainingDates = carsAndRevenueDates(cars, revenue);
        Map<LocalDate, DailyWeather> trainWeatherByDate = trainingDates.isEmpty()
                ? Map.of()
                : loadWeatherMap(trainingDates.stream().min(LocalDate::compareTo).get().minusDays(1),
                        trainingDates.stream().max(LocalDate::compareTo).get());
        Map<LocalDate, DailyWeather> horizonWeatherByDate = loadWeatherMap(horizonStart.minusDays(1), horizonEnd);
        Map<LocalDate, List<HolidayCalendar>> holidaysByDate = loadHolidaysByDate(
                minDate(trainingDates).minusDays(1), horizonEnd.plusDays(1));

        List<TrainingRow> carsTraining = buildTraining(cars, trainWeatherByDate, holidaysByDate);
        List<TrainingRow> revenueTraining = buildTraining(revenue, trainWeatherByDate, holidaysByDate);
        List<HorizonRow> horizonRows = buildHorizon(horizonStart, horizonEnd, horizonWeatherByDate, holidaysByDate);

        PythonForecastResponse carsResp = pythonClient.forecast(new PythonForecastRequest(
                snapshotDate, horizonDays, "cars", carsTraining, horizonRows));
        PythonForecastResponse revResp = pythonClient.forecast(new PythonForecastRequest(
                snapshotDate, horizonDays, "revenue", revenueTraining, horizonRows));

        List<ForecastPoint> carPoints = toForecastPoints(carsResp.predictions());
        List<ForecastPoint> revPoints = toForecastPoints(revResp.predictions());
        List<WeatherFeatures> horizonWeather = featuresOver(datesIn(horizonStart, horizonEnd), horizonWeatherByDate);

        // For insight/audit continuity we still need ForecastModel-shaped seasonal
        // factors. Fit the seasonal model on the same training set so the insight
        // payload's dowFactors/monthFactors remain interpretable.
        ForecastModel carsSeasonal = SeasonalNaiveForecaster.fit(cars);
        ForecastModel revenueSeasonal = SeasonalNaiveForecaster.fit(revenue);
        String version = pythonVersion(carsResp, revResp, carsSeasonal);

        return new Generated(carPoints, revPoints, horizonWeather,
                carsSeasonal, revenueSeasonal, version, true);
    }

    private String pythonVersion(PythonForecastResponse cars, PythonForecastResponse revenue, ForecastModel carsSeasonal) {
        // +lgbm marks the python path so existing "+w" containment assertions
        // still match (lgbm contains no 'w') without confusing the seasonal suffix.
        String upstream = cars.modelVersion() == null ? "?" : cars.modelVersion();
        return "py-1.0+lgbm/n=%d/through=%s/up=%s".formatted(
                carsSeasonal.trainingSize(), carsSeasonal.fittedThrough(), upstream);
    }

    private List<TrainingRow> buildTraining(List<HistoricalPoint> series,
            Map<LocalDate, DailyWeather> weatherByDate,
            Map<LocalDate, List<HolidayCalendar>> holidaysByDate) {
        List<TrainingRow> rows = new ArrayList<>(series.size());
        for (HistoricalPoint p : series) {
            DailyWeather w = weatherByDate.get(p.date());
            CalendarFeatures cal = calendarFeaturesFor(p.date(), holidaysByDate);
            rows.add(new TrainingRow(
                    p.date(), p.value(),
                    w == null ? 0.0 : w.getPrecipitationMm().doubleValue(),
                    w == null ? 0.0 : w.getTempMaxC().doubleValue(),
                    w == null ? 0.0 : w.getTempMinC().doubleValue(),
                    w == null || w.getWindMaxKph() == null ? 0.0 : w.getWindMaxKph().doubleValue(),
                    cal.isHoliday(), cal.dayBeforeHoliday(), cal.dayAfterHoliday(),
                    cal.isQuincenaPost(), cal.isBorderTrafficHoliday(),
                    holidayNameFor(p.date(), holidaysByDate)));
        }
        return rows;
    }

    private List<HorizonRow> buildHorizon(LocalDate from, LocalDate to,
            Map<LocalDate, DailyWeather> weatherByDate,
            Map<LocalDate, List<HolidayCalendar>> holidaysByDate) {
        List<HorizonRow> rows = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            DailyWeather w = weatherByDate.get(d);
            CalendarFeatures cal = calendarFeaturesFor(d, holidaysByDate);
            rows.add(new HorizonRow(
                    d,
                    w == null ? 0.0 : w.getPrecipitationMm().doubleValue(),
                    w == null ? 0.0 : w.getTempMaxC().doubleValue(),
                    w == null ? 0.0 : w.getTempMinC().doubleValue(),
                    w == null || w.getWindMaxKph() == null ? 0.0 : w.getWindMaxKph().doubleValue(),
                    cal.isHoliday(), cal.dayBeforeHoliday(), cal.dayAfterHoliday(),
                    cal.isQuincenaPost(), cal.isBorderTrafficHoliday(),
                    holidayNameFor(d, holidaysByDate)));
        }
        return rows;
    }

    private CalendarFeatures calendarFeaturesFor(LocalDate date, Map<LocalDate, List<HolidayCalendar>> byDate) {
        List<HolidayCalendar> today = byDate.getOrDefault(date, List.of());
        List<HolidayCalendar> tomorrow = byDate.getOrDefault(date.plusDays(1), List.of());
        List<HolidayCalendar> yesterday = byDate.getOrDefault(date.minusDays(1), List.of());
        boolean isHoliday = !today.isEmpty();
        boolean dayBefore = !tomorrow.isEmpty();
        boolean dayAfter = !yesterday.isEmpty();
        boolean borderTraffic = today.stream().anyMatch(HolidayCalendar::isDrivesBorderTraffic);
        boolean quincenaPost = CalendarFeatures.isQuincenaPostWindow(date);
        return new CalendarFeatures(date, isHoliday, dayBefore, dayAfter, quincenaPost, borderTraffic);
    }

    private String holidayNameFor(LocalDate date, Map<LocalDate, List<HolidayCalendar>> byDate) {
        List<HolidayCalendar> today = byDate.getOrDefault(date, List.of());
        return today.isEmpty() ? null : today.get(0).getName();
    }

    private Map<LocalDate, List<HolidayCalendar>> loadHolidaysByDate(LocalDate from, LocalDate to) {
        Map<LocalDate, List<HolidayCalendar>> map = new HashMap<>();
        for (HolidayCalendar h : holidayCalendarRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(from, to)) {
            map.computeIfAbsent(h.getHolidayDate(), k -> new ArrayList<>()).add(h);
        }
        return map;
    }

    private static LocalDate minDate(java.util.Set<LocalDate> dates) {
        return dates.isEmpty() ? LocalDate.now() : dates.stream().min(LocalDate::compareTo).get();
    }

    private static List<LocalDate> datesIn(LocalDate from, LocalDate to) {
        List<LocalDate> out = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            out.add(d);
        }
        return out;
    }

    private static List<ForecastPoint> toForecastPoints(List<Prediction> predictions) {
        List<ForecastPoint> out = new ArrayList<>(predictions.size());
        for (Prediction p : predictions) {
            out.add(new ForecastPoint(p.date(), p.predicted(), p.low(), p.high()));
        }
        return out;
    }

    // ── Weather feature loading ──────────────────────────────────────

    /** Loads weather features for every date in {@code dates}; missing rows become zero-weather. */
    private List<WeatherFeatures> weatherFeaturesForDates(java.util.Set<LocalDate> dates) {
        if (dates.isEmpty()) return List.of();
        LocalDate min = dates.stream().min(LocalDate::compareTo).get();
        LocalDate max = dates.stream().max(LocalDate::compareTo).get();
        Map<LocalDate, DailyWeather> byDate = loadWeatherMap(min.minusDays(1), max);
        return featuresOver(dates.stream().sorted().toList(), byDate);
    }

    private List<WeatherFeatures> weatherFeaturesForRange(LocalDate from, LocalDate to) {
        Map<LocalDate, DailyWeather> byDate = loadWeatherMap(from.minusDays(1), to);
        List<LocalDate> dates = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            dates.add(d);
        }
        return featuresOver(dates, byDate);
    }

    private Map<LocalDate, DailyWeather> loadWeatherMap(LocalDate from, LocalDate to) {
        Map<LocalDate, DailyWeather> map = new HashMap<>();
        for (DailyWeather w : weather.findBySnapshotDateBetweenOrderBySnapshotDateAsc(from, to)) {
            map.put(w.getSnapshotDate(), w);
        }
        return map;
    }

    private List<WeatherFeatures> featuresOver(List<LocalDate> dates, Map<LocalDate, DailyWeather> byDate) {
        List<WeatherFeatures> out = new ArrayList<>(dates.size());
        for (LocalDate d : dates) {
            DailyWeather today = byDate.get(d);
            DailyWeather yesterday = byDate.get(d.minusDays(1));
            double precip = today == null ? 0.0 : today.getPrecipitationMm().doubleValue();
            double tmax = today == null ? 0.0 : today.getTempMaxC().doubleValue();
            double precipYesterday = yesterday == null ? 0.0 : yesterday.getPrecipitationMm().doubleValue();
            out.add(new WeatherFeatures(d, precip, tmax, precipYesterday));
        }
        return out;
    }

    private static java.util.Set<LocalDate> carsAndRevenueDates(List<HistoricalPoint> cars, List<HistoricalPoint> revenue) {
        java.util.Set<LocalDate> set = new java.util.HashSet<>();
        for (HistoricalPoint p : cars) set.add(p.date());
        for (HistoricalPoint p : revenue) set.add(p.date());
        return set;
    }

    private static Map<LocalDate, WeatherFeatures> byDate(List<WeatherFeatures> features) {
        Map<LocalDate, WeatherFeatures> map = new HashMap<>();
        for (WeatherFeatures w : features) {
            map.put(w.date(), w);
        }
        return map;
    }

    // ── History loading (unchanged) ──────────────────────────────────

    /**
     * Build a unified history series ending at {@code snapshotDate} (inclusive), preferring
     * fresh operational data from {@link DailySummaryService#get} over the seeded
     * {@code historical_daily_snapshots} table when the two overlap.
     */
    private List<HistoricalPoint> loadHistory(LocalDate snapshotDate, HistoryAxis axis) {
        Map<LocalDate, Double> byDate = new TreeMap<>();
        List<HistoricalDailySnapshot> seed = historical
                .findBySnapshotDateBetweenOrderBySnapshotDateAsc(LocalDate.of(2000, 1, 1), snapshotDate);
        for (HistoricalDailySnapshot s : seed) {
            double v = axis == HistoryAxis.CARS
                    ? (s.getTotalCars() == null ? 0.0 : s.getTotalCars().doubleValue())
                    : (s.getRevenueMxn() == null ? 0.0 : s.getRevenueMxn().doubleValue());
            if (v > 0.0) {
                byDate.put(s.getSnapshotDate(), v);
            }
        }
        // Overlay recent operational data (overrides seed if a day has both).
        LocalDate windowStart = snapshotDate.minusDays(RECENT_OPERATIONAL_LOOKBACK_DAYS);
        for (LocalDate d = windowStart; !d.isAfter(snapshotDate); d = d.plusDays(1)) {
            DailySummaryResponse day = safeDay(d);
            if (day == null) continue;
            double v = axis == HistoryAxis.CARS
                    ? day.carsWashed()
                    : (day.ticketRevenue() == null ? 0.0 : day.ticketRevenue().doubleValue());
            if (v > 0.0) {
                byDate.put(d, v);
            }
        }
        List<HistoricalPoint> out = new ArrayList<>(byDate.size());
        byDate.forEach((d, v) -> out.add(new HistoricalPoint(d, v)));
        return out;
    }

    /**
     * Backtest accuracy from previously persisted forecasts: compares yesterday's
     * prediction-for-today against today's actual, over the last N days.
     * Returns null when we don't have enough overlap yet.
     */
    private Double rollingMape(LocalDate snapshotDate, HistoryAxis axis) {
        LocalDate from = snapshotDate.minusDays(BACKTEST_WINDOW_DAYS);
        List<DailyForecast> past = forecasts
                .findBySnapshotDateBetweenOrderBySnapshotDateAscHorizonDateAsc(from, snapshotDate.minusDays(1));
        // Use only 1-day-ahead predictions for a clean accuracy signal.
        Map<LocalDate, DailyForecast> oneDayAhead = new HashMap<>();
        for (DailyForecast f : past) {
            if (f.getHorizonDate().equals(f.getSnapshotDate().plusDays(1))) {
                oneDayAhead.put(f.getHorizonDate(), f);
            }
        }
        if (oneDayAhead.size() < 5) {
            return null;
        }
        double sum = 0.0;
        int n = 0;
        for (Map.Entry<LocalDate, DailyForecast> e : oneDayAhead.entrySet()) {
            DailySummaryResponse actual = safeDay(e.getKey());
            if (actual == null) continue;
            double actualValue = axis == HistoryAxis.CARS
                    ? actual.carsWashed()
                    : (actual.ticketRevenue() == null ? 0.0 : actual.ticketRevenue().doubleValue());
            if (actualValue <= 0.0) continue;
            double predicted = axis == HistoryAxis.CARS
                    ? e.getValue().getPredictedCars()
                    : e.getValue().getPredictedRevenueMxn().doubleValue();
            sum += Math.abs(predicted - actualValue) / actualValue;
            n++;
        }
        return n == 0 ? null : sum / n;
    }

    private DailySummaryResponse safeDay(LocalDate date) {
        try {
            return dailySummary.get(date);
        } catch (Exception ex) {
            return null;
        }
    }

    private void emitInsight(LocalDate snapshotDate, ForecastResponse response,
            ForecastModel carsModel, ForecastModel revenueModel, boolean weatherActive) {
        int totalCars = response.points().stream().mapToInt(ForecastPointResponse::predictedCars).sum();
        BigDecimal totalRevenue = response.points().stream()
                .map(ForecastPointResponse::predictedRevenueMxn)
                .reduce(ZERO, BigDecimal::add);
        ForecastPointResponse peak = response.points().stream()
                .max((a, b) -> Integer.compare(a.predictedCars(), b.predictedCars()))
                .orElseThrow();

        String summary = ("Pronóstico para los próximos %d días: %d carros estimados, $%s MXN de ingreso. "
                + "Día pico: %s con %d carros previstos.")
                .formatted(response.horizonDays(), totalCars, totalRevenue.setScale(2, RoundingMode.HALF_UP),
                        peak.date(), peak.predictedCars());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("snapshotDate", snapshotDate.toString());
        details.put("horizonDays", response.horizonDays());
        details.put("modelVersion", response.modelVersion());
        details.put("weatherActive", weatherActive);
        details.put("carsBacktestMape", response.carsBacktestMape());
        details.put("revenueBacktestMape", response.revenueBacktestMape());
        details.put("forecast", response.points());
        details.put("carsDowFactors", carsModel.dowFactors());
        details.put("carsMonthFactors", carsModel.monthFactors());
        details.put("revenueDowFactors", revenueModel.dowFactors());

        String detailsJson;
        try {
            detailsJson = objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not serialize forecast insight", ex);
        }
        String title = "Pronóstico de demanda - " + snapshotDate;
        LocalDate sourceTo = response.points().get(response.points().size() - 1).date();
        insights.save(new AiInsight(AiFeatureType.DEMAND_FORECAST, AiInsightSeverity.INFO, title, summary,
                detailsJson, snapshotDate, sourceTo, response.modelVersion()));
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal bd1(double v) {
        return BigDecimal.valueOf(v).setScale(1, RoundingMode.HALF_UP);
    }

    private enum HistoryAxis { CARS, REVENUE }

    private record Generated(
            List<ForecastPoint> carPoints,
            List<ForecastPoint> revenuePoints,
            List<WeatherFeatures> horizonWeather,
            ForecastModel carsSeasonal,
            ForecastModel revenueSeasonal,
            String modelVersion,
            boolean weatherActive) {
    }
}
