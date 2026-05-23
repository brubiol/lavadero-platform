package com.lavadero.api.money.service;

import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.repository.BusinessDayRepository;
import com.lavadero.api.operations.repository.ShiftRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
public class BusinessContextResolver {
    private final BusinessDayRepository businessDays;
    private final ShiftRepository shifts;

    public BusinessContextResolver(BusinessDayRepository businessDays, ShiftRepository shifts) {
        this.businessDays = businessDays;
        this.shifts = shifts;
    }

    public Context resolve(Long businessDayId, Long shiftId, LocalDate fallbackDate) {
        Shift shift = null;
        BusinessDay businessDay = null;
        if (shiftId != null) {
            shift = shifts.findById(shiftId).orElseThrow(() -> new EntityNotFoundException("Shift not found"));
            businessDay = shift.getBusinessDay();
        }
        if (businessDayId != null) {
            BusinessDay requestedDay = businessDays.findById(businessDayId)
                    .orElseThrow(() -> new EntityNotFoundException("Business day not found"));
            if (businessDay != null && !businessDay.getId().equals(requestedDay.getId())) {
                throw new IllegalArgumentException("Shift does not belong to business day");
            }
            businessDay = requestedDay;
        }
        LocalDate recordDate = businessDay == null ? fallbackDate : businessDay.getBusinessDate();
        return new Context(businessDay, shift, recordDate);
    }

    public record Context(BusinessDay businessDay, Shift shift, LocalDate recordDate) {
    }
}
