package com.lavadero.api.catalog.web;

import com.lavadero.api.catalog.service.EmployeeService;
import com.lavadero.api.catalog.web.EmployeeDtos.CreateEmployeeRequest;
import com.lavadero.api.catalog.web.EmployeeDtos.EmployeeResponse;
import com.lavadero.api.catalog.web.EmployeeDtos.UpdateEmployeeRequest;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/v1/employees")
public class EmployeeController {
    private final EmployeeService employees;

    public EmployeeController(EmployeeService employees) {
        this.employees = employees;
    }

    @GetMapping
    public List<EmployeeResponse> list(@RequestParam(required = false) Boolean active) {
        return employees.list(active).stream().map(EmployeeResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmployeeResponse create(@Valid @RequestBody CreateEmployeeRequest request) {
        return EmployeeResponse.from(employees.create(request));
    }

    @GetMapping("/{id}")
    public EmployeeResponse get(@PathVariable Long id) {
        return EmployeeResponse.from(employees.get(id));
    }

    @PatchMapping("/{id}")
    public EmployeeResponse update(@PathVariable Long id, @Valid @RequestBody UpdateEmployeeRequest request) {
        return EmployeeResponse.from(employees.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        employees.deactivate(id);
    }
}
