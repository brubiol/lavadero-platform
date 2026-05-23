-- Two related changes shipped together:
--
-- 1. Per-ticket dirt surcharge (cargo extra) — operator can charge $30 /
--    $100 / $200 etc. when a car is extra dirty. Replaces the priceOverride
--    workaround the V35 comment flagged as the "exceso de lodo" hole.
--
-- 2. Vehicle taxonomy cleanup. Today the operator picks "Servicio = MOTOS"
--    + "Tamaño = SEDAN" which is nonsense — MOTOS / RAZR / CAM_PERSONAL
--    were registered as services but they're actually vehicle types. We
--    move them into vehicle_sizes with a category column so the operator
--    picks a real service AND a real vehicle. Old service rows are
--    deactivated (not deleted) so historical tickets still resolve.

-- 1. Surcharge columns on tickets.
ALTER TABLE tickets
    ADD COLUMN surcharge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN surcharge_reason VARCHAR(120);

-- 2. Vehicle taxonomy: add category, backfill existing sizes as AUTO.
ALTER TABLE vehicle_sizes
    ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'AUTO';

-- existing rows (CHICO, SEDAN, MEDIANO, GRANDE) keep AUTO via the default

-- 3. New vehicle sizes. sort_order picks up after the existing 4.
INSERT INTO vehicle_sizes (tenant_id, code, name, sort_order, category, active)
VALUES
  (1, 'MOTO',        'Moto',                       10, 'MOTO',     true),
  (1, 'RAZR_S',      'RAZR pequeño',               20, 'RAZR',     true),
  (1, 'RAZR_L',      'RAZR grande',                21, 'RAZR',     true),
  (1, 'PERSONAL_S',  'Cam. personal chica',        30, 'PERSONAL', true),
  (1, 'PERSONAL_M',  'Cam. personal mediana',      31, 'PERSONAL', true),
  (1, 'PERSONAL_L',  'Cam. personal grande',       32, 'PERSONAL', true),
  (1, 'PERSONAL_XL', 'Cam. personal extra grande', 33, 'PERSONAL', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- 4. Prices for the new sizes. All sourced from V35's standalone services
--    (MOTOS, RAZR, CAM_PERSONAL, CAM_PERSONAL_EXT) so operators see the
--    same numbers under the new model.
--
--    MOTOS (V35):           SEDAN  $73, GRANDE  $83
--    RAZR  (V35):           MEDIANO $296, GRANDE $444
--    CAM_PERSONAL (V35):     CHICO $216, SEDAN $256, MEDIANO $296, GRANDE $336
--    CAM_PERSONAL_EXT (V35): CHICO $146, SEDAN $186, MEDIANO $226, GRANDE $266
--
--    For Moto we expose Lavado y aspirado, Lavado exterior, Aspirado.
--    For RAZR we expose the same three services priced per size.
--    For Camionetas de personal: LAV_ASPIRADO = full wash (CAM_PERSONAL
--    prices); LAV_EXTERIOR = exterior only (CAM_PERSONAL_EXT prices).
INSERT INTO service_prices (tenant_id, service_type_id, vehicle_size_id, amount, currency, effective_from)
SELECT 1, st.id, vs.id, price.amount, 'MXN', DATE '2026-05-23'
FROM service_types st
JOIN vehicle_sizes vs ON vs.tenant_id = 1
JOIN (VALUES
  -- Moto
  ('LAV_ASPIRADO', 'MOTO',         83.00),
  ('LAV_EXTERIOR', 'MOTO',         73.00),
  ('ASPIRADO',     'MOTO',         60.00),
  -- RAZR pequeño
  ('LAV_ASPIRADO', 'RAZR_S',      296.00),
  ('LAV_EXTERIOR', 'RAZR_S',      220.00),
  ('ASPIRADO',     'RAZR_S',      150.00),
  -- RAZR grande
  ('LAV_ASPIRADO', 'RAZR_L',      444.00),
  ('LAV_EXTERIOR', 'RAZR_L',      330.00),
  ('ASPIRADO',     'RAZR_L',      220.00),
  -- Camionetas de personal — full wash (LAV_ASPIRADO) and exterior-only
  -- (LAV_EXTERIOR) sourced from V35 CAM_PERSONAL / CAM_PERSONAL_EXT.
  ('LAV_ASPIRADO', 'PERSONAL_S',  216.00),
  ('LAV_EXTERIOR', 'PERSONAL_S',  146.00),
  ('LAV_ASPIRADO', 'PERSONAL_M',  256.00),
  ('LAV_EXTERIOR', 'PERSONAL_M',  186.00),
  ('LAV_ASPIRADO', 'PERSONAL_L',  296.00),
  ('LAV_EXTERIOR', 'PERSONAL_L',  226.00),
  ('LAV_ASPIRADO', 'PERSONAL_XL', 336.00),
  ('LAV_EXTERIOR', 'PERSONAL_XL', 266.00)
) AS price(svc_code, size_code, amount)
  ON st.code = price.svc_code AND st.tenant_id = 1
  AND vs.code = price.size_code
ON CONFLICT (tenant_id, service_type_id, vehicle_size_id, currency, effective_from) DO NOTHING;

-- 5. Deactivate the legacy standalone vehicle-type services. Rows stay so
--    historical tickets that reference them still resolve; they just no
--    longer appear in the operator's service dropdown.
UPDATE service_types
SET active = false
WHERE tenant_id = 1
  AND code IN ('MOTOS', 'RAZR', 'CAM_PERSONAL', 'CAM_PERSONAL_EXT');
