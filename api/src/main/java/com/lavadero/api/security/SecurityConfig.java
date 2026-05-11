package com.lavadero.api.security;

import com.lavadero.api.auth.repository.AppUserRepository;
import java.util.Collection;
import java.util.List;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @ConditionalOnProperty(name = "lavadero.auth.enabled", havingValue = "true", matchIfMissing = true)
    SecurityFilterChain securityFilterChain(HttpSecurity http, AppUserRepository users)
            throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(EndpointRequest.toAnyEndpoint()).permitAll()
                        .requestMatchers("/api/v1/auth/**", "/api/v1/health", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/v1/ai/**").hasRole("DUENO")
                        .requestMatchers(HttpMethod.GET, "/api/v1/reports/**").hasRole("DUENO")
                        .requestMatchers("/api/v1/payroll/**").hasRole("GERENTE")
                        .requestMatchers("/api/v1/products/**", "/api/v1/inventory/**").hasRole("GERENTE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/withdrawals/**", "/api/v1/employee-advances/**").hasRole("GERENTE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/cash-counts/**").hasRole("OPERADOR")
                        .requestMatchers(HttpMethod.POST, "/api/v1/shifts/*/close").hasRole("GERENTE")
                        .requestMatchers("/api/v1/shifts/*/close-summary").hasRole("OPERADOR")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/tickets/**").hasRole("GERENTE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/tickets/*/void").hasRole("GERENTE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/tickets").hasRole("OPERADOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/tickets/**").hasRole("OPERADOR")
                        .requestMatchers("/api/v1/employees/**", "/api/v1/service-types/**",
                                "/api/v1/vehicle-sizes/**", "/api/v1/service-prices/**").hasRole("GERENTE")
                        .requestMatchers("/api/v1/business-days/**", "/api/v1/shifts/**",
                                "/api/v1/expenses/**").hasRole("OPERADOR")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter(users))))
                .build();
    }

    @Bean
    @ConditionalOnProperty(name = "lavadero.auth.enabled", havingValue = "false")
    SecurityFilterChain disabledSecurityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }

    @Bean
    JwtEncoder jwtEncoder(@Value("${lavadero.auth.jwt-secret}") String secret) {
        SecretKey key = JwtService.hmacKey(secret);
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${lavadero.auth.jwt-secret}") String secret) {
        return NimbusJwtDecoder.withSecretKey(JwtService.hmacKey(secret)).build();
    }

    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter(AppUserRepository users) {
        return jwt -> {
            String username = jwt.getSubject();
            String role = jwt.getClaimAsString("role");
            return users.findByUsernameIgnoreCase(username)
                    .filter(user -> user.isActive() && user.getRole().name().equals(role))
                    .map(user -> new UsernamePasswordAuthenticationToken(username, jwt, authoritiesFor(role)))
                    .orElseGet(() -> new UsernamePasswordAuthenticationToken(username, jwt, List.of()));
        };
    }

    private Collection<GrantedAuthority> authoritiesFor(String role) {
        if ("DUENO".equals(role)) {
            return List.of(new SimpleGrantedAuthority("ROLE_DUENO"),
                    new SimpleGrantedAuthority("ROLE_GERENTE"),
                    new SimpleGrantedAuthority("ROLE_OPERADOR"));
        }
        if ("GERENTE".equals(role)) {
            return List.of(new SimpleGrantedAuthority("ROLE_GERENTE"),
                    new SimpleGrantedAuthority("ROLE_OPERADOR"));
        }
        return List.of(new SimpleGrantedAuthority("ROLE_OPERADOR"));
    }

    @Bean
    RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.fromHierarchy("""
                ROLE_DUENO > ROLE_GERENTE
                ROLE_GERENTE > ROLE_OPERADOR
                """);
    }
}
