package com.lavadero.api.auth.service;

import com.lavadero.api.auth.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessExpiryMs;

    public JwtService(JwtProperties props) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(props.secret()));
        this.accessExpiryMs = props.accessExpirySeconds() * 1_000L;
    }

    public String issueAccessToken(User user) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("tenantId", user.getTenantId())
                .claim("role", user.getRole().name())
                .issuedAt(new Date(now))
                .expiration(new Date(now + accessExpiryMs))
                .signWith(key)
                .compact();
    }

    /**
     * Parses a Bearer token and returns a fully-formed Spring Security Authentication,
     * or empty if the token is absent, malformed, or expired.
     * All claim-structure knowledge (role key, ROLE_ prefix) lives here.
     */
    public Optional<Authentication> authenticate(String token) {
        try {
            Claims claims = parseAccessToken(token);
            String role = claims.get("role", String.class);
            var auth = new UsernamePasswordAuthenticationToken(
                    claims.getSubject(),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
            return Optional.of(auth);
        } catch (JwtException e) {
            return Optional.empty();
        }
    }

    public long accessExpirySeconds() {
        return accessExpiryMs / 1_000L;
    }

    private Claims parseAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
