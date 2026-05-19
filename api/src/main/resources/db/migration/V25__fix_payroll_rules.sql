-- V25: Fix payroll rules that were wrong in V19.
--
-- Corrections sourced from NOMINA.xlsx (Jan–Feb 2026 filled sheets):
--
-- 1. CESAR, VALERIO, HUGO, GUSTAVO were left on the SALARY default ($0 + $10/carro)
--    but the EMPLEDOS template clearly lists them as COMISION workers ($30/carro).
--
-- 2. CARLOS R.: seeded at $2,800/week but NOMINA shows $266/day × 7 = $1,866 base
--    + $134 commission = $2,000/week consistently across all Jan–Feb sheets.
--
-- 3. REINA: seeded at $2,564 base but NOMINA shows $250/day × 7 = $1,750 base.
--    Per-car bonus was $28.56 but actual NOMINA bonus averages ~$17/carro.

-- Fix 1: Commission workers that were missed in V19
UPDATE employees
SET payroll_type           = 'COMMISSION',
    commission_rate        = 30.00,
    base_weekly_salary     = 0.00,
    productivity_bonus_rate = 0.00
WHERE tenant_id = 1
  AND full_name IN ('CESAR', 'VALERIO', 'HUGO', 'GUSTAVO');

-- Fix 2: Carlos R. weekly base $2,800 → $2,000
UPDATE employees
SET base_weekly_salary = 2000.00
WHERE tenant_id = 1
  AND full_name = 'CARLOS R.';

-- Fix 3: Reina base $2,564 → $1,750, per-car bonus $28.56 → $17.00
UPDATE employees
SET base_weekly_salary      = 1750.00,
    productivity_bonus_rate = 17.00
WHERE tenant_id = 1
  AND full_name = 'REINA';
