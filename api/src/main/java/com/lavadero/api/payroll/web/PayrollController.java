package com.lavadero.api.payroll.web;

import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import com.lavadero.api.payroll.service.DebtLedgerService;
import com.lavadero.api.payroll.service.PayrollService;
import com.lavadero.api.payroll.web.PayrollDtos.CreatePayrollPeriodRequest;
import com.lavadero.api.payroll.web.PayrollDtos.DebtBalanceResponse;
import com.lavadero.api.payroll.web.PayrollDtos.PayrollPeriodResponse;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/v1/payroll")
public class PayrollController {
    private final PayrollService payroll;
    private final DebtLedgerService debtLedger;

    public PayrollController(PayrollService payroll, DebtLedgerService debtLedger) {
        this.payroll = payroll;
        this.debtLedger = debtLedger;
    }

    @PostMapping("/periods")
    @ResponseStatus(HttpStatus.CREATED)
    public PayrollPeriodResponse createPeriod(@Valid @RequestBody CreatePayrollPeriodRequest request) {
        return payroll.createPeriod(request);
    }

    @GetMapping("/periods")
    public List<PayrollPeriodResponse> listPeriods(@RequestParam(required = false) PayrollPeriodStatus status) {
        return payroll.list(status);
    }

    @GetMapping("/periods/{id}")
    public PayrollPeriodResponse getPeriod(@PathVariable Long id) {
        return payroll.get(id);
    }

    @PostMapping("/periods/{id}/compute")
    public PayrollPeriodResponse compute(@PathVariable Long id) {
        return payroll.compute(id);
    }

    @PostMapping("/periods/{id}/lock")
    public PayrollPeriodResponse lock(@PathVariable Long id) {
        return payroll.lock(id);
    }

    @GetMapping("/employees/{id}/debt-balance")
    public DebtBalanceResponse debtBalance(@PathVariable Long id) {
        return new DebtBalanceResponse(id, debtLedger.balance(id));
    }
}
