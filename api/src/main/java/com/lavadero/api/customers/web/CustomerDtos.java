package com.lavadero.api.customers.web;

import com.lavadero.api.customers.domain.Customer;
import com.lavadero.api.customers.domain.LoyaltyStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class CustomerDtos {
    private CustomerDtos() {
    }

    public record CreateCustomerRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 20) String phone,
            @Size(max = 500) String notes) {
    }

    public record UpdateCustomerRequest(
            @Size(max = 120) String name,
            @Size(max = 20) String phone,
            @Size(max = 500) String notes,
            LoyaltyStatus loyaltyStatus) {
    }

    public record AttachCustomerRequest(@NotNull Long customerId) {
    }

    public record CustomerResponse(
            Long id,
            String name,
            String phone,
            String notes,
            LoyaltyStatus loyaltyStatus,
            boolean active,
            Instant createdAt,
            Instant updatedAt,
            int loyaltyProgress,
            int loyaltyRewardsEarned) {
        /** Lightweight factory — loyalty fields default to 0. Use {@link #from(Customer, long)} on the list/profile path. */
        public static CustomerResponse from(Customer c) {
            return new CustomerResponse(c.getId(), c.getName(), c.getPhone(), c.getNotes(),
                    c.getLoyaltyStatus(), c.isActive(), c.getCreatedAt(), c.getUpdatedAt(), 0, 0);
        }

        /** Computes punch-card progress ({@code visits % 10}) and rewards ({@code visits / 10}). */
        public static CustomerResponse from(Customer c, long totalVisits) {
            int progress = (int) (totalVisits % 10);
            int rewards = (int) (totalVisits / 10);
            return new CustomerResponse(c.getId(), c.getName(), c.getPhone(), c.getNotes(),
                    c.getLoyaltyStatus(), c.isActive(), c.getCreatedAt(), c.getUpdatedAt(), progress, rewards);
        }
    }

    public record CustomerProfileResponse(
            Long id,
            String name,
            String phone,
            LoyaltyStatus loyaltyStatus,
            long totalVisits,
            BigDecimal totalSpentMxn,
            LocalDate lastVisitDate,
            int loyaltyProgress,
            int loyaltyRewardsEarned) {
    }
}
