-- V33: Let the owner review irregular changes.
--
-- The manager (GERENTE) may edit payroll and staff numbers freely. When a
-- change is unusually large it is recorded as a FLAGGED audit event so the
-- owner (DUENO) can review and acknowledge it.

ALTER TABLE audit_events
    ADD COLUMN severity    VARCHAR(20)  NOT NULL DEFAULT 'INFO',
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN reviewed_by VARCHAR(120);

ALTER TABLE audit_events
    ADD CONSTRAINT chk_audit_events_severity CHECK (severity IN ('INFO', 'FLAGGED'));

CREATE INDEX idx_audit_events_flagged_pending
    ON audit_events (tenant_id, occurred_at DESC)
    WHERE severity = 'FLAGGED' AND reviewed_at IS NULL;
