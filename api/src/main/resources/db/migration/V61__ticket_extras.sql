-- Structured ticket add-ons (extras). Previously an extra (Encerado, Lavado de
-- Motor, …) only folded its catalog price into price_override and dropped a
-- "+ Encerado" text marker into notes, so the ticket detail view could not show
-- the real price math. Persist each extra as its own line with a name + amount
-- snapshot (server-resolved at capture) so the breakdown is reconstructable and
-- robust to later catalog price changes. Child of tickets, replaced wholesale on
-- edit (same lifecycle as ticket_assignments).
CREATE TABLE ticket_extras (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id),
  service_type_id BIGINT NOT NULL REFERENCES service_types(id),
  name VARCHAR(120) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ticket_extras_amount CHECK (amount >= 0)
);

CREATE INDEX idx_ticket_extras_ticket
  ON ticket_extras (tenant_id, ticket_id);
