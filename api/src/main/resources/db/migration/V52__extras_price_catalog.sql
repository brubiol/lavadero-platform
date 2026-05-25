-- ═══════════════════════════════════════════════════════════════════════
-- V52 — Add Encerado / Pulido / Lav. Interior as catalog "extras"
--
-- The owner's physical price sheet has a separate EXTRAS section. These
-- three services were never in the system. Adding them as standalone
-- service_types so they can be sold on their own AND show up as one-click
-- presets in the ticket form's "Precio especial" (priceOverride) panel.
--
-- The category column on service_types lets the UI group STANDARD washes
-- apart from EXTRA add-ons without baking semantics into the code prefix.
-- Sparse service_prices coverage means MOTO/RAZR_*/PERSONAL_* simply have
-- no row -> the extras don't appear when those vehicle sizes are picked.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. New column. Defaults to STANDARD so every existing row keeps current
--    behavior; only the three new inserts below carry 'EXTRA'.
ALTER TABLE service_types
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

-- 2. The three new extras.
INSERT INTO service_types (tenant_id, code, name, description, active, category)
VALUES
    (1, 'ENCERADO',     'Encerado',        'Encerado completo del vehiculo',  true, 'EXTRA'),
    (1, 'PULIDO',       'Pulido',          'Pulido de carroceria',            true, 'EXTRA'),
    (1, 'LAV_INTERIOR', 'Lavado Interior', 'Lavado interior detallado',       true, 'EXTRA')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- 3. Sparse pricing per (extra x vehicle_size). Only the four standard
--    car/camioneta sizes are priced — MOTO, RAZR_*, PERSONAL_* intentionally
--    have no row so the extras don't appear in their pickers.
INSERT INTO service_prices (tenant_id, service_type_id, vehicle_size_id, amount, currency, effective_from)
SELECT 1, st.id, vs.id, price.amount, 'MXN', '2026-05-24'
FROM service_types st
JOIN vehicle_sizes vs ON vs.tenant_id = 1
JOIN (VALUES
    ('ENCERADO',     'CHICO',     284.00),
    ('ENCERADO',     'SEDAN',     438.00),
    ('ENCERADO',     'MEDIANO',   529.00),
    ('ENCERADO',     'GRANDE',    529.00),
    ('PULIDO',       'CHICO',     479.00),
    ('PULIDO',       'SEDAN',     728.00),
    ('PULIDO',       'MEDIANO',   898.00),
    ('PULIDO',       'GRANDE',    898.00),
    ('LAV_INTERIOR', 'CHICO',     898.00),
    ('LAV_INTERIOR', 'SEDAN',     898.00),
    ('LAV_INTERIOR', 'MEDIANO',  1418.00),
    ('LAV_INTERIOR', 'GRANDE',   1418.00)
) AS price(service_code, size_code, amount)
  ON price.service_code = st.code AND price.size_code = vs.code
WHERE st.tenant_id = 1
ON CONFLICT (tenant_id, service_type_id, vehicle_size_id, currency, effective_from) DO NOTHING;
