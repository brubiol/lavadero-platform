package com.lavadero.api.operations.web;

import com.lavadero.api.operations.service.BusinessDayService;
import com.lavadero.api.operations.web.BusinessDayDtos.BusinessDayResponse;
import com.lavadero.api.operations.web.BusinessDayDtos.OpenBusinessDayRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/business-days")
public class BusinessDayController {
    private final BusinessDayService businessDays;

    public BusinessDayController(BusinessDayService businessDays) {
        this.businessDays = businessDays;
    }

    @PostMapping("/open")
    @ResponseStatus(HttpStatus.CREATED)
    public BusinessDayResponse open(@Valid @RequestBody OpenBusinessDayRequest request) {
        return BusinessDayResponse.from(businessDays.open(request));
    }

    @GetMapping
    public List<BusinessDayResponse> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return businessDays.list(from, to).stream().map(BusinessDayResponse::from).toList();
    }

    @GetMapping("/{id}")
    public BusinessDayResponse get(@PathVariable Long id) {
        return BusinessDayResponse.from(businessDays.get(id));
    }
}
