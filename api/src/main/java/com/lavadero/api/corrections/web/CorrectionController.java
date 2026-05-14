package com.lavadero.api.corrections.web;

import com.lavadero.api.corrections.service.CorrectionService;
import com.lavadero.api.corrections.web.CorrectionDtos.CorrectionRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/corrections")
public class CorrectionController {
    private final CorrectionService corrections;

    public CorrectionController(CorrectionService corrections) {
        this.corrections = corrections;
    }

    @PostMapping("/shifts/{id}/reopen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reopenShift(@PathVariable Long id, @Valid @RequestBody CorrectionRequest request) {
        corrections.reopenShift(id, request.reason());
    }

    @PostMapping("/payroll-periods/{id}/unlock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlockPayrollPeriod(@PathVariable Long id, @Valid @RequestBody CorrectionRequest request) {
        corrections.unlockPayrollPeriod(id, request.reason());
    }
}
