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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

            double carsAbsPct = 0.0;
            int carsN = 0;
            double revAbsPct = 0.0;
            int revN = 0;

            for (LocalDate d = probeStart; !d.isAfter(lastDate); d = d.plusDays(1)) {
                LocalDate snapshotDate = d.minusDays(1);
                HistoricalDailySnapshot actual = findOn(all, d);
                if (actual == null) continue;

                List<HistoricalDailySnapshot> training = upTo(all, snapshotDate);
                if (training.size() < 30) continue;

                Prediction carsPred = predictOne(snapshotDate, d, training, true,
                        weatherByDate, holidaysByDate);
                Prediction revPred = predictOne(snapshotDate, d, training, false,
                        weatherByDate, holidaysByDate);

                if (carsPred != null && actual.getTotalCars() != null && actual.getTotalCars() > 0) {
                    carsAbsPct += Math.abs(carsPred.predicted() - actual.getTotalCars())
                            / actual.getTotalCars();
                    carsN++;
                }
                if (revPred != null && actual.getRevenueMxn() != null
                        && actual.getRevenueMxn().doubleValue() > 0.0) {
                    double act = actual.getRevenueMxn().doubleValue();
                    revAbsPct += Math.abs(revPred.predicted() - act) / act;
                    revN++;
                }
            }

            log.info("Python forecast walk-forward probe: cars n={}, cars MAPE={}; revenue n={}, revenue MAPE={}",
                    carsN, carsN == 0 ? "n/a" : String.format("%.4f", carsAbsPct / carsN),
                    revN, revN == 0 ? "n/a" : String.format("%.4f", revAbsPct / revN));
        } finally {
            properties.setPythonBaseUrl(previousBaseUrl);
        }
    }

    private Prediction predictOne(LocalDate snapshotDate, LocalDate target,
            List<HistoricalDailySnapshot> training, boolean cars,
            Map<LocalDate, DailyWeather> weatherByDate,
            Map<LocalDate, List<HolidayCalendar>> holidaysByDate) {
        List<TrainingRow> rows = new ArrayList<>(training.size());
        for (HistoricalDailySnapshot s : training) {
            double v = cars
                    ? (s.getTotalCars() == null ? 0.0 : s.getTotalCars().doubleValue())
                    : (s.getRevenueMxn() == null ? 0.0 : s.getRevenueMxn().doubleValue());
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
        PythonForecastRequest req = new PythonForecastRequest(snapshotDate, 1,
                cars ? "cars" : "revenue", rows, List.of(horizonRow));
        try {
            PythonForecastResponse resp = client.forecast(req);
            return resp.predictions().isEmpty() ? null : resp.predictions().get(0);
        } catch (Exception ex) {
            log.warn("Python forecast probe call failed for {} ({}): {}",
                    target, cars ? "cars" : "revenue", ex.getMessage());
            return null;
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
