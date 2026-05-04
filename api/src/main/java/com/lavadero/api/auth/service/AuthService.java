package com.lavadero.api.auth.service;

import com.lavadero.api.auth.domain.AppUser;
import com.lavadero.api.auth.domain.AuthRole;
import com.lavadero.api.auth.domain.RefreshToken;
import com.lavadero.api.auth.repository.AppUserRepository;
import com.lavadero.api.auth.repository.RefreshTokenRepository;
import com.lavadero.api.auth.web.AuthDtos.AuthResponse;
import com.lavadero.api.auth.web.AuthDtos.UserResponse;
import com.lavadero.api.security.JwtService;
import jakarta.persistence.EntityNotFoundException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final AppUserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final long refreshTokenDays;

    public AuthService(AppUserRepository users, RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder, JwtService jwt,
            @Value("${lavadero.auth.refresh-token-days:14}") long refreshTokenDays) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.refreshTokenDays = refreshTokenDays;
    }

    @Transactional
    public AuthResponse login(String username, String password) {
        AppUser user = users.findByUsernameIgnoreCase(username)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid username or password");
        }
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        RefreshToken token = refreshTokens.findByTokenHash(hash(rawRefreshToken))
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(Instant.now()) || !token.getUser().isActive()) {
            throw new BadCredentialsException("Invalid refresh token");
        }
        token.revoke();
        return issueTokens(token.getUser());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokens.findByTokenHash(hash(rawRefreshToken)).ifPresent(RefreshToken::revoke);
    }

    @Transactional(readOnly = true)
    public UserResponse me(String username) {
        return users.findByUsernameIgnoreCase(username)
                .map(UserResponse::from)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    private AuthResponse issueTokens(AppUser user) {
        String refreshToken = UUID.randomUUID() + "." + UUID.randomUUID();
        refreshTokens.save(new RefreshToken(user, hash(refreshToken),
                Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS)));
        return new AuthResponse(jwt.createAccessToken(user), refreshToken, jwt.accessTokenSeconds(), UserResponse.from(user));
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    @Bean
    ApplicationRunner bootstrapOwner(AppUserRepository repository, PasswordEncoder encoder,
            @Value("${lavadero.auth.bootstrap-owner.enabled:true}") boolean enabled,
            @Value("${lavadero.auth.bootstrap-owner.username:dueno}") String username,
            @Value("${lavadero.auth.bootstrap-owner.password:cambia-esto-123}") String password,
            @Value("${lavadero.auth.bootstrap-owner.full-name:Dueno Lavadero}") String fullName) {
        return args -> {
            if (enabled && !repository.existsByUsernameIgnoreCase(username)) {
                repository.save(new AppUser(username, encoder.encode(password), fullName, AuthRole.DUENO));
            }
        };
    }
}
