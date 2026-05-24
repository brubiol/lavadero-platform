package com.lavadero.api.ai.weather.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "daily_weather")
public class DailyWeather extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "precipitation_mm", nullable = false, precision = 6, scale = 2)
    private BigDecimal precipitationMm;

    @Column(name = "temp_max_c", nullable = false, precision = 4, scale = 1)
    private BigDecimal tempMaxC;

    @Column(name = "temp_min_c", nullable = false, precision = 4, scale = 1)
    private BigDecimal tempMinC;

    @Column(name = "wind_max_kph", precision = 5, scale = 1)
    private BigDecimal windMaxKph;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WeatherSource source;

    @Column(nullable = false)
    private boolean observed;

    protected DailyWeather() {
    }

    public DailyWeather(LocalDate snapshotDate, BigDecimal precipitationMm, BigDecimal tempMaxC,
            BigDecimal tempMinC, BigDecimal windMaxKph, WeatherSource source, boolean observed) {
        this.snapshotDate = snapshotDate;
        this.precipitationMm = precipitationMm;
        this.tempMaxC = tempMaxC;
        this.tempMinC = tempMinC;
        this.windMaxKph = windMaxKph;
        this.source = source;
        this.observed = observed;
    }

    public void replaceWith(BigDecimal precipitationMm, BigDecimal tempMaxC, BigDecimal tempMinC,
            BigDecimal windMaxKph, WeatherSource source, boolean observed) {
        this.precipitationMm = precipitationMm;
        this.tempMaxC = tempMaxC;
        this.tempMinC = tempMinC;
        this.windMaxKph = windMaxKph;
        this.source = source;
        this.observed = observed;
    }

    public Long getId() { return id; }
    public LocalDate getSnapshotDate() { return snapshotDate; }
    public BigDecimal getPrecipitationMm() { return precipitationMm; }
    public BigDecimal getTempMaxC() { return tempMaxC; }
    public BigDecimal getTempMinC() { return tempMinC; }
    public BigDecimal getWindMaxKph() { return windMaxKph; }
    public WeatherSource getSource() { return source; }
    public boolean isObserved() { return observed; }
}
