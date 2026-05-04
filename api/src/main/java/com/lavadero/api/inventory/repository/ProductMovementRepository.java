package com.lavadero.api.inventory.repository;

import com.lavadero.api.inventory.domain.ProductMovement;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductMovementRepository extends JpaRepository<ProductMovement, Long> {
    @EntityGraph(attributePaths = {"product"})
    List<ProductMovement> findByMovementDateLessThanEqualOrderByMovementDateAscCreatedAtAsc(Instant asOf);

    @EntityGraph(attributePaths = {"product"})
    List<ProductMovement> findTop5ByProductIdAndMovementDateLessThanEqualOrderByMovementDateDescCreatedAtDesc(
            Long productId, Instant asOf);

    @EntityGraph(attributePaths = {"product"})
    List<ProductMovement> findByMovementDateBetweenOrderByMovementDateAscCreatedAtAsc(Instant from, Instant to);
}
