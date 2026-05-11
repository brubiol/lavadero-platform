package com.lavadero.api.catalog.repository;

import com.lavadero.api.catalog.domain.ServiceType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceTypeRepository extends JpaRepository<ServiceType, Long> {
    boolean existsByCode(String code);

    List<ServiceType> findAllByOrderByNameAsc();

    List<ServiceType> findByActiveTrueOrderByNameAsc();
}
