ALTER TABLE service_prices
  DROP CONSTRAINT uq_service_prices_start;

ALTER TABLE service_prices
  ADD CONSTRAINT uq_service_prices_start_currency
  UNIQUE (tenant_id, service_type_id, vehicle_size_id, currency, effective_from);

CREATE TABLE tickets (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  business_day_id BIGINT NOT NULL REFERENCES business_days(id),
  shift_id BIGINT NOT NULL REFERENCES shifts(id),
  service_type_id BIGINT NOT NULL REFERENCES service_types(id),
  vehicle_size_id BIGINT NOT NULL REFERENCES vehicle_sizes(id),
  daily_seq INTEGER NOT NULL,
  nota_number VARCHAR(40) NOT NULL,
  vehicle_description VARCHAR(160),
  price_amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  courtesy BOOLEAN NOT NULL DEFAULT false,
  courtesy_reason VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  void_reason VARCHAR(500),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_tickets_currency CHECK (currency IN ('MXN', 'USD')),
  CONSTRAINT chk_tickets_status CHECK (status IN ('ACTIVE', 'VOIDED')),
  CONSTRAINT chk_tickets_price_non_negative CHECK (price_amount >= 0),
  CONSTRAINT chk_tickets_courtesy_reason CHECK (courtesy = false OR courtesy_reason IS NOT NULL),
  CONSTRAINT chk_tickets_void_reason CHECK (status <> 'VOIDED' OR void_reason IS NOT NULL),
  CONSTRAINT uq_tickets_business_day_daily_seq UNIQUE (tenant_id, business_day_id, daily_seq),
  CONSTRAINT uq_tickets_nota_number UNIQUE (tenant_id, nota_number)
);

CREATE INDEX idx_tickets_business_shift_status
  ON tickets (tenant_id, business_day_id, shift_id, status);

CREATE TABLE ticket_assignments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id),
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  share_pct NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ticket_assignments_share CHECK (share_pct > 0 AND share_pct <= 100),
  CONSTRAINT uq_ticket_assignments_ticket_employee UNIQUE (tenant_id, ticket_id, employee_id)
);

CREATE INDEX idx_ticket_assignments_employee
  ON ticket_assignments (tenant_id, employee_id);
