package com.lavadero.api.reports.domain;

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
@Table(name = "historical_daily_snapshots")
public class HistoricalDailySnapshot extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "total_cars")
    private Integer totalCars;

    @Column(name = "revenue_mxn", precision = 12, scale = 2)
    private BigDecimal revenueMxn;

    @Column(name = "expenses_mxn", precision = 12, scale = 2)
    private BigDecimal expensesMxn;

    @Column(name = "resultado_mxn", precision = 12, scale = 2)
    private BigDecimal resultadoMxn;

    @Column(name = "source", nullable = false, length = 20)
    private String source;

    protected HistoricalDailySnapshot() {
    }

    public Long getId() {
        return id;
    }

    public LocalDate getSnapshotDate() {
        return snapshotDate;
    }

    public Integer getTotalCars() {
        return totalCars;
    }

    public BigDecimal getRevenueMxn() {
        return revenueMxn;
    }

    public BigDecimal getExpensesMxn() {
        return expensesMxn;
    }

    public BigDecimal getResultadoMxn() {
        return resultadoMxn;
    }

    public String getSource() {
        return source;
    }
}
