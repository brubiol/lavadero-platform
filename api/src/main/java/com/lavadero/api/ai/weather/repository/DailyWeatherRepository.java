package com.lavadero.api.ai.weather.repository;

import com.lavadero.api.ai.weather.domain.DailyWeather;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyWeatherRepository extends JpaRepository<DailyWeather, Long> {

    Optional<DailyWeather> findBySnapshotDate(LocalDate snapshotDate);

    List<DailyWeather> findBySnapshotDateBetweenOrderBySnapshotDateAsc(LocalDate from, LocalDate to);

    long countBySnapshotDateBetween(LocalDate from, LocalDate to);
}
