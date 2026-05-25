-- ═══════════════════════════════════════════════════════════════════════
-- V53 — Add tickets.discount_reason
--
-- The new "EXTRAS" box on the ticket form requires a written justification
-- for every discount, mirroring the existing surcharge_amount/_reason pair.
-- Owner-driven: the wireframe from the cashier shows "Motivo del descuento"
-- as a labeled field next to "Descuento". Backend enforces non-blank when
-- discount_percent > 0 (and ticket is not a courtesy — courtesy zeroes out
-- the discount entirely).
--
-- Column is nullable so existing rows with discount_percent > 0 but no
-- reason don't fail the migration. Validation only fires on new writes.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(120);
