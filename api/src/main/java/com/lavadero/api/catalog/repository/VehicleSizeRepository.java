package com.lavadero.api.catalog.repository;

import com.lavadero.api.catalog.domain.VehicleSize;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleSizeRepository extends JpaRepository<VehicleSize, Long> {
    boolean existsByCode(String code);

    List<VehicleSize> findAllByOrderBySortOrderAscNameAsc();

    List<VehicleSize> findByActiveTrueOrderBySortOrderAscNameAsc();
}
