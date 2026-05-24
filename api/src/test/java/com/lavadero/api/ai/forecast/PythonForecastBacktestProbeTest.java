package com.lavadero.api.ai.forecast;

import com.lavadero.api.AbstractIntegrationTest;
import com.lavadero.api.ai.calendar.domain.HolidayCalendar;
import com.lavadero.api.ai.calendar.repository.HolidayCalendarRepository;
import com.lavadero.api.ai.forecast.config.ForecastProperties;
import com.lavadero.api.ai.forecast.domain.CalendarFeatures;
import com.lavadero.api.ai.forecast.service.PythonForecastClient;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.HorizonRow;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.Prediction;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastRequest;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.PythonForecastResponse;
import com.lavadero.api.ai.forecast.web.PythonForecastDtos.TrainingRow;
import com.lavadero.api.ai.weather.domain.DailyWeather;
import com.lavadero.api.ai.weather.repository.DailyWeatherRepository;
import com.lavadero.api.reports.domain.HistoricalDailySnapshot;
import com.lavadero.api.reports.repository.HistoricalDailySnapshotRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.ToDoubleFunction;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Opt-in walk-forward measurement probe for the Python forecast sidecar.
 *
 * <p>Skipped by default. Set {@code LAVADERO_PYTHON_FORECAST_URL} to a live sidecar
 * URL (e.g. {@code http://localhost:8081}) to run; the probe trains on data up to
 * D-1 and predicts D over the last 60 days, then logs cars/revenue MAPE. There
 * are no assertions besides "test completed" — this is for measurement, not a
 * regression gate.
 */
class PythonForecastBacktestProbeTest extends AbstractIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(PythonForecastBacktestProbeTest.class);
    private static final int WINDOW_DAYS = 60;

    @Autowired
    HistoricalDailySnapshotRepository snapshots;

    @Autowired
    DailyWeatherRepository weather;

    @Autowired
    HolidayCalendarRepository holidays;

    @Autowired
    PythonForecastClient client;

    @Autowired
    ForecastProperties properties;

    @Test
    void should_log_walk_forward_mape_when_probe_is_enabled() {
        String url = System.getenv("LAVADERO_PYTHON_FORECAST_URL");
        Assumptions.assumeTrue(url != null && !url.isBlank(),
                "LAVADERO_PYTHON_FORECAST_URL not set; skipping Python backtest probe");
        String previousBaseUrl = properties.getPythonBaseUrl();
        properties.setPythonBaseUrl(url);

        try {
            List<HistoricalDailySnapshot> all = snapshots
                    .findBySnapshotDateBetweenOrderBySnapshotDateAsc(LocalDate.of(2000, 1, 1), LocalDate.now());
            Assumptions.assumeTrue(all.size() >= WINDOW_DAYS + 30,
                    "Not enough historical snapshots for walk-forward probe");

            LocalDate lastDate = all.get(all.size() - 1).getSnapshotDate();
            LocalDate probeStart = lastDate.minusDays(WINDOW_DAYS - 1);

            Map<LocalDate, DailyWeather> weatherByDate = loadWeather();
            Map<LocalDate, List<HolidayCalendar>> holidaysByDate = loadHolidays();

            // Three accumulators: cars, revenue (direct), revenue (decomposed = cars × avg_ticket).
            Accumulator cars = new Accumulator();
            Accumulator revDirect = new Accumulator();
            Accumulator revDecomp = new Accumulator();

            // dow buckets per axis — keys are DayOfWeek enums for stable ordering.
            Map<DayOfWeek, Accumulator> carsByDow = new EnumMap<>(DayOfWeek.class);
            Map<DayOfWeek, Accumulator> revDirectByDow = new EnumMap<>(DayOfWeek.class);
            Map<DayOfWeek, Accumulator> revDecompByDow = new EnumMap<>(DayOfWeek.class);
            for (DayOfWeek dw : DayOfWeek.values()) {
                carsByDow.put(dw, new Accumulator());
                revDirectByDow.put(dw, new Accumulator());
                revDecompByDow.put(dw, new Accumulator());
            }
            Accumulator carsHoliday = new Accumulator();
            Accumulator carsNonHoliday = new Accumulator();
            Accumulator revDirectHoliday = new Accumulator();
            Accumulator revDirectNonHoliday = new Accumulator();
            Accumulator revDecompHoliday = new Accumulator();
            Accumulator revDecompNonHoliday = new Accumulator();

            log.info("Per-day probe rows (date,dow,hol,actC,predC,errC,actR,predRdir,errRdir,predRdec,errRdec):");

            for (LocalDate d = probeStart; !d.isAfter(lastDate); d = d.plusDays(1)) {
                LocalDate snapshotDate = d.minusDays(1);
                HistoricalDailySnapshot actual = findOn(all, d);
                if (actual == null) continue;

                List<HistoricalDailySnapshot> training = upTo(all, snapshotDate);
                if (training.size() < 30) continue;

                ToDoubleFunction<HistoricalDailySnapshot> carsExtractor =
                        s -> s.getTotalCars() == null ? 0.0 : s.getTotalCars().doubleValue();
                ToDoubleFunction<HistoricalDailySnapshot> revExtractor =
                        s -> s.getRevenueMxn() == null ? 0.0 : s.getRevenueMxn().doubleValue();
                ToDoubleFunction<HistoricalDailySnapshot> avgTicketExtractor = s -> {
                    double c = s.getTotalCars() == null ? 0.0 : s.getTotalCars().doubleValue();
                    double r = s.getRevenueMxn() == null ? 0.0 : s.getRevenueMxn().doubleValue();
                    return c <= 0.0 ? 0.0 : r / c;
                };

                Prediction carsPred = predictOne(snapshotDate, d, training, "cars",
                        carsExtractor, weatherByDate, holidaysByDate);
                Prediction revPred = predictOne(snapshotDate, d, training, "revenue",
                        revExtractor, weatherByDate, holidaysByDate);
                Prediction avgPred = predictOne(snapshotDate, d, training, "avg_ticket",
                        avgTicketExtractor, weatherByDate, holidaysByDate);

                boolean hol = !holidaysByDate.getOrDefault(d, List.of()).isEmpty();
                DayOfWeek dow = d.getDayOfWeek();

                Double carsActual = actual.getTotalCars() == null ? null : actual.getTotalCars().doubleValue();
                Double revActual = actual.getRevenueMxn() == null ? null : actual.getRevenueMxn().doubleValue();

                Double carsErr = null;
                if (carsPred != null && carsActual != null && carsActual > 0) {
                    carsErr = Math.abs(carsPred.predicted() - carsActual) / carsActual;
                    cars.add(carsErr);
                    carsByDow.get(dow).add(carsErr);
                    (hol ? carsHoliday : carsNonHoliday).add(carsErr);
                }

                Double revDirectErr = null;
                if (revPred != null && revActual != null && revActual > 0.0) {
                    revDirectErr = Math.abs(revPred.predicted() - revActual) / revActual;
                    revDirect.add(revDirectErr);
                    revDirectByDow.get(dow).add(revDirectErr);
                    (hol ? revDirectHoliday : revDirectNonHoliday).add(revDirectErr);
                }

                Double revDecompPred = null;
                Double revDecompErr = null;
                if (carsPred != null && avgPred != null && revActual != null && revActual > 0.0) {
                    revDecompPred = carsPred.predicted() * avgPred.predicted();
                    revDecompErr = Math.abs(revDecompPred - revActual) / revActual;
                    revDecomp.add(revDecompErr);
                    revDecompByDow.get(dow).add(revDecompErr);
                    (hol ? revDecompHoliday : revDecompNonHoliday).add(revDecompErr);
                }

                log.info("{},{},{},{},{},{},{},{},{},{},{}",
                        d, dow, hol ? "Y" : "N",
                        fmt0(carsActual), fmt0(carsPred == null ? null : carsPred.predicted()), fmtPct(carsErr),
                        fmt0(revActual), fmt0(revPred == null ? null : revPred.predicted()), fmtPct(revDirectErr),
                        fmt0(revDecompPred), fmtPct(revDecompErr));
            }

            log.info("=== TOTAL MAPE ===");
            log.info("cars:          n={} MAPE={}", cars.n, cars.mape());
            log.info("revenue dir:   n={} MAPE={}", revDirect.n, revDirect.mape());
            log.info("revenue decmp: n={} MAPE={}", revDecomp.n, revDecomp.mape());

            log.info("=== MAPE BY DAY OF WEEK ===");
            log.info("dow         cars   rev-direct   rev-decomp");
            for (DayOfWeek dw : DayOfWeek.values()) {
                log.info("{}  {}  {}  {}", String.format("%-9s", dw),
                        carsByDow.get(dw).mape(), revDirectByDow.get(dw).mape(), revDecompByDow.get(dw).mape());
            }

            log.info("=== MAPE BY HOLIDAY ===");
            log.info("holiday      cars   rev-direct   rev-decomp");
            log.info("Y (n={})    {}  {}  {}", carsHoliday.n,
                    carsHoliday.mape(), revDirectHoliday.mape(), revDecompHoliday.mape());
            log.info("N (n={})    {}  {}  {}", carsNonHoliday.n,
                    carsNonHoliday.mape(), revDirectNonHoliday.mape(), revDecompNonHoliday.mape());
        } finally {
            properties.setPythonBaseUrl(previousBaseUrl);
        }
    }

    private Prediction predictOne(LocalDate snapshotDate, LocalDate target,
            List<HistoricalDailySnapshot> training, String axis,
            ToDoubleFunction<HistoricalDailySnapshot> extractor,
            Map<LocalDate, DailyWeather> weatherByDate,
            Map<LocalDate, List<HolidayCalendar>> holidaysByDate) {
        List<TrainingRow> rows = new ArrayList<>(training.size());
        for (HistoricalDailySnapshot s : training) {
            double v = extractor.applyAsDouble(s);
            if (v <= 0.0) continue;
            DailyWeather w = weatherByDate.get(s.getSnapshotDate());
            CalendarFeatures cal = calendarFor(s.getSnapshotDate(), holidaysByDate);
            rows.add(new TrainingRow(
                    s.getSnapshotDate(), v,
                    w == null ? 0.0 : w.getPrecipitationMm().doubleValue(),
                    w == null ? 0.0 : w.getTempMaxC().doubleValue(),
                    w == null ? 0.0 : w.getTempMinC().doubleValue(),
                    w == null || w.getWindMaxKph() == null ? 0.0 : w.getWindMaxKph().doubleValue(),
                    cal.isHoliday(), cal.dayBeforeHoliday(), cal.dayAfterHoliday(),
                    cal.isQuincenaPost(), cal.isBorderTrafficHoliday(),
                    nameFor(s.getSnapshotDate(), holidaysByDate)));
        }
        DailyWeather w = weatherByDate.get(target);
        CalendarFeatures cal = calendarFor(target, holidaysByDate);
        HorizonRow horizonRow = new HorizonRow(target,
                w == null ? 0.0 : w.getPrecipitationMm().doubleValue(),
                w == null ? 0.0 : w.getTempMaxC().doubleValue(),
                w == null ? 0.0 : w.getTempMinC().doubleValue(),
                w == null || w.getWindMaxKph() == null ? 0.0 : w.getWindMaxKph().doubleValue(),
                cal.isHoliday(), cal.dayBeforeHoliday(), cal.dayAfterHoliday(),
                cal.isQuincenaPost(), cal.isBorderTrafficHoliday(),
                nameFor(target, holidaysByDate));
        PythonForecastRequest req = new PythonForecastRequest(snapshotDate, 1, axis, rows, List.of(horizonRow));
        try {
            PythonForecastResponse resp = client.forecast(req);
            return resp.predictions().isEmpty() ? null : resp.predictions().get(0);
        } catch (Exception ex) {
            log.warn("Python forecast probe call failed for {} ({}): {}", target, axis, ex.getMessage());
            return null;
        }
    }

    private static String fmt0(Double v) {
        return v == null ? "-" : String.format("%.0f", v);
    }

    private static String fmtPct(Double v) {
        return v == null ? "-" : String.format("%.3f", v);
    }

    /** Running MAPE accumulator. */
    private static final class Accumulator {
        double sumAbsPct = 0.0;
        int n = 0;

        void add(double absPct) {
            sumAbsPct += absPct;
            n++;
        }

        String mape() {
            return n == 0 ? "n/a" : String.format("%.4f", sumAbsPct / n);
        }
    }

    private Map<LocalDate, DailyWeather> loadWeather() {
        Map<LocalDate, DailyWeather> map = new HashMap<>();
        for (DailyWeather w : weather.findBySnapshotDateBetweenOrderBySnapshotDateAsc(
                LocalDate.of(2000, 1, 1), LocalDate.now())) {
            map.put(w.getSnapshotDate(), w);
        }
        return map;
    }

    private Map<LocalDate, List<HolidayCalendar>> loadHolidays() {
        Map<LocalDate, List<HolidayCalendar>> map = new HashMap<>();
        for (HolidayCalendar h : holidays.findByHolidayDateBetweenOrderByHolidayDateAsc(
                LocalDate.of(2000, 1, 1), LocalDate.now().plusDays(1))) {
            map.computeIfAbsent(h.getHolidayDate(), k -> new ArrayList<>()).add(h);
        }
        return map;
    }

    private CalendarFeatures calendarFor(LocalDate date, Map<LocalDate, List<HolidayCalendar>> byDate) {
        boolean today = !byDate.getOrDefault(date, List.of()).isEmpty();
        boolean tomorrow = !byDate.getOrDefault(date.plusDays(1), List.of()).isEmpty();
        boolean yesterday = !byDate.getOrDefault(date.minusDays(1), List.of()).isEmpty();
        boolean borderTraffic = byDate.getOrDefault(date, List.of()).stream()
                .anyMatch(HolidayCalendar::isDrivesBorderTraffic);
        return new CalendarFeatures(date, today, tomorrow, yesterday,
                CalendarFeatures.isQuincenaPostWindow(date), borderTraffic);
    }

    private String nameFor(LocalDate date, Map<LocalDate, List<HolidayCalendar>> byDate) {
        List<HolidayCalendar> today = byDate.getOrDefault(date, List.of());
        return today.isEmpty() ? null : today.get(0).getName();
    }

    private static HistoricalDailySnapshot findOn(List<HistoricalDailySnapshot> all, LocalDate date) {
        for (HistoricalDailySnapshot s : all) {
            if (s.getSnapshotDate().equals(date)) return s;
        }
        return null;
    }

    private static List<HistoricalDailySnapshot> upTo(List<HistoricalDailySnapshot> all, LocalDate date) {
        List<HistoricalDailySnapshot> out = new ArrayList<>();
        for (HistoricalDailySnapshot s : all) {
            if (!s.getSnapshotDate().isAfter(date)) out.add(s);
        }
        return out;
    }
}
