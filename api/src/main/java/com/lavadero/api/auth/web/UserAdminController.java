package com.lavadero.api.auth.web;

import com.lavadero.api.auth.service.AuthService;
import com.lavadero.api.auth.web.AuthDtos.CreateUserRequest;
import com.lavadero.api.auth.web.AuthDtos.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
public class UserAdminController {
    private final AuthService auth;

    public UserAdminController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return auth.createUser(request.username(), request.password(), request.fullName(), request.role());
    }
}
