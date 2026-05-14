package com.lavadero.api.payroll.web;

import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import com.lavadero.api.payroll.service.DebtLedgerService;
import com.lavadero.api.payroll.service.PayrollService;
import com.lavadero.api.payroll.service.PayrollExportService;
import com.lavadero.api.payroll.web.PayrollDtos.CreatePayrollAdjustmentRequest;
import com.lavadero.api.payroll.web.PayrollDtos.CreatePayrollPeriodRequest;
import com.lavadero.api.payroll.web.PayrollDtos.DebtBalanceResponse;
import com.lavadero.api.payroll.web.PayrollDtos.PayrollAdjustmentResponse;
import com.lavadero.api.payroll.web.PayrollDtos.PayrollPeriodResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ContentDisposition;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    private final PayrollExportService payrollExport;

    public PayrollController(PayrollService payroll, DebtLedgerService debtLedger, PayrollExportService payrollExport) {
        this.payroll = payroll;
        this.debtLedger = debtLedger;
        this.payrollExport = payrollExport;
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

    @GetMapping("/periods/{id}/adjustments")
    public List<PayrollAdjustmentResponse> listAdjustments(@PathVariable Long id) {
        return payroll.listAdjustments(id);
    }

    @PostMapping("/periods/{id}/adjustments")
    @ResponseStatus(HttpStatus.CREATED)
    public PayrollAdjustmentResponse createAdjustment(@PathVariable Long id,
            @Valid @RequestBody CreatePayrollAdjustmentRequest request) {
        return payroll.createAdjustment(id, request);
    }

    @DeleteMapping("/adjustments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAdjustment(@PathVariable Long id) {
        payroll.deleteAdjustment(id);
    }

    @PostMapping("/periods/{id}/compute")
    public PayrollPeriodResponse compute(@PathVariable Long id) {
        return payroll.compute(id);
    }

    @PostMapping("/periods/{id}/lock")
    public PayrollPeriodResponse lock(@PathVariable Long id) {
        return payroll.lock(id);
    }

    @GetMapping("/periods/{id}/export")
    public ResponseEntity<ByteArrayResource> export(@PathVariable Long id,
            @RequestParam(defaultValue = "xlsx") String format) {
        if (!"xlsx".equalsIgnoreCase(format)) {
            throw new IllegalArgumentException("Only xlsx export is supported");
        }
        byte[] bytes = payrollExport.exportPeriod(id);
        String filename = "nomina-%d.xlsx".formatted(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    @GetMapping("/employees/{id}/debt-balance")
    public DebtBalanceResponse debtBalance(@PathVariable Long id) {
        return new DebtBalanceResponse(id, debtLedger.balance(id));
    }
}
