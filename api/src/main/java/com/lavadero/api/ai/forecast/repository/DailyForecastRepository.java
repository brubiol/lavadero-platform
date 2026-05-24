package com.lavadero.api.ai.forecast.repository;

import com.lavadero.api.ai.forecast.domain.DailyForecast;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyForecastRepository extends JpaRepository<DailyForecast, Long> {

    List<DailyForecast> findBySnapshotDateOrderByHorizonDateAsc(LocalDate snapshotDate);

    Optional<DailyForecast> findTopByOrderBySnapshotDateDesc();

    long deleteBySnapshotDate(LocalDate snapshotDate);

    List<DailyForecast> findBySnapshotDateBetweenOrderBySnapshotDateAscHorizonDateAsc(LocalDate from, LocalDate to);
}
