package com.lavadero.api.inventory.repository;

import com.lavadero.api.inventory.domain.MovementType;
import com.lavadero.api.inventory.domain.ProductMovement;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductMovementRepository extends JpaRepository<ProductMovement, Long> {
    @EntityGraph(attributePaths = {"product"})
    List<ProductMovement> findByMovementDateLessThanEqualOrderByMovementDateAscCreatedAtAsc(Instant asOf);

    @EntityGraph(attributePaths = {"product"})
    List<ProductMovement> findTop5ByProductIdAndMovementDateLessThanEqualOrderByMovementDateDescCreatedAtDesc(
            Long productId, Instant asOf);

    @EntityGraph(attributePaths = {"product"})
    List<ProductMovement> findByMovementDateBetweenOrderByMovementDateAscCreatedAtAsc(Instant from, Instant to);

    @Query("SELECT COALESCE(SUM(m.totalAmount), 0) FROM ProductMovement m " +
           "WHERE m.movementType = :type AND m.movementDate BETWEEN :from AND :to")
    BigDecimal sumTotalAmountByTypeAndDateBetween(
            @Param("type") MovementType type,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query("SELECT COALESCE(SUM(m.totalAmount), 0) FROM ProductMovement m " +
           "WHERE m.shift.id = :shiftId AND m.movementType = 'SALE'")
    BigDecimal sumSalesForShift(@Param("shiftId") Long shiftId);
}
