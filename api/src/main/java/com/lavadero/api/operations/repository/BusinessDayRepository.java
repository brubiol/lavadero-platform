package com.lavadero.api.operations.repository;

import com.lavadero.api.operations.domain.BusinessDay;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessDayRepository extends JpaRepository<BusinessDay, Long> {
    boolean existsByBusinessDate(LocalDate businessDate);

    Optional<BusinessDay> findByBusinessDate(LocalDate businessDate);

    List<BusinessDay> findByBusinessDateBetweenOrderByBusinessDateAsc(LocalDate from, LocalDate to);
}
