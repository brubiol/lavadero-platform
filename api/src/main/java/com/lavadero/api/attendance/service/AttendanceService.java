package com.lavadero.api.attendance.service;

import com.lavadero.api.attendance.domain.AttendanceRecord;
import com.lavadero.api.attendance.domain.AttendanceStatus;
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
        AttendanceStatus status = resolveStatus(request.status(), request.absence(), AttendanceStatus.PRESENT);
        Instant clockIn = request.clockIn() != null
                ? request.clockIn()
                : (status.countsAsPresent() ? Instant.now() : null);
        String note = request.note() != null && !request.note().isBlank() ? request.note().trim() : null;
        return records.save(new AttendanceRecord(employee, request.workDate(), clockIn, status, note));
    }

    @Transactional
    public AttendanceRecord update(Long id, UpdateAttendanceRequest request) {
        AttendanceRecord record = records.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Attendance record not found"));
        AttendanceStatus status = resolveStatus(request.status(), request.absence(), null);
        // When the row is transitioning from a non-present status (ABSENT,
        // REST_DAY, SICK, etc.) up to PRESENT and the caller didn't supply
        // a clockIn, stamp `now()` so the row carries an entrada — matches
        // the create path and avoids a PRESENT row with a null clockIn.
        Instant clockIn = request.clockIn();
        if (clockIn == null && status == AttendanceStatus.PRESENT && record.getClockIn() == null) {
            clockIn = Instant.now();
        }
        record.update(clockIn, request.clockOut(), status, request.note());
        // Force lazy `employee` to initialize while the session is still open so
        // the controller can render employeeName without a LazyInitializationException.
        record.getEmployee().getFullName();
        return record;
    }

    @Transactional(readOnly = true)
    public long countAbsences(Long employeeId, LocalDate from, LocalDate to) {
        return records.countAbsences(employeeId, from, to);
    }

    @Transactional(readOnly = true)
    public long countPresentDays(Long employeeId, LocalDate from, LocalDate to) {
        return records.countPresentDays(employeeId, from, to);
    }

    // Resolve status from the request, honoring explicit `status` first and falling
    // back to the legacy `absence` boolean. When neither is provided, returns the
    // supplied fallback (null on update to leave the existing status untouched).
    private AttendanceStatus resolveStatus(AttendanceStatus status, Boolean absence, AttendanceStatus fallback) {
        if (status != null) return status;
        if (absence != null) return absence ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
        return fallback;
    }
}
