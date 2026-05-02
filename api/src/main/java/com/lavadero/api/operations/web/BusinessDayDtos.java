package com.lavadero.api.operations.web;

import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.domain.BusinessDayStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;

public final class BusinessDayDtos {
    private BusinessDayDtos() {
    }

    public record OpenBusinessDayRequest(@NotNull LocalDate businessDate) {
    }

    public record UpdateBusinessDayRequest(BusinessDayStatus status) {
    }

    public record BusinessDayResponse(Long id, LocalDate businessDate, BusinessDayStatus status, Instant openedAt,
            Instant closedAt, Instant lockedAt, Instant createdAt, Instant updatedAt) {
        public static BusinessDayResponse from(BusinessDay businessDay) {
            return new BusinessDayResponse(businessDay.getId(), businessDay.getBusinessDate(), businessDay.getStatus(),
                    businessDay.getOpenedAt(), businessDay.getClosedAt(), businessDay.getLockedAt(),
                    businessDay.getCreatedAt(), businessDay.getUpdatedAt());
        }
    }
}
