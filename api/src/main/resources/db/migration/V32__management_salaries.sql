-- V32: Correct management salaries and add rest-day / absence payroll mechanics.
--
-- Source: WhatsApp from Carlos R. (encargado) on 2026-05-20. The V19/V25
-- numbers were stale estimates from old nomina PDFs.
--
--   Carlos R. : $2,400/wk (6 days). Working his rest day pays the daily rate
--               ($400) plus a $200 premium.
--   Reina     : $2,200/wk. Working her rest day pays one daily rate ($366),
--               no premium.
--   Yurem     : $1,500/wk ($250/day). Each absence loses the day's pay and a
--               fixed $240 penalty.
--   Tia Gabi  : $400/wk flat, not previously in the system.

ALTER TABLE employees
    ADD COLUMN rest_day_premium    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN absence_day_penalty NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE employees
    ADD CONSTRAINT chk_employees_rest_day_premium_non_negative CHECK (rest_day_premium >= 0),
    ADD CONSTRAINT chk_employees_absence_day_penalty_non_negative CHECK (absence_day_penalty >= 0);

UPDATE employees
SET base_weekly_salary = 2400.00,
    rest_day_premium   = 200.00,
    payroll_type       = 'SALARY'
WHERE tenant_id = 1 AND full_name = 'CARLOS R.';

UPDATE employees
SET base_weekly_salary = 2200.00,
    payroll_type       = 'SALARY'
WHERE tenant_id = 1 AND full_name = 'REINA';

UPDATE employees
SET base_weekly_salary  = 1500.00,
    absence_day_penalty = 240.00,
    payroll_type        = 'SALARY'
WHERE tenant_id = 1 AND full_name = 'YUREM';

INSERT INTO employees (tenant_id, full_name, active, base_weekly_salary, payroll_type,
                       commission_rate, productivity_bonus_rate)
SELECT 1, 'TIA GABI', true, 400.00, 'SALARY', 0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE tenant_id = 1 AND full_name = 'TIA GABI');
