package com.lavadero.api.reports.repository;

import com.lavadero.api.reports.domain.HistoricalDailySnapshot;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoricalDailySnapshotRepository extends JpaRepository<HistoricalDailySnapshot, Long> {

    List<HistoricalDailySnapshot> findBySnapshotDateBetweenOrderBySnapshotDateAsc(LocalDate from, LocalDate to);
}
