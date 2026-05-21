-- V27: Attendance tracking for payroll accuracy
--
-- Tracks clock-in/out per employee per day.
-- Absence count drives commission rate degradation:
--   0-1 faltas -> normal rate
--   2 faltas   -> $15/car
--   3-4 faltas -> $10/car

CREATE TABLE attendance_records (
    id                  BIGSERIAL PRIMARY KEY,
    tenant_id           BIGINT       NOT NULL DEFAULT 1,
    employee_id         BIGINT       NOT NULL REFERENCES employees(id),
    work_date           DATE         NOT NULL,
    clock_in            TIMESTAMPTZ,
    clock_out           TIMESTAMPTZ,
    absence             BOOLEAN      NOT NULL DEFAULT false,
    note                VARCHAR(500),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_attendance_employee_date UNIQUE (tenant_id, employee_id, work_date)
);

CREATE INDEX idx_attendance_work_date   ON attendance_records(tenant_id, work_date);
CREATE INDEX idx_attendance_employee    ON attendance_records(tenant_id, employee_id);
