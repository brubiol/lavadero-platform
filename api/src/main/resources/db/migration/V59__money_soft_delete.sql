-- Soft-delete for the three money ledgers so cashiers can fix typos in
-- gastos/retiros/préstamos without losing the audit trail. Per CLAUDE.md,
-- soft-delete via `deleted_at` instead of physical DELETE.
ALTER TABLE expenses
  ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE withdrawals
  ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE employee_advances
  ADD COLUMN deleted_at TIMESTAMPTZ;
