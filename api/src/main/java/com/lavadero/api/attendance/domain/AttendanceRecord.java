package com.lavadero.api.attendance.domain;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecord extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "clock_in")
    private Instant clockIn;

    @Column(name = "clock_out")
    private Instant clockOut;

    @Column(nullable = false)
    private boolean absence = false;

    @Column(length = 500)
    private String note;

    protected AttendanceRecord() {
    }

    public AttendanceRecord(Employee employee, LocalDate workDate, Instant clockIn, boolean absence, String note) {
        this.employee = employee;
        this.workDate = workDate;
        this.clockIn = clockIn;
        this.absence = absence;
        this.note = note;
    }

    public Long getId() { return id; }
    public Employee getEmployee() { return employee; }
    public LocalDate getWorkDate() { return workDate; }
    public Instant getClockIn() { return clockIn; }
    public Instant getClockOut() { return clockOut; }
    public boolean isAbsence() { return absence; }
    public String getNote() { return note; }

    public void clockOut(Instant clockOut) {
        this.clockOut = clockOut;
    }

    public void update(Instant clockIn, Instant clockOut, boolean absence, String note) {
        if (clockIn != null) this.clockIn = clockIn;
        if (clockOut != null) this.clockOut = clockOut;
        this.absence = absence;
        if (note != null) this.note = note.isBlank() ? null : note.trim();
    }
}
