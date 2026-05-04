package com.lavadero.api.reports.web;

import com.lavadero.api.reports.service.ExcelExportService;
import com.lavadero.api.reports.service.DailySummaryService;
import com.lavadero.api.reports.web.DailySummaryDtos.CashVarianceResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.DailySummaryResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.EmployeePerformanceResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.ExportPreviewResponse;
import com.lavadero.api.reports.web.DailySummaryDtos.MonthlySummaryResponse;
import java.time.LocalDate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class DailySummaryController {
    private final DailySummaryService service;
    private final ExcelExportService excelExport;

    public DailySummaryController(DailySummaryService service, ExcelExportService excelExport) {
        this.service = service;
        this.excelExport = excelExport;
    }

    @GetMapping("/daily-summary")
    public Object dailySummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (date != null) {
            return service.get(date);
        }
        return service.getRange(required(from, "from"), required(to, "to"));
    }

    @GetMapping("/monthly")
    public MonthlySummaryResponse monthly(@RequestParam int year, @RequestParam int month) {
        return service.getMonthly(year, month);
    }

    @GetMapping("/cash-variance")
    public CashVarianceResponse cashVariance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.cashVariance(from, to);
    }

    @GetMapping("/employee-performance")
    public EmployeePerformanceResponse employeePerformance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.employeePerformance(from, to);
    }

    @GetMapping("/export/preview")
    public ExportPreviewResponse exportPreview(@RequestParam(defaultValue = "full") String type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.exportPreview(type, from, to);
    }

    @GetMapping("/export")
    public ResponseEntity<ByteArrayResource> export(@RequestParam(defaultValue = "full") String type,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "xlsx") String format) {
        if (!"xlsx".equalsIgnoreCase(format)) {
            throw new IllegalArgumentException("Only xlsx export is supported");
        }
        byte[] bytes = excelExport.export(type, from, to);
        String filename = "lavadero-%s-%s-%s.xlsx".formatted(type, from, to);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    private LocalDate required(LocalDate value, String name) {
        if (value == null) {
            throw new IllegalArgumentException(name + " is required");
        }
        return value;
    }
}
