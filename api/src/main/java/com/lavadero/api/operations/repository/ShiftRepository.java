package com.lavadero.api.operations.repository;

import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.ShiftType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    boolean existsByBusinessDayIdAndShiftType(Long businessDayId, ShiftType shiftType);

    List<Shift> findByBusinessDayIdOrderByShiftTypeAsc(Long businessDayId);
}
