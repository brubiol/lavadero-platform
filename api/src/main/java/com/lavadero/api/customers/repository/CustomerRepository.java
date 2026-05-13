package com.lavadero.api.customers.repository;

import com.lavadero.api.customers.domain.Customer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByIdAndActiveTrue(Long id);

    @Query("""
            SELECT c FROM Customer c
            WHERE c.active = true
              AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR c.phone LIKE CONCAT('%', :q, '%'))
            ORDER BY c.name ASC
            """)
    List<Customer> searchActive(@Param("q") String q);

    List<Customer> findByActiveTrueOrderByNameAsc();
}
