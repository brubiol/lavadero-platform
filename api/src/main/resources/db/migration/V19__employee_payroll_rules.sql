alter table employees
  add column payroll_type varchar(20) not null default 'SALARY',
  add column commission_rate numeric(10, 2) not null default 30.00,
  add column productivity_bonus_rate numeric(10, 2) not null default 10.00,
  add constraint chk_employees_payroll_type check (payroll_type in ('SALARY', 'COMMISSION')),
  add constraint chk_employees_commission_rate_non_negative check (commission_rate >= 0),
  add constraint chk_employees_productivity_bonus_rate_non_negative check (productivity_bonus_rate >= 0);

-- Defaults inferred from the April/May 2026 nomina PDFs.
-- Commission workers are paid per car; sueldo workers keep a weekly base and optional productivity bonus.
UPDATE employees
SET payroll_type = 'COMMISSION',
    commission_rate = 30.00,
    base_weekly_salary = 0.00,
    productivity_bonus_rate = 0.00
WHERE tenant_id = 1
  AND full_name IN (
    'CRISTAL',
    'ERASMO',
    'ARTURO',
    'VALE',
    'CHORE',
    'PANCHO',
    'MANUEL',
    'WICHO',
    'TAVO',
    'DAVID',
    'CRISTIAN',
    'RICARDO'
  );

UPDATE employees
SET payroll_type = 'SALARY',
    base_weekly_salary = rules.base_weekly_salary,
    productivity_bonus_rate = rules.productivity_bonus_rate
FROM (VALUES
  ('YUREM',     1730.00, 11.93),
  ('WENDY',      790.20, 30.39),
  ('LUPE',      1254.20, 23.66),
  ('REINA',     2564.00, 28.56),
  ('CARLOS R.', 2800.00,  0.00)
) AS rules(full_name, base_weekly_salary, productivity_bonus_rate)
WHERE employees.tenant_id = 1
  AND employees.full_name = rules.full_name;
