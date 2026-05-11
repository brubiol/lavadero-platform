-- V13: Real catalog — service types, vehicle sizes, prices, employee cleanup
-- Derived from CORTE DOLARES reference sheet + 10,027 historical tickets.
--
-- Vehicle sizes  : Chico | Sedan (1 Cabina) | Mediano | Grande
-- Service types  : Lavado y Aspirado | Lavado Exterior | Aspirado | Presion | Lavado Motor
-- MXN prices     : inferred from ticket frequency clusters across Jan–May 2026
-- USD prices     : direct from CORTE DOLARES reference sheet (border customers)
-- Employees      : deactivate single-occurrence typos; real roster remains active

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Vehicle sizes
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO vehicle_sizes (tenant_id, code, name, sort_order, active)
VALUES
  (1, 'CHICO',   'Chico (Sedan compacto)',       1, true),
  (1, 'SEDAN',   'Sedan (1 Cabina)',              2, true),
  (1, 'MEDIANO', 'Mediano (Crossover / SUV)',     3, true),
  (1, 'GRANDE',  'Grande (Camioneta / SUV full)', 4, true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Service types
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO service_types (tenant_id, code, name, description, active)
VALUES
  (1, 'LAV_ASPIRADO', 'Lavado y Aspirado',  'Lavado exterior completo mas aspirado interior', true),
  (1, 'LAV_EXTERIOR', 'Lavado Exterior',    'Lavado exterior solamente, sin aspirado',         true),
  (1, 'ASPIRADO',     'Solo Aspirado',      'Aspirado interior solamente',                    true),
  (1, 'PRESION',      'Solo Presion',       'Lavado de motor / presion con agua',              true),
  (1, 'LAV_MOTOR',    'Lavado de Motor',    'Lavado de motor con presion y desengrasante',     true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Service prices — MXN
--    Clusters confirmed by 10,027 historical tickets (Jan–May 2026).
--    LAV_ASPIRADO: 73 (9.8%) / 108 (30%) / 168 (21.4%) / 208 (6.9%)
--    LAV_EXTERIOR: estimated at ~74% of LAV_ASPIRADO (per CORTE DOLARES ratio)
--    ASPIRADO:     ~$62 observed in "SOLO ASPIRADO" observaciones
--    PRESION:      $50 observed in "SOLO PRESION" observaciones
--    LAV_MOTOR:    estimated from motor-service observaciones
-- ═══════════════════════════════════════════════════════════════════════

-- LAV_ASPIRADO — MXN
INSERT INTO service_prices (tenant_id, service_type_id, vehicle_size_id, amount, currency, effective_from)
SELECT 1, st.id, vs.id, price.amount, 'MXN', '2026-01-01'
FROM service_types st
JOIN vehicle_sizes vs ON vs.tenant_id = 1
JOIN (VALUES
  ('LAV_ASPIRADO', 'CHICO',    73.00),
  ('LAV_ASPIRADO', 'SEDAN',   108.00),
  ('LAV_ASPIRADO', 'MEDIANO', 168.00),
  ('LAV_ASPIRADO', 'GRANDE',  208.00),
  ('LAV_EXTERIOR', 'CHICO',    54.00),
  ('LAV_EXTERIOR', 'SEDAN',    73.00),
  ('LAV_EXTERIOR', 'MEDIANO', 133.00),
  ('LAV_EXTERIOR', 'GRANDE',  168.00),
  ('ASPIRADO',     'CHICO',    62.00),
  ('ASPIRADO',     'SEDAN',    62.00),
  ('ASPIRADO',     'MEDIANO',  72.00),
  ('ASPIRADO',     'GRANDE',   72.00),
  ('PRESION',      'CHICO',    50.00),
  ('PRESION',      'SEDAN',    50.00),
  ('PRESION',      'MEDIANO',  50.00),
  ('PRESION',      'GRANDE',   50.00),
  ('LAV_MOTOR',    'CHICO',    72.00),
  ('LAV_MOTOR',    'SEDAN',    72.00),
  ('LAV_MOTOR',    'MEDIANO',  90.00),
  ('LAV_MOTOR',    'GRANDE',   90.00)
) AS price(svc_code, size_code, amount)
  ON st.code = price.svc_code AND st.tenant_id = 1
  AND vs.code = price.size_code
ON CONFLICT (tenant_id, service_type_id, vehicle_size_id, currency, effective_from) DO NOTHING;

-- LAV_ASPIRADO — USD (direct from CORTE DOLARES reference sheet)
INSERT INTO service_prices (tenant_id, service_type_id, vehicle_size_id, amount, currency, effective_from)
SELECT 1, st.id, vs.id, price.amount, 'USD', '2026-01-01'
FROM service_types st
JOIN vehicle_sizes vs ON vs.tenant_id = 1
JOIN (VALUES
  ('LAV_ASPIRADO', 'CHICO',   5.00),
  ('LAV_ASPIRADO', 'SEDAN',   6.00),
  ('LAV_ASPIRADO', 'MEDIANO', 7.00),
  ('LAV_ASPIRADO', 'GRANDE',  8.00),
  ('LAV_EXTERIOR', 'CHICO',   4.00),
  ('LAV_EXTERIOR', 'SEDAN',   5.00),
  ('LAV_EXTERIOR', 'MEDIANO', 6.00),
  ('LAV_EXTERIOR', 'GRANDE',  7.00),
  ('ASPIRADO',     'CHICO',   3.00),
  ('ASPIRADO',     'SEDAN',   3.00),
  ('ASPIRADO',     'MEDIANO', 4.00),
  ('ASPIRADO',     'GRANDE',  4.00),
  ('PRESION',      'CHICO',   5.00),
  ('PRESION',      'SEDAN',   5.00),
  ('PRESION',      'MEDIANO', 5.00),
  ('PRESION',      'GRANDE',  5.00),
  ('LAV_MOTOR',    'CHICO',   4.00),
  ('LAV_MOTOR',    'SEDAN',   4.00),
  ('LAV_MOTOR',    'MEDIANO', 5.00),
  ('LAV_MOTOR',    'GRANDE',  5.00)
) AS price(svc_code, size_code, amount)
  ON st.code = price.svc_code AND st.tenant_id = 1
  AND vs.code = price.size_code
ON CONFLICT (tenant_id, service_type_id, vehicle_size_id, currency, effective_from) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Employee cleanup — deactivate single-occurrence typos
--    Real roster (≥3 tickets): ARTURO, ERASMO, CHORE, YUREM, VALE, CESAR,
--    LUPE, CRISTAL, HUGO, TAVO, MANUEL, REINA, PANCHO, NEMIAS, ARMANDO,
--    WENDY, WICHO, DAVID, PEDRO, ABELARDO, VICTOR, ELIZA, CRISTIAN,
--    RICARDO, JORGE, GUSTAVO, REYES, GUADALUPE, ARIANO, MAURICIO,
--    MATEO, VALERIO
-- ═══════════════════════════════════════════════════════════════════════

UPDATE employees
SET active = false
WHERE tenant_id = 1
  AND full_name IN (
    'JORGE,',       -- trailing comma typo → JORGE
    'ELIZABET',     -- alternate spelling → ELIZA
    'TAVOS',        -- typo → TAVO
    'RENA',         -- typo → REINA
    'ARMDO',        -- typo → ARMANDO
    'DAVIS',        -- typo → DAVID
    'ARTURO-CESAR', -- two people written as one
    'CORE',         -- typo → CHORE
    'ERASMNO',      -- typo → ERASMO
    'ERMO',         -- typo → ERASMO
    'CROISTAL',     -- typo → CRISTAL
    'CERSAR',       -- typo → CESAR
    'CSAR',         -- typo → CESAR
    'YUERM',        -- typo → YUREM
    'CRITAL',       -- typo → CRISTAL
    'CHOER',        -- typo → CHORE
    'RASMO',        -- typo → ERASMO
    'PONCHO',       -- alternate → PANCHO
    'MANUEKL',      -- typo → MANUEL
    'CRSTAL',       -- typo → CRISTAL
    'TURO',         -- typo → ARTURO
    'CLIENTE'       -- not an employee
  );
