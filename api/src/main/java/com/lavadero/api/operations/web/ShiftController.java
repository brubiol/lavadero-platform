package com.lavadero.api.operations.web;

import com.lavadero.api.operations.service.ShiftService;
import com.lavadero.api.operations.web.ShiftDtos.OpenShiftRequest;
import com.lavadero.api.operations.web.ShiftDtos.ShiftResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/shifts")
public class ShiftController {
    private final ShiftService shifts;

    public ShiftController(ShiftService shifts) {
        this.shifts = shifts;
    }

    @PostMapping("/open")
    @ResponseStatus(HttpStatus.CREATED)
    public ShiftResponse open(@Valid @RequestBody OpenShiftRequest request) {
        return ShiftResponse.from(shifts.open(request));
    }

    @GetMapping
    public List<ShiftResponse> list(@RequestParam(name = "business_day_id") Long businessDayId) {
        return shifts.list(businessDayId).stream().map(ShiftResponse::from).toList();
    }
}
