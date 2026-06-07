-- V60: Discounts catalog.
-- Pre-defined, manager-configured discounts that replace ad-hoc per-ticket
-- discount entry. A discount may turn on automatically at the start of an
-- applicable shift, or be applied by a manager to a single ticket. Cashiers
-- never set discounts during capture.
CREATE TABLE discounts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  days_label VARCHAR(200) NOT NULL DEFAULT '',
  apply_at_shift_start BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  uses_this_month INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(20) NOT NULL DEFAULT 'warn',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_discounts_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT chk_discounts_percent CHECK (percent >= 0 AND percent <= 100)
);

-- Seed the catalog with the owner's real promos (from the design).
INSERT INTO discounts (tenant_id, code, name, percent, days_label, apply_at_shift_start, active, uses_this_month, color) VALUES
  (1, 'LUN15',  'Lunes de descuento',       15, 'LUN',                         true,  true,  142, 'warn'),
  (1, 'FREC10', 'Cliente frecuente',        10, 'LUN,MAR,MIE,JUE,VIE,SAB,DOM', false, true,  89,  'purple'),
  (1, 'ANIV20', 'Aniversario del lavadero', 20, '12 MAY',                      false, true,  36,  'good'),
  (1, 'CUMP15', 'Cumpleaños del cliente',   15, 'Por cumpleaños',              false, true,  24,  'info'),
  (1, 'MIE10',  'Miércoles familiar',       10, 'MIE',                         true,  false, 0,   'warn'),
  (1, 'VERANO', 'Promo de verano',          12, 'Jun - Ago',                   false, false, 0,   'amber')
ON CONFLICT ON CONSTRAINT uq_discounts_tenant_code DO NOTHING;
