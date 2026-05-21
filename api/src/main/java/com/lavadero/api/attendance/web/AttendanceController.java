package com.lavadero.api.attendance.web;

import com.lavadero.api.attendance.service.AttendanceService;
import com.lavadero.api.attendance.web.AttendanceDtos.AttendanceResponse;
import com.lavadero.api.attendance.web.AttendanceDtos.CreateAttendanceRequest;
import com.lavadero.api.attendance.web.AttendanceDtos.UpdateAttendanceRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {

    private final AttendanceService service;

    public AttendanceController(AttendanceService service) {
        this.service = service;
    }

    @GetMapping
    public List<AttendanceResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "employee_id", required = false) Long employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (date != null) {
            return service.listByDate(date).stream().map(AttendanceResponse::from).toList();
        }
        if (employeeId != null && from != null && to != null) {
            return service.listByEmployee(employeeId, from, to).stream().map(AttendanceResponse::from).toList();
        }
        return service.listByDate(LocalDate.now()).stream().map(AttendanceResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AttendanceResponse create(@Valid @RequestBody CreateAttendanceRequest request) {
        return AttendanceResponse.from(service.create(request));
    }

    @PatchMapping("/{id}")
    public AttendanceResponse update(@PathVariable Long id, @Valid @RequestBody UpdateAttendanceRequest request) {
        return AttendanceResponse.from(service.update(id, request));
    }
}
