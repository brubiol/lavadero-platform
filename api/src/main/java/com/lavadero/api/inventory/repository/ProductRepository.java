package com.lavadero.api.inventory.repository;

import com.lavadero.api.inventory.domain.Product;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveOrderByNameAsc(boolean active);

    List<Product> findAllByOrderByNameAsc();
}
