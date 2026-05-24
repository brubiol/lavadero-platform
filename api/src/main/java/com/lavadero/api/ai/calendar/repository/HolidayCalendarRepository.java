package com.lavadero.api.ai.calendar.repository;

import com.lavadero.api.ai.calendar.domain.HolidayCalendar;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HolidayCalendarRepository extends JpaRepository<HolidayCalendar, Long> {

    List<HolidayCalendar> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate from, LocalDate to);
}
