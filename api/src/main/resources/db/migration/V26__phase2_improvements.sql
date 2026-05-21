-- V26: Phase 2 improvements
--
-- 1. tickets.occurred_at — when the wash actually happened (not the system entry time)
-- 2. tickets.internal_ref — operator's handwritten nota de control number
-- 3. employees.deactivation_reason — why a washer was let go
-- 4. Motor wash (LAV_MOTOR) price fix: $93 flat for all MXN sizes (was 72/72/90/90)

ALTER TABLE tickets
    ADD COLUMN occurred_at  TIMESTAMPTZ,
    ADD COLUMN internal_ref VARCHAR(40);

-- Backfill occurred_at from created_at so existing rows are consistent
UPDATE tickets SET occurred_at = created_at WHERE occurred_at IS NULL;

ALTER TABLE employees
    ADD COLUMN deactivation_reason VARCHAR(500);

-- Fix motor wash MXN price to $93 flat across all vehicle sizes.
-- Carlos confirmed: they charge $93 regardless of size.
UPDATE service_prices sp
SET    amount = 93.00
FROM   service_types st
WHERE  st.id       = sp.service_type_id
  AND  st.tenant_id = 1
  AND  st.code      = 'LAV_MOTOR'
  AND  sp.currency  = 'MXN'
  AND  sp.effective_to IS NULL;
