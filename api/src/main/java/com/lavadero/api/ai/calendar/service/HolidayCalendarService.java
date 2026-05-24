package com.lavadero.api.ai.calendar.service;

import com.lavadero.api.ai.calendar.domain.HolidayCalendar;
import com.lavadero.api.ai.calendar.repository.HolidayCalendarRepository;
import com.lavadero.api.ai.forecast.domain.CalendarFeatures;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads holidays from {@code holiday_calendar} and produces {@link CalendarFeatures}
 * rows for the forecaster. Pads the query window by ±1 day so dayBefore/dayAfter
 * flags work at the edges.
 */
@Service
public class HolidayCalendarService {

    private final HolidayCalendarRepository repository;

    public HolidayCalendarService(HolidayCalendarRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CalendarFeatures> featuresForRange(LocalDate from, LocalDate to) {
        Map<LocalDate, List<HolidayCalendar>> byDate = loadByDate(from.minusDays(1), to.plusDays(1));
        List<CalendarFeatures> out = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            out.add(featuresFor(d, byDate));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<CalendarFeatures> featuresForDates(java.util.Set<LocalDate> dates) {
        if (dates.isEmpty()) return List.of();
        LocalDate min = dates.stream().min(LocalDate::compareTo).get();
        LocalDate max = dates.stream().max(LocalDate::compareTo).get();
        Map<LocalDate, List<HolidayCalendar>> byDate = loadByDate(min.minusDays(1), max.plusDays(1));
        List<CalendarFeatures> out = new ArrayList<>(dates.size());
        dates.stream().sorted().forEach(d -> out.add(featuresFor(d, byDate)));
        return out;
    }

    private CalendarFeatures featuresFor(LocalDate date, Map<LocalDate, List<HolidayCalendar>> byDate) {
        List<HolidayCalendar> today = byDate.getOrDefault(date, List.of());
        List<HolidayCalendar> yesterday = byDate.getOrDefault(date.minusDays(1), List.of());
        List<HolidayCalendar> tomorrow = byDate.getOrDefault(date.plusDays(1), List.of());
        boolean isHoliday = !today.isEmpty();
        boolean dayBefore = !tomorrow.isEmpty();
        boolean dayAfter = !yesterday.isEmpty();
        boolean isBorderTraffic = today.stream().anyMatch(HolidayCalendar::isDrivesBorderTraffic);
        boolean isQuincenaPost = CalendarFeatures.isQuincenaPostWindow(date);
        return new CalendarFeatures(date, isHoliday, dayBefore, dayAfter, isQuincenaPost, isBorderTraffic);
    }

    private Map<LocalDate, List<HolidayCalendar>> loadByDate(LocalDate from, LocalDate to) {
        Map<LocalDate, List<HolidayCalendar>> map = new HashMap<>();
        for (HolidayCalendar h : repository.findByHolidayDateBetweenOrderByHolidayDateAsc(from, to)) {
            map.computeIfAbsent(h.getHolidayDate(), k -> new ArrayList<>()).add(h);
        }
        return map;
    }
}
