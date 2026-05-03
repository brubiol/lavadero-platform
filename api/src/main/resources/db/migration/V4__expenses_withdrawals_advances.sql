CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  business_day_id BIGINT REFERENCES business_days(id),
  shift_id BIGINT REFERENCES shifts(id),
  expense_date DATE NOT NULL,
  category VARCHAR(40) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_expenses_category CHECK (category IN (
    'CFE',
    'TELMEX',
    'BASURA',
    'NOMINA',
    'MATERIAL',
    'GARRAFON_DE_AGUA',
    'TAXI',
    'COMISION_DEPOSITO',
    'OTHER'
  ))
);

CREATE INDEX idx_expenses_date_category
  ON expenses (tenant_id, expense_date, category);

CREATE TABLE withdrawals (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  business_day_id BIGINT REFERENCES business_days(id),
  shift_id BIGINT REFERENCES shifts(id),
  withdrawal_date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_withdrawals_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_withdrawals_date
  ON withdrawals (tenant_id, withdrawal_date);

CREATE TABLE employee_advances (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  business_day_id BIGINT REFERENCES business_days(id),
  shift_id BIGINT REFERENCES shifts(id),
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  advance_date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  reason VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_employee_advances_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_employee_advances_employee_date
  ON employee_advances (tenant_id, employee_id, advance_date);
