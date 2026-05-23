package com.lavadero.api.auth.web;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresInSeconds,
        UserInfo user
) {
    public record UserInfo(
            long id,
            String username,
            String fullName,
            String role
    ) {}
}
