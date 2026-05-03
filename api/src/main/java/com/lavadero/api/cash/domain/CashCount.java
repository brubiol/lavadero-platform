package com.lavadero.api.cash.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.TicketCurrency;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "cash_counts")
public class CashCount extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private TicketCurrency currency;

    @Column(name = "bills_1000", nullable = false)
    private int bills1000;

    @Column(name = "bills_500", nullable = false)
    private int bills500;

    @Column(name = "bills_200", nullable = false)
    private int bills200;

    @Column(name = "bills_100", nullable = false)
    private int bills100;

    @Column(name = "bills_50", nullable = false)
    private int bills50;

    @Column(name = "bills_20", nullable = false)
    private int bills20;

    @Column(name = "coins_10", nullable = false)
    private int coins10;

    @Column(name = "coins_5", nullable = false)
    private int coins5;

    @Column(name = "coins_2", nullable = false)
    private int coins2;

    @Column(name = "coins_1", nullable = false)
    private int coins1;

    @Column(name = "coins_0_5", nullable = false)
    private int coins05;

    @Column(name = "morralla_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal morrallaTotal;

    @Column(name = "total_counted", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCounted;

    protected CashCount() {
    }

    public CashCount(Shift shift, TicketCurrency currency, int bills1000, int bills500, int bills200, int bills100,
            int bills50, int bills20, int coins10, int coins5, int coins2, int coins1, int coins05,
            BigDecimal morrallaTotal, BigDecimal totalCounted) {
        this.shift = shift;
        this.currency = currency;
        this.bills1000 = bills1000;
        this.bills500 = bills500;
        this.bills200 = bills200;
        this.bills100 = bills100;
        this.bills50 = bills50;
        this.bills20 = bills20;
        this.coins10 = coins10;
        this.coins5 = coins5;
        this.coins2 = coins2;
        this.coins1 = coins1;
        this.coins05 = coins05;
        this.morrallaTotal = morrallaTotal;
        this.totalCounted = totalCounted;
    }

    public Long getId() {
        return id;
    }

    public Shift getShift() {
        return shift;
    }

    public TicketCurrency getCurrency() {
        return currency;
    }

    public int getBills1000() {
        return bills1000;
    }

    public int getBills500() {
        return bills500;
    }

    public int getBills200() {
        return bills200;
    }

    public int getBills100() {
        return bills100;
    }

    public int getBills50() {
        return bills50;
    }

    public int getBills20() {
        return bills20;
    }

    public int getCoins10() {
        return coins10;
    }

    public int getCoins5() {
        return coins5;
    }

    public int getCoins2() {
        return coins2;
    }

    public int getCoins1() {
        return coins1;
    }

    public int getCoins05() {
        return coins05;
    }

    public BigDecimal getMorrallaTotal() {
        return morrallaTotal;
    }

    public BigDecimal getTotalCounted() {
        return totalCounted;
    }
}
