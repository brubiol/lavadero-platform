package com.lavadero.api.operations.web;

import com.lavadero.api.operations.domain.TicketStatus;
import com.lavadero.api.operations.service.TicketService;
import com.lavadero.api.operations.web.TicketDtos.AttachCustomerRequest;
import com.lavadero.api.operations.web.TicketDtos.CreateTicketRequest;
import com.lavadero.api.operations.web.TicketDtos.TicketResponse;
import com.lavadero.api.operations.web.TicketDtos.UpdateTicketRequest;
import com.lavadero.api.operations.web.TicketDtos.VoidTicketRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/v1/tickets")
public class TicketController {
    private final TicketService tickets;

    public TicketController(TicketService tickets) {
        this.tickets = tickets;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse create(@Valid @RequestBody CreateTicketRequest request) {
        return TicketResponse.from(tickets.create(request));
    }

    @GetMapping
    public List<TicketResponse> list(@RequestParam(name = "business_day_id", required = false) Long businessDayId,
            @RequestParam(name = "shift_id", required = false) Long shiftId,
            @RequestParam(name = "employee_id", required = false) Long employeeId,
            @RequestParam(name = "nota_number", required = false) String notaNumber,
            @RequestParam(required = false) TicketStatus status) {
        return tickets.list(businessDayId, shiftId, employeeId, notaNumber, status).stream().map(TicketResponse::from).toList();
    }

    @GetMapping("/{id}")
    public TicketResponse get(@PathVariable Long id) {
        return TicketResponse.from(tickets.get(id));
    }

    @PatchMapping("/{id}")
    public TicketResponse update(@PathVariable Long id, @Valid @RequestBody UpdateTicketRequest request) {
        return TicketResponse.from(tickets.update(id, request));
    }

    @PostMapping("/{id}/void")
    public TicketResponse voidTicket(@PathVariable Long id, @Valid @RequestBody VoidTicketRequest request) {
        return TicketResponse.from(tickets.voidTicket(id, request.reason()));
    }

    @PostMapping("/{id}/attach-customer")
    public TicketResponse attachCustomer(@PathVariable Long id, @Valid @RequestBody AttachCustomerRequest request) {
        return TicketResponse.from(tickets.attachCustomer(id, request.customerId()));
    }
}
