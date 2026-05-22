-- V35: Real price catalog from the owner's official price list (2026-05-22).
--
-- Replaces the V13 estimated MXN prices for the four wash services and adds
-- three new service categories: RAZR, Motos, and Camionetas de personal
-- (the company fleet vehicles, completo and solo-exterior variants).
--
-- USD prices and the "Solo Presion" service are left untouched.
-- "Exceso de lodo" surcharges are handled per-ticket with the price override.
-- Wax / polish / interior add-ons are intentionally not included here.

-- 1. Rename the vehicle sizes to the owner's categories (codes kept stable
--    so historical tickets and prior migrations stay valid).
UPDATE vehicle_sizes SET name = 'Carro'             WHERE tenant_id = 1 AND code = 'CHICO';
UPDATE vehicle_sizes SET name = 'Camioneta chica'   WHERE tenant_id = 1 AND code = 'SEDAN';
UPDATE vehicle_sizes SET name = 'Camioneta mediana' WHERE tenant_id = 1 AND code = 'MEDIANO';
UPDATE vehicle_sizes SET name = 'Camioneta grande'  WHERE tenant_id = 1 AND code = 'GRANDE';

-- 2. New service types.
INSERT INTO service_types (tenant_id, code, name, description, active)
VALUES
  (1, 'RAZR',             'RAZR',                          'Lavado de RAZR / vehiculo todo terreno',  true),
  (1, 'MOTOS',            'Motos',                         'Lavado de motocicleta',                   true),
  (1, 'CAM_PERSONAL',     'Camionetas de personal',        'Camioneta de empresa, servicio completo', true),
  (1, 'CAM_PERSONAL_EXT', 'Camionetas de personal (ext.)', 'Camioneta de empresa, solo exterior',     true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- 3. Close out the old estimated MXN prices for the four repriced services.
UPDATE service_prices sp
SET effective_to = DATE '2026-05-21'
FROM service_types st
WHERE sp.service_type_id = st.id
  AND st.tenant_id = 1
  AND st.code IN ('LAV_ASPIRADO', 'LAV_EXTERIOR', 'ASPIRADO', 'LAV_MOTOR')
  AND sp.currency = 'MXN'
  AND sp.effective_to IS NULL;

-- 4. New MXN price list, effective 2026-05-22.
--    Size codes map to the owner's categories:
--      CHICO = Carro, SEDAN = Camioneta chica,
--      MEDIANO = Camioneta mediana, GRANDE = Camioneta grande.
INSERT INTO service_prices (tenant_id, service_type_id, vehicle_size_id, amount, currency, effective_from)
SELECT 1, st.id, vs.id, price.amount, 'MXN', DATE '2026-05-22'
FROM service_types st
JOIN vehicle_sizes vs ON vs.tenant_id = 1
JOIN (VALUES
  ('LAV_ASPIRADO',     'CHICO',   108.00),
  ('LAV_ASPIRADO',     'SEDAN',   128.00),
  ('LAV_ASPIRADO',     'MEDIANO', 148.00),
  ('LAV_ASPIRADO',     'GRANDE',  168.00),
  ('LAV_EXTERIOR',     'CHICO',    73.00),
  ('LAV_EXTERIOR',     'SEDAN',    93.00),
  ('LAV_EXTERIOR',     'MEDIANO', 113.00),
  ('LAV_EXTERIOR',     'GRANDE',  133.00),
  ('ASPIRADO',         'CHICO',    73.00),
  ('ASPIRADO',         'SEDAN',    73.00),
  ('ASPIRADO',         'MEDIANO',  83.00),
  ('ASPIRADO',         'GRANDE',   83.00),
  ('LAV_MOTOR',        'CHICO',    83.00),
  ('LAV_MOTOR',        'SEDAN',    83.00),
  ('LAV_MOTOR',        'MEDIANO',  93.00),
  ('LAV_MOTOR',        'GRANDE',   93.00),
  ('RAZR',             'MEDIANO', 296.00),
  ('RAZR',             'GRANDE',  444.00),
  ('MOTOS',            'SEDAN',    73.00),
  ('MOTOS',            'GRANDE',   83.00),
  ('CAM_PERSONAL',     'CHICO',   216.00),
  ('CAM_PERSONAL',     'SEDAN',   256.00),
  ('CAM_PERSONAL',     'MEDIANO', 296.00),
  ('CAM_PERSONAL',     'GRANDE',  336.00),
  ('CAM_PERSONAL_EXT', 'CHICO',   146.00),
  ('CAM_PERSONAL_EXT', 'SEDAN',   186.00),
  ('CAM_PERSONAL_EXT', 'MEDIANO', 226.00),
  ('CAM_PERSONAL_EXT', 'GRANDE',  266.00)
) AS price(svc_code, size_code, amount)
  ON st.code = price.svc_code AND st.tenant_id = 1
  AND vs.code = price.size_code
ON CONFLICT (tenant_id, service_type_id, vehicle_size_id, currency, effective_from) DO NOTHING;
