-- Seed the three permanent accounts for tenant 1 (Lavadero Familiar).
-- Default password for all three: Lavado2026!
-- Each user must change their password on first login.
--
-- Roles:
--   DUENO   = owner (read-everything, AI dashboard)
--   GERENTE = encargado (shift manager, submits daily sheet)
--   OPERADOR = washer / cashier

INSERT INTO app_users (tenant_id, username, full_name, password_hash, role)
VALUES
    -- Developer / super admin: Brandon Rubio
    (1, 'brandonrubio1001@gmail.com', 'Brandon Rubio',
     '$2a$10$25teX15zkjP93KTZsJFrFexKY1iILwzKRqV3Pd5BtODKpDq07Snwy',
     'DUENO'),

    -- Dueño: Eric Rubio (Brandon's dad)
    (1, 'ing.eric.rubio@gmail.com', 'Eric Rubio',
     '$2a$10$ygvRlYogJaHWpcsBYwdqpuLbUgdb4/xXK2jwXXHMKkeXKfDruI2C.',
     'DUENO'),

    -- Encargado mañana (7am–4:30pm): Carlos Reynaldo Rodriguez Hernandez
    (1, 'Cr2-h@outlook.com', 'Carlos Reynaldo Rodriguez Hernandez',
     '$2a$10$O7rKcSuttOhnVytXO8vmwOo3YVHcZQfACImJRAjqB1fcuWCPSL9uS',
     'GERENTE'),

    -- Encargada tarde (4pm–10pm): Reina Gabiño Maza
    -- No email on file yet — username is a placeholder; update when known
    (1, 'reina.gabino', 'Reina Gabiño Maza',
     '$2a$10$mQYfDfRet9odk5SvLcG2S.Z7xuEJLryWkp3JejBaAuzRbg9vMM53G',
     'GERENTE');
