package com.lavadero.api.cash.web;

import com.lavadero.api.cash.service.CashCountService;
import com.lavadero.api.cash.web.CashCountDtos.CashCountResponse;
import com.lavadero.api.cash.web.CashCountDtos.CreateCashCountRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cash-counts")
public class CashCountController {
    private final CashCountService cashCounts;

    public CashCountController(CashCountService cashCounts) {
        this.cashCounts = cashCounts;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CashCountResponse create(@Valid @RequestBody CreateCashCountRequest request) {
        return CashCountResponse.from(cashCounts.create(request));
    }

    @GetMapping("/{id}")
    public CashCountResponse get(@PathVariable Long id) {
        return CashCountResponse.from(cashCounts.get(id));
    }
}
