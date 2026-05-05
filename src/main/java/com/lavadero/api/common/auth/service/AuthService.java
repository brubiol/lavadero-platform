package com.lavadero.api.common.auth.service;

import com.lavadero.api.common.auth.domain.RefreshToken;
import com.lavadero.api.common.auth.domain.User;
import com.lavadero.api.common.auth.repository.RefreshTokenRepository;
import com.lavadero.api.common.auth.repository.UserRepository;
import com.lavadero.api.common.auth.web.AuthResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final JwtService jwt;
    private final JwtProperties props;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       JwtService jwt, JwtProperties props, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.jwt = jwt;
        this.props = props;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthResponse login(String username, String password) {
        User user = users.findByUsernameAndActiveTrue(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        return buildResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String hash = sha256(rawRefreshToken);
        RefreshToken stored = refreshTokens.findByTokenHashAndRevokedAtIsNull(hash)
                .orElseThrow(() -> new BadCredentialsException("Invalid or expired refresh token"));

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            stored.setRevokedAt(Instant.now());
            throw new BadCredentialsException("Refresh token expired");
        }

        // rotate: revoke old, issue new
        stored.setRevokedAt(Instant.now());
        return buildResponse(stored.getUser());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        String hash = sha256(rawRefreshToken);
        refreshTokens.findByTokenHashAndRevokedAtIsNull(hash)
                .ifPresent(t -> refreshTokens.revokeAllForUser(t.getUser(), Instant.now()));
    }

    private AuthResponse buildResponse(User user) {
        String accessToken = jwt.issueAccessToken(user);
        String rawRefresh = UUID.randomUUID().toString();

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(sha256(rawRefresh));
        rt.setExpiresAt(Instant.now().plus(props.refreshExpiryDays(), ChronoUnit.DAYS));
        refreshTokens.save(rt);

        return new AuthResponse(
                accessToken,
                rawRefresh,
                jwt.accessExpirySeconds(),
                new AuthResponse.UserInfo(user.getId(), user.getUsername(), user.getFullName(), user.getRole().name())
        );
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
