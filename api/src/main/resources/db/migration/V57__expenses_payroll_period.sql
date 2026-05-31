-- Link auto-generated nomina expenses back to their payroll period so they can
-- be replaced on recompute without touching manually-entered NOMINA gastos.
ALTER TABLE expenses
  ADD COLUMN payroll_period_id BIGINT REFERENCES payroll_periods(id);

CREATE INDEX idx_expenses_payroll_period
  ON expenses (tenant_id, payroll_period_id);
