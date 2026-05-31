-- Expand attendance from a binary absence flag to a 6-state enum so the app can
-- track the same status codes the legacy Excel uses (descanso / falta /
-- enfermo / suspencion / CLIMA). The `absence` boolean is kept for backward
-- compatibility and derived from status on write.
--
-- PDF mapping:
--   PRESENT   -> normal day worked
--   ABSENT    -> 'falta' (no-show, penalty applies for salary workers)
--   REST_DAY  -> 'descanso' (scheduled day off, counts toward rest-day pay)
--   SICK      -> 'enfermo' (no work, no pay, no penalty)
--   SUSPENDED -> 'suspencion' (disciplinary, no pay, no penalty)
--   WEATHER   -> 'CLIMA' (business closed, no penalty)

ALTER TABLE attendance_records
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PRESENT';

UPDATE attendance_records
   SET status = CASE WHEN absence THEN 'ABSENT' ELSE 'PRESENT' END;

ALTER TABLE attendance_records
    ADD CONSTRAINT chk_attendance_status
    CHECK (status IN ('PRESENT', 'ABSENT', 'REST_DAY', 'SICK', 'SUSPENDED', 'WEATHER'));

-- Keep the absence boolean consistent with status going forward (write-side
-- enforcement is in AttendanceService, but a backstop trigger isn't worth the
-- complexity right now).

CREATE INDEX IF NOT EXISTS idx_attendance_records_status
    ON attendance_records (tenant_id, status, work_date);
