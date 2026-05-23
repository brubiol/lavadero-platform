package com.lavadero.api.oversight.web;

import com.lavadero.api.oversight.service.OversightService;
import com.lavadero.api.oversight.web.OversightDtos.OversightPatternsResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/oversight")
public class OversightController {
    private final OversightService oversight;

    public OversightController(OversightService oversight) {
        this.oversight = oversight;
    }

    @GetMapping("/patterns")
    public OversightPatternsResponse patterns(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return oversight.patterns(from, to);
    }
}
