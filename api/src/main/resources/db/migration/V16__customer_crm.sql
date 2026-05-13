-- Customer CRM: track repeat customers for loyalty and history.
-- No vehicle data stored to respect customer privacy.

CREATE TABLE customers (
  id             BIGSERIAL     PRIMARY KEY,
  tenant_id      BIGINT        NOT NULL DEFAULT 1,
  name           VARCHAR(120)  NOT NULL,
  phone          VARCHAR(20),
  notes          VARCHAR(500),
  loyalty_status VARCHAR(20)   NOT NULL DEFAULT 'REGULAR',
  active         BOOLEAN       NOT NULL DEFAULT TRUE,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT chk_customers_loyalty CHECK (loyalty_status IN ('REGULAR', 'VIP'))
);

CREATE INDEX idx_customers_active_name ON customers (tenant_id, active, name);
CREATE INDEX idx_customers_phone       ON customers (tenant_id, phone) WHERE phone IS NOT NULL;

ALTER TABLE tickets ADD COLUMN customer_id BIGINT REFERENCES customers(id);
CREATE INDEX idx_tickets_customer ON tickets (customer_id) WHERE customer_id IS NOT NULL;
