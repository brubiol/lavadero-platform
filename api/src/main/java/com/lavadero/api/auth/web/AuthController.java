package com.lavadero.api.auth.web;

import com.lavadero.api.auth.service.AuthService;
import com.lavadero.api.auth.web.AuthDtos.AuthResponse;
import com.lavadero.api.auth.web.AuthDtos.LoginRequest;
import com.lavadero.api.auth.web.AuthDtos.LogoutRequest;
import com.lavadero.api.auth.web.AuthDtos.RefreshRequest;
import com.lavadero.api.auth.web.AuthDtos.UserResponse;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.username(), request.password());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request) {
        auth.logout(request.refreshToken());
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return auth.me(principal.getName());
    }
}
