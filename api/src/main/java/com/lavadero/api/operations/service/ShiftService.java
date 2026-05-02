package com.lavadero.api.operations.service;

import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.domain.BusinessDayStatus;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.repository.ShiftRepository;
import com.lavadero.api.operations.web.ShiftDtos.OpenShiftRequest;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShiftService {
    private final ShiftRepository shifts;
    private final BusinessDayService businessDays;

    public ShiftService(ShiftRepository shifts, BusinessDayService businessDays) {
        this.shifts = shifts;
        this.businessDays = businessDays;
    }

    @Transactional
    public Shift open(OpenShiftRequest request) {
        BusinessDay businessDay = businessDays.get(request.businessDayId());
        if (businessDay.getStatus() != BusinessDayStatus.OPEN) {
            throw new IllegalArgumentException("Business day must be OPEN to open a shift");
        }
        if (shifts.existsByBusinessDayIdAndShiftType(request.businessDayId(), request.shiftType())) {
            throw new IllegalArgumentException("Shift already exists for business day and type");
        }
        return shifts.save(new Shift(businessDay, request.shiftType()));
    }

    @Transactional(readOnly = true)
    public List<Shift> list(Long businessDayId) {
        if (businessDayId == null) {
            throw new IllegalArgumentException("business_day_id is required");
        }
        businessDays.get(businessDayId);
        return shifts.findByBusinessDayIdOrderByShiftTypeAsc(businessDayId);
    }
}
