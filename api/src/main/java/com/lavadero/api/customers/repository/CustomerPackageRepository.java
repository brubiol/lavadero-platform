package com.lavadero.api.customers.repository;

import com.lavadero.api.customers.domain.CustomerPackage;
import com.lavadero.api.customers.domain.PackageStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerPackageRepository extends JpaRepository<CustomerPackage, Long> {
    @EntityGraph(attributePaths = {"serviceType", "vehicleSize", "customer"})
    List<CustomerPackage> findByCustomerIdOrderByPurchasedAtDesc(Long customerId);

    @EntityGraph(attributePaths = {"serviceType", "vehicleSize", "customer"})
    List<CustomerPackage> findByCustomerIdAndStatusOrderByPurchasedAtAsc(Long customerId, PackageStatus status);

    @EntityGraph(attributePaths = {"serviceType", "vehicleSize", "customer"})
    Optional<CustomerPackage> findWithDetailsById(Long id);
}
