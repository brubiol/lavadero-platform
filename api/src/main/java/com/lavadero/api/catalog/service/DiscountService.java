package com.lavadero.api.catalog.service;

import com.lavadero.api.catalog.domain.Discount;
import com.lavadero.api.catalog.repository.DiscountRepository;
import com.lavadero.api.catalog.web.DiscountDtos.CreateDiscountRequest;
import com.lavadero.api.catalog.web.DiscountDtos.UpdateDiscountRequest;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiscountService {
    private final DiscountRepository discounts;

    public DiscountService(DiscountRepository discounts) {
        this.discounts = discounts;
    }

    @Transactional(readOnly = true)
    public List<Discount> list() {
        return discounts.findAllByOrderByActiveDescNameAsc();
    }

    @Transactional
    public Discount create(CreateDiscountRequest request) {
        if (discounts.existsByCode(request.code())) {
            throw new IllegalArgumentException("Discount code already exists");
        }
        return discounts.save(new Discount(request.code(), request.name(), request.percent(),
                request.daysLabel(), Boolean.TRUE.equals(request.applyAtShiftStart()), request.color()));
    }

    @Transactional
    public Discount update(Long id, UpdateDiscountRequest request) {
        Discount discount = discounts.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Discount not found"));
        if (request.name() != null) {
            discount.setName(request.name());
        }
        if (request.percent() != null) {
            discount.setPercent(request.percent());
        }
        if (request.daysLabel() != null) {
            discount.setDaysLabel(request.daysLabel());
        }
        if (request.applyAtShiftStart() != null) {
            discount.setApplyAtShiftStart(request.applyAtShiftStart());
        }
        if (request.active() != null) {
            discount.setActive(request.active());
        }
        if (request.color() != null) {
            discount.setColor(request.color());
        }
        return discounts.save(discount);
    }
}
