package com.lavadero.api.auth.web;

import com.lavadero.api.auth.domain.AppUser;
import com.lavadero.api.auth.domain.AuthRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record LogoutRequest(@NotBlank String refreshToken) {
    }

    public record AuthResponse(String accessToken, String refreshToken, long expiresInSeconds, UserResponse user) {
    }

    public record UserResponse(Long id, String username, String fullName, AuthRole role) {
        public static UserResponse from(AppUser user) {
            return new UserResponse(user.getId(), user.getUsername(), user.getFullName(), user.getRole());
        }
    }

    public record CreateUserRequest(
            @NotBlank @Size(min = 3, max = 80) String username,
            @NotBlank @Size(min = 8, max = 200) String password,
            @NotBlank @Size(max = 120) String fullName,
            @NotNull AuthRole role) {
    }
}
