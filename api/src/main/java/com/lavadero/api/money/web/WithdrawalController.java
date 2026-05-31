package com.lavadero.api.money.web;

import com.lavadero.api.money.service.WithdrawalService;
import com.lavadero.api.money.web.WithdrawalDtos.CreateWithdrawalRequest;
import com.lavadero.api.money.web.WithdrawalDtos.UpdateWithdrawalRequest;
import com.lavadero.api.money.web.WithdrawalDtos.WithdrawalResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/withdrawals")
public class WithdrawalController {
    private final WithdrawalService service;

    public WithdrawalController(WithdrawalService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WithdrawalResponse create(@Valid @RequestBody CreateWithdrawalRequest request) {
        return WithdrawalResponse.from(service.create(request));
    }

    @GetMapping
    public List<WithdrawalResponse> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.list(from, to).stream().map(WithdrawalResponse::from).toList();
    }

    @PatchMapping("/{id}")
    public WithdrawalResponse update(@PathVariable Long id, @Valid @RequestBody UpdateWithdrawalRequest request) {
        return WithdrawalResponse.from(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
