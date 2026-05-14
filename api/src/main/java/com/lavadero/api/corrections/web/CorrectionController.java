package com.lavadero.api.corrections.web;

import com.lavadero.api.corrections.service.CorrectionService;
import com.lavadero.api.corrections.web.CorrectionDtos.CorrectionRequest;
import com.lavadero.api.operations.web.ShiftDtos.ShiftResponse;
import com.lavadero.api.payroll.service.PayrollService;
import com.lavadero.api.payroll.web.PayrollDtos.PayrollPeriodResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/corrections")
public class CorrectionController {
    private final CorrectionService corrections;
    private final PayrollService payroll;

    public CorrectionController(CorrectionService corrections, PayrollService payroll) {
        this.corrections = corrections;
        this.payroll = payroll;
    }

    @PostMapping("/shifts/{id}/reopen")
    public ShiftResponse reopenShift(@PathVariable Long id, @Valid @RequestBody CorrectionRequest request) {
        return ShiftResponse.from(corrections.reopenShift(id, request.reason()));
    }

    @PostMapping("/payroll-periods/{id}/unlock")
    public PayrollPeriodResponse unlockPayrollPeriod(@PathVariable Long id, @Valid @RequestBody CorrectionRequest request) {
        corrections.unlockPayrollPeriod(id, request.reason());
        return payroll.get(id);
    }
}
