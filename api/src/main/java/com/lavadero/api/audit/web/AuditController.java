package com.lavadero.api.audit.web;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.audit.web.AuditDtos.AuditEventResponse;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-events")
public class AuditController {
    private final AuditService audit;

    public AuditController(AuditService audit) {
        this.audit = audit;
    }

    @GetMapping
    public List<AuditEventResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId) {
        return audit.search(from, to, entityType, entityId).stream().map(AuditEventResponse::from).toList();
    }

    @GetMapping("/flagged")
    public List<AuditEventResponse> flagged() {
        return audit.pendingFlagged().stream().map(AuditEventResponse::from).toList();
    }

    @PostMapping("/{id}/review")
    public AuditEventResponse review(@PathVariable Long id) {
        return AuditEventResponse.from(audit.markReviewed(id));
    }
}
