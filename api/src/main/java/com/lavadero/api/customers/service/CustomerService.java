package com.lavadero.api.customers.service;

import com.lavadero.api.customers.domain.Customer;
import com.lavadero.api.customers.domain.LoyaltyStatus;
import com.lavadero.api.customers.repository.CustomerRepository;
import com.lavadero.api.customers.web.CustomerDtos.CreateCustomerRequest;
import com.lavadero.api.customers.web.CustomerDtos.CustomerProfileResponse;
import com.lavadero.api.customers.web.CustomerDtos.UpdateCustomerRequest;
import com.lavadero.api.operations.domain.TicketCurrency;
import com.lavadero.api.operations.domain.TicketStatus;
import com.lavadero.api.operations.repository.TicketRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerService {

    private final CustomerRepository customers;
    private final TicketRepository tickets;

    public CustomerService(CustomerRepository customers, TicketRepository tickets) {
        this.customers = customers;
        this.tickets = tickets;
    }

    @Transactional
    public Customer create(CreateCustomerRequest request) {
        return customers.save(new Customer(request.name(), request.phone(), request.notes()));
    }

    @Transactional(readOnly = true)
    public Customer get(Long id) {
        return customers.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
    }

    @Transactional(readOnly = true)
    public List<Customer> list(String q) {
        if (q == null || q.isBlank()) {
            return customers.findByActiveTrueOrderByNameAsc();
        }
        return customers.searchActive(q.trim());
    }

    @Transactional
    public Customer update(Long id, UpdateCustomerRequest request) {
        Customer customer = get(id);
        customer.update(request.name(), request.phone(), request.notes(), request.loyaltyStatus());
        return customer;
    }

    @Transactional
    public void deactivate(Long id) {
        Customer customer = get(id);
        customer.deactivate();
    }

    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(Long id) {
        Customer customer = get(id);

        long totalVisits = tickets.countByCustomerForLoyalty(id, TicketStatus.ACTIVE);
        BigDecimal totalSpentMxn = tickets.sumSpendByCustomer(id, TicketStatus.ACTIVE, TicketCurrency.MXN);

        List<LocalDate> lastDates = tickets.findLastVisitDatesByCustomer(id, TicketStatus.ACTIVE, PageRequest.of(0, 1));
        LocalDate lastVisitDate = lastDates.isEmpty() ? null : lastDates.get(0);

        int loyaltyProgress = (int) (totalVisits % 10);
        int loyaltyRewardsEarned = (int) (totalVisits / 10);

        return new CustomerProfileResponse(
                customer.getId(),
                customer.getName(),
                customer.getPhone(),
                customer.getLoyaltyStatus(),
                totalVisits,
                totalSpentMxn,
                lastVisitDate,
                loyaltyProgress,
                loyaltyRewardsEarned);
    }
}
