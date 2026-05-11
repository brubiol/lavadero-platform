package com.lavadero.api.ai.web;

import com.lavadero.api.ai.domain.AiFeatureType;
import com.lavadero.api.ai.domain.AiInsightStatus;
import com.lavadero.api.ai.service.AiInsightService;
import com.lavadero.api.ai.web.AiDtos.AiInsightResponse;
import com.lavadero.api.ai.web.AiDtos.AnalystChatRequest;
import com.lavadero.api.ai.web.AiDtos.AnalystChatResponse;
import com.lavadero.api.ai.web.AiDtos.InvestigationRequest;
import com.lavadero.api.ai.web.AiDtos.InvestigationResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {
    private final AiInsightService ai;

    public AiController(AiInsightService ai) {
        this.ai = ai;
    }

    @GetMapping("/insights")
    public List<AiInsightResponse> insights(
            @RequestParam(name = "feature_type", required = false) AiFeatureType featureType,
            @RequestParam(required = false) AiInsightStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ai.list(featureType, status, from, to);
    }

    @PostMapping("/insights/{id}/acknowledge")
    public AiInsightResponse acknowledge(@PathVariable Long id) {
        return ai.acknowledge(id);
    }

    @PostMapping("/insights/{id}/dismiss")
    public AiInsightResponse dismiss(@PathVariable Long id) {
        return ai.dismiss(id);
    }

    @PostMapping("/briefs/daily")
    public AiInsightResponse dailyBrief(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "false") boolean force) {
        return ai.dailyBrief(date, force);
    }

    @PostMapping("/alerts/run")
    public List<AiInsightResponse> runAlerts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ai.runAlerts(from, to);
    }

    @PostMapping("/chat")
    public AnalystChatResponse chat(@Valid @RequestBody AnalystChatRequest request) {
        return ai.chat(request.message(), request.from(), request.to());
    }

    @PostMapping("/investigations")
    public InvestigationResponse investigate(@Valid @RequestBody InvestigationRequest request) {
        return ai.investigate(request.question(), request.from(), request.to());
    }
}
