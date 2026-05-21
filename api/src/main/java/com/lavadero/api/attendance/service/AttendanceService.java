package com.lavadero.api.attendance.service;

import com.lavadero.api.attendance.domain.AttendanceRecord;
import com.lavadero.api.attendance.repository.AttendanceRepository;
import com.lavadero.api.attendance.web.AttendanceDtos.CreateAttendanceRequest;
import com.lavadero.api.attendance.web.AttendanceDtos.UpdateAttendanceRequest;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {

    private final AttendanceRepository records;
    private final EmployeeRepository employees;

    public AttendanceService(AttendanceRepository records, EmployeeRepository employees) {
        this.records = records;
        this.employees = employees;
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> listByDate(LocalDate date) {
        return records.findByWorkDateOrderByEmployeeFullNameAsc(date);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecord> listByEmployee(Long employeeId, LocalDate from, LocalDate to) {
        return records.findByEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(employeeId, from, to);
    }

    @Transactional
    public AttendanceRecord create(CreateAttendanceRequest request) {
        Employee employee = employees.findById(request.employeeId())
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        records.findByTenantIdAndEmployeeIdAndWorkDate(1L, request.employeeId(), request.workDate())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Attendance record already exists for this employee and date");
                });
        Instant clockIn = request.clockIn() != null ? request.clockIn() : (request.absence() ? null : Instant.now());
        String note = request.note() != null && !request.note().isBlank() ? request.note().trim() : null;
        return records.save(new AttendanceRecord(employee, request.workDate(), clockIn, request.absence(), note));
    }

    @Transactional
    public AttendanceRecord update(Long id, UpdateAttendanceRequest request) {
        AttendanceRecord record = records.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Attendance record not found"));
        boolean absence = request.absence() != null ? request.absence() : record.isAbsence();
        record.update(request.clockIn(), request.clockOut(), absence, request.note());
        return record;
    }

    @Transactional(readOnly = true)
    public long countAbsences(Long employeeId, LocalDate from, LocalDate to) {
        return records.countAbsences(employeeId, from, to);
    }
}
