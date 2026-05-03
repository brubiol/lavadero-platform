package com.lavadero.api.cash.service;

import com.lavadero.api.cash.domain.CashCount;
import com.lavadero.api.cash.repository.CashCountRepository;
import com.lavadero.api.cash.web.CashCountDtos.CreateCashCountRequest;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.repository.ShiftRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashCountService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final CashCountRepository cashCounts;
    private final ShiftRepository shifts;

    public CashCountService(CashCountRepository cashCounts, ShiftRepository shifts) {
        this.cashCounts = cashCounts;
        this.shifts = shifts;
    }

    @Transactional
    public CashCount create(CreateCashCountRequest request) {
        Shift shift = shifts.findById(request.shiftId())
                .orElseThrow(() -> new EntityNotFoundException("Shift not found"));
        BigDecimal morralla = amount(request.morrallaTotal());
        int bills1000 = count(request.bills1000());
        int bills500 = count(request.bills500());
        int bills200 = count(request.bills200());
        int bills100 = count(request.bills100());
        int bills50 = count(request.bills50());
        int bills20 = count(request.bills20());
        int coins10 = count(request.coins10());
        int coins5 = count(request.coins5());
        int coins2 = count(request.coins2());
        int coins1 = count(request.coins1());
        int coins05 = count(request.coins05());
        BigDecimal total = total(bills1000, bills500, bills200, bills100, bills50, bills20, coins10, coins5, coins2,
                coins1, coins05, morralla);
        return cashCounts.save(new CashCount(shift, request.currency(), bills1000, bills500, bills200, bills100,
                bills50, bills20, coins10, coins5, coins2, coins1, coins05, morralla, total));
    }

    @Transactional(readOnly = true)
    public CashCount get(Long id) {
        return cashCounts.findById(id).orElseThrow(() -> new EntityNotFoundException("Cash count not found"));
    }

    private BigDecimal total(int bills1000, int bills500, int bills200, int bills100, int bills50, int bills20,
            int coins10, int coins5, int coins2, int coins1, int coins05, BigDecimal morralla) {
        return ZERO
                .add(line(bills1000, "1000.00"))
                .add(line(bills500, "500.00"))
                .add(line(bills200, "200.00"))
                .add(line(bills100, "100.00"))
                .add(line(bills50, "50.00"))
                .add(line(bills20, "20.00"))
                .add(line(coins10, "10.00"))
                .add(line(coins5, "5.00"))
                .add(line(coins2, "2.00"))
                .add(line(coins1, "1.00"))
                .add(line(coins05, "0.50"))
                .add(morralla)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal line(int count, String denomination) {
        return BigDecimal.valueOf(count).multiply(new BigDecimal(denomination));
    }

    private int count(Integer value) {
        return value == null ? 0 : value;
    }

    private BigDecimal amount(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }
}
