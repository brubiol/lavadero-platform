package com.lavadero.api.customers.web;

import com.lavadero.api.customers.service.CustomerService;
import com.lavadero.api.customers.web.CustomerDtos.CreateCustomerRequest;
import com.lavadero.api.customers.web.CustomerDtos.CustomerProfileResponse;
import com.lavadero.api.customers.web.CustomerDtos.CustomerResponse;
import com.lavadero.api.customers.web.CustomerDtos.UpdateCustomerRequest;
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
@RequestMapping("/api/v1/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(@Valid @RequestBody CreateCustomerRequest request) {
        return CustomerResponse.from(customerService.create(request));
    }

    @GetMapping
    public List<CustomerResponse> list(@RequestParam(required = false) String q) {
        // Each row carries loyaltyProgress + loyaltyRewardsEarned so the
        // Clientes directory and Lealtad screen render the 10-dot card directly.
        return customerService.listWithLoyalty(q);
    }

    @GetMapping("/{id}")
    public CustomerResponse get(@PathVariable Long id) {
        return CustomerResponse.from(customerService.get(id));
    }

    @PatchMapping("/{id}")
    public CustomerResponse update(@PathVariable Long id, @Valid @RequestBody UpdateCustomerRequest request) {
        return CustomerResponse.from(customerService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        customerService.deactivate(id);
    }

    @GetMapping("/{id}/profile")
    public CustomerProfileResponse profile(@PathVariable Long id) {
        return customerService.getProfile(id);
    }
}
