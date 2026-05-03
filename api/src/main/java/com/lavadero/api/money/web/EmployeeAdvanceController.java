package com.lavadero.api.money.web;

import com.lavadero.api.money.service.EmployeeAdvanceService;
import com.lavadero.api.money.web.EmployeeAdvanceDtos.CreateEmployeeAdvanceRequest;
import com.lavadero.api.money.web.EmployeeAdvanceDtos.EmployeeAdvanceResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/employee-advances")
public class EmployeeAdvanceController {
    private final EmployeeAdvanceService service;

    public EmployeeAdvanceController(EmployeeAdvanceService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmployeeAdvanceResponse create(@Valid @RequestBody CreateEmployeeAdvanceRequest request) {
        return EmployeeAdvanceResponse.from(service.create(request));
    }

    @GetMapping
    public List<EmployeeAdvanceResponse> list(
            @RequestParam(name = "employee_id", required = false) Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.list(employeeId, from, to).stream().map(EmployeeAdvanceResponse::from).toList();
    }
}
