package com.lavadero.api.operations.web;

import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.ShiftStatus;
import com.lavadero.api.operations.domain.ShiftType;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public final class ShiftDtos {
    private ShiftDtos() {
    }

    public record OpenShiftRequest(@NotNull Long businessDayId, @NotNull ShiftType shiftType) {
    }

    public record UpdateShiftRequest(ShiftStatus status) {
    }

    public record ShiftResponse(Long id, Long businessDayId, ShiftType shiftType, ShiftStatus status, Instant openedAt,
            Instant closedAt, Instant createdAt, Instant updatedAt) {
        public static ShiftResponse from(Shift shift) {
            return new ShiftResponse(shift.getId(), shift.getBusinessDay().getId(), shift.getShiftType(),
                    shift.getStatus(), shift.getOpenedAt(), shift.getClosedAt(), shift.getCreatedAt(),
                    shift.getUpdatedAt());
        }
    }
}
