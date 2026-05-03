package com.lavadero.api.reports.web;

import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class DailySummaryController {
    private final DailySummaryService service;

    public DailySummaryController(DailySummaryService service) {
        this.service = service;
    }

    @GetMapping("/daily-summary")
    public DailySummaryResponse dailySummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.get(date);
    }
}
