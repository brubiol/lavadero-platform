package com.lavadero.api.ai.repository;

import com.lavadero.api.ai.domain.AiFeatureType;
import com.lavadero.api.ai.domain.AiInsight;
import com.lavadero.api.ai.domain.AiInsightStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInsightRepository extends JpaRepository<AiInsight, Long> {
    List<AiInsight> findByStatusOrderByGeneratedAtDesc(AiInsightStatus status);

    List<AiInsight> findByFeatureTypeOrderByGeneratedAtDesc(AiFeatureType featureType);

    List<AiInsight> findByFeatureTypeAndStatusOrderByGeneratedAtDesc(
            AiFeatureType featureType, AiInsightStatus status);

    List<AiInsight> findBySourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
            LocalDate from, LocalDate to);

    List<AiInsight> findByFeatureTypeAndSourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
            AiFeatureType featureType, LocalDate from, LocalDate to);

    List<AiInsight> findByStatusAndSourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
            AiInsightStatus status, LocalDate from, LocalDate to);

    List<AiInsight> findByFeatureTypeAndStatusAndSourceFromGreaterThanEqualAndSourceToLessThanEqualOrderByGeneratedAtDesc(
            AiFeatureType featureType, AiInsightStatus status, LocalDate from, LocalDate to);

    Optional<AiInsight> findFirstByFeatureTypeAndSourceFromAndSourceToOrderByGeneratedAtDesc(
            AiFeatureType featureType, LocalDate sourceFrom, LocalDate sourceTo);

    boolean existsByFeatureTypeAndTitleAndSourceFromAndSourceTo(
            AiFeatureType featureType, String title, LocalDate sourceFrom, LocalDate sourceTo);
}
