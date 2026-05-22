package com.lavadero.api.operations.repository;

import com.lavadero.api.operations.domain.PrepaidPackage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrepaidPackageRepository extends JpaRepository<PrepaidPackage, Long> {
    @Query("SELECT p FROM PrepaidPackage p WHERE p.businessDay.id = :businessDayId ORDER BY p.occurredAt ASC")
    List<PrepaidPackage> findByBusinessDayId(@Param("businessDayId") Long businessDayId);
}
