package com.lavadero.api.security;

import com.lavadero.api.auth.domain.AppUser;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final long accessTokenSeconds;

    public JwtService(JwtEncoder encoder, JwtDecoder decoder,
            @Value("${lavadero.auth.access-token-minutes:30}") long accessTokenMinutes) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.accessTokenSeconds = Duration.ofMinutes(accessTokenMinutes).toSeconds();
    }

    public String createAccessToken(AppUser user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("lavadero-api")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(accessTokenSeconds))
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .claim("fullName", user.getFullName())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long accessTokenSeconds() {
        return accessTokenSeconds;
    }

    public JwtDecoder decoder() {
        return decoder;
    }

    public static SecretKey hmacKey(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalArgumentException("lavadero.auth.jwt-secret must be at least 32 bytes");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}
