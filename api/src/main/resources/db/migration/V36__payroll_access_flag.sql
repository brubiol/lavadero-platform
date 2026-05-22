-- V36: Add payroll_access flag to app_users.
-- Allows a GERENTE account to be blocked from payroll without changing their role.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS payroll_access BOOLEAN NOT NULL DEFAULT TRUE;

-- Reina Gabiño Maza manages the afternoon shift but does not handle nómina.
UPDATE app_users SET payroll_access = FALSE WHERE username = 'reina.gabino' AND tenant_id = 1;
