package com.lavadero.api.ai.forecast.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "daily_forecast")
public class DailyForecast extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "horizon_date", nullable = false)
    private LocalDate horizonDate;

    @Column(name = "predicted_cars", nullable = false)
    private Integer predictedCars;

    @Column(name = "predicted_cars_low", nullable = false)
    private Integer predictedCarsLow;

    @Column(name = "predicted_cars_high", nullable = false)
    private Integer predictedCarsHigh;

    @Column(name = "predicted_revenue_mxn", nullable = false, precision = 12, scale = 2)
    private BigDecimal predictedRevenueMxn;

    @Column(name = "predicted_revenue_mxn_low", nullable = false, precision = 12, scale = 2)
    private BigDecimal predictedRevenueMxnLow;

    @Column(name = "predicted_revenue_mxn_high", nullable = false, precision = 12, scale = 2)
    private BigDecimal predictedRevenueMxnHigh;

    @Column(name = "model_version", nullable = false, length = 80)
    private String modelVersion;

    @Column(name = "expected_precipitation_mm", precision = 6, scale = 2)
    private BigDecimal expectedPrecipitationMm;

    @Column(name = "expected_temp_max_c", precision = 4, scale = 1)
    private BigDecimal expectedTempMaxC;

    protected DailyForecast() {
    }

    public DailyForecast(LocalDate snapshotDate, LocalDate horizonDate,
            int predictedCars, int predictedCarsLow, int predictedCarsHigh,
            BigDecimal predictedRevenueMxn, BigDecimal predictedRevenueMxnLow, BigDecimal predictedRevenueMxnHigh,
            String modelVersion,
            BigDecimal expectedPrecipitationMm, BigDecimal expectedTempMaxC) {
        this.snapshotDate = snapshotDate;
        this.horizonDate = horizonDate;
        this.predictedCars = predictedCars;
        this.predictedCarsLow = predictedCarsLow;
        this.predictedCarsHigh = predictedCarsHigh;
        this.predictedRevenueMxn = predictedRevenueMxn;
        this.predictedRevenueMxnLow = predictedRevenueMxnLow;
        this.predictedRevenueMxnHigh = predictedRevenueMxnHigh;
        this.modelVersion = modelVersion;
        this.expectedPrecipitationMm = expectedPrecipitationMm;
        this.expectedTempMaxC = expectedTempMaxC;
    }

    public Long getId() { return id; }
    public LocalDate getSnapshotDate() { return snapshotDate; }
    public LocalDate getHorizonDate() { return horizonDate; }
    public Integer getPredictedCars() { return predictedCars; }
    public Integer getPredictedCarsLow() { return predictedCarsLow; }
    public Integer getPredictedCarsHigh() { return predictedCarsHigh; }
    public BigDecimal getPredictedRevenueMxn() { return predictedRevenueMxn; }
    public BigDecimal getPredictedRevenueMxnLow() { return predictedRevenueMxnLow; }
    public BigDecimal getPredictedRevenueMxnHigh() { return predictedRevenueMxnHigh; }
    public String getModelVersion() { return modelVersion; }
    public BigDecimal getExpectedPrecipitationMm() { return expectedPrecipitationMm; }
    public BigDecimal getExpectedTempMaxC() { return expectedTempMaxC; }
}
