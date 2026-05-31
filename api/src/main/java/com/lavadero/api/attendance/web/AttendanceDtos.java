package com.lavadero.api.attendance.web;

import com.lavadero.api.attendance.domain.AttendanceRecord;
import com.lavadero.api.attendance.domain.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;

public final class AttendanceDtos {
    private AttendanceDtos() {
    }

    public record CreateAttendanceRequest(
            @NotNull Long employeeId,
            @NotNull LocalDate workDate,
            Instant clockIn,
            // Legacy: callers may still send `absence: true` and we map it to ABSENT.
            // Prefer `status` for new integrations.
            Boolean absence,
            AttendanceStatus status,
            @Size(max = 500) String note) {
    }

    public record UpdateAttendanceRequest(
            Instant clockIn,
            Instant clockOut,
            Boolean absence,
            AttendanceStatus status,
            @Size(max = 500) String note) {
    }

    public record AttendanceResponse(Long id, Long employeeId, String employeeName, LocalDate workDate,
            Instant clockIn, Instant clockOut, boolean absence, AttendanceStatus status, String note,
            Instant createdAt, Instant updatedAt) {
        public static AttendanceResponse from(AttendanceRecord record) {
            return new AttendanceResponse(record.getId(), record.getEmployee().getId(),
                    record.getEmployee().getFullName(), record.getWorkDate(),
                    record.getClockIn(), record.getClockOut(), record.isAbsence(),
                    record.getStatus(), record.getNote(),
                    record.getCreatedAt(), record.getUpdatedAt());
        }
    }
}
