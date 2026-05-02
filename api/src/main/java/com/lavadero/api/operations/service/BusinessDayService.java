package com.lavadero.api.operations.service;

import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.repository.BusinessDayRepository;
import com.lavadero.api.operations.web.BusinessDayDtos.OpenBusinessDayRequest;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessDayService {
    private final BusinessDayRepository businessDays;

    public BusinessDayService(BusinessDayRepository businessDays) {
        this.businessDays = businessDays;
    }

    @Transactional
    public BusinessDay open(OpenBusinessDayRequest request) {
        if (businessDays.existsByBusinessDate(request.businessDate())) {
            throw new IllegalArgumentException("Business day already exists for date");
        }
        return businessDays.save(new BusinessDay(request.businessDate()));
    }

    @Transactional(readOnly = true)
    public List<BusinessDay> list(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to must be on or after from");
        }
        return businessDays.findByBusinessDateBetweenOrderByBusinessDateAsc(from, to);
    }

    @Transactional(readOnly = true)
    public BusinessDay get(Long id) {
        return businessDays.findById(id).orElseThrow(() -> new EntityNotFoundException("Business day not found"));
    }
}
