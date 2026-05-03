package com.lavadero.api.catalog.repository;

import com.lavadero.api.catalog.domain.ServicePrice;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ServicePriceRepository extends JpaRepository<ServicePrice, Long> {
    @Query("""
            select sp from ServicePrice sp
            join fetch sp.serviceType
            join fetch sp.vehicleSize
            order by sp.serviceType.name asc, sp.vehicleSize.sortOrder asc
            """)
    List<ServicePrice> findAllWithCatalog();

    @Query("""
            select sp from ServicePrice sp
            join fetch sp.serviceType
            join fetch sp.vehicleSize
            where sp.effectiveFrom <= :effectiveOn
              and (sp.effectiveTo is null or sp.effectiveTo >= :effectiveOn)
            order by sp.serviceType.name asc, sp.vehicleSize.sortOrder asc
            """)
    List<ServicePrice> findEffectiveOn(@Param("effectiveOn") LocalDate effectiveOn);

    @Query("""
            select count(sp) > 0 from ServicePrice sp
            where sp.serviceType.id = :serviceTypeId
              and sp.vehicleSize.id = :vehicleSizeId
              and sp.currency = :currency
              and sp.effectiveFrom <= :effectiveTo
              and (sp.effectiveTo is null or sp.effectiveTo >= :effectiveFrom)
            """)
    boolean existsOverlapping(@Param("serviceTypeId") Long serviceTypeId,
            @Param("vehicleSizeId") Long vehicleSizeId,
            @Param("currency") String currency,
            @Param("effectiveFrom") LocalDate effectiveFrom,
            @Param("effectiveTo") LocalDate effectiveTo);

    @Query("""
            select sp from ServicePrice sp
            join fetch sp.serviceType
            join fetch sp.vehicleSize
            where sp.serviceType.id = :serviceTypeId
              and sp.vehicleSize.id = :vehicleSizeId
              and sp.currency = :currency
              and sp.effectiveFrom <= :effectiveOn
              and (sp.effectiveTo is null or sp.effectiveTo >= :effectiveOn)
            order by sp.effectiveFrom desc
            """)
    List<ServicePrice> findCurrentPrices(@Param("serviceTypeId") Long serviceTypeId,
            @Param("vehicleSizeId") Long vehicleSizeId,
            @Param("currency") String currency,
            @Param("effectiveOn") LocalDate effectiveOn,
            Pageable pageable);
}
