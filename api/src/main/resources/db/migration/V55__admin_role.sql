-- Add ADMIN role above DUENO for the engineer/owner-son account.
-- ADMIN inherits all DUENO capabilities and gates in-development features.
alter table app_users drop constraint chk_app_users_role;
alter table app_users add constraint chk_app_users_role
  check (role in ('OPERADOR', 'GERENTE', 'DUENO', 'ADMIN'));
