CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(40),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_tenant_active ON employees (tenant_id, active);

CREATE TABLE service_types (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_service_types_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE vehicle_sizes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_vehicle_sizes_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE service_prices (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  service_type_id BIGINT NOT NULL REFERENCES service_types(id),
  vehicle_size_id BIGINT NOT NULL REFERENCES vehicle_sizes(id),
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_service_prices_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_service_prices_effective_range CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT uq_service_prices_start UNIQUE (tenant_id, service_type_id, vehicle_size_id, effective_from)
);

CREATE INDEX idx_service_prices_effective
  ON service_prices (tenant_id, service_type_id, vehicle_size_id, effective_from, effective_to);

CREATE TABLE business_days (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  business_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_business_days_status CHECK (status IN ('OPEN', 'CLOSED', 'LOCKED')),
  CONSTRAINT uq_business_days_tenant_date UNIQUE (tenant_id, business_date)
);

CREATE TABLE shifts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  business_day_id BIGINT NOT NULL REFERENCES business_days(id),
  shift_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_shifts_type CHECK (shift_type IN ('MATUTINO', 'VESPERTINO')),
  CONSTRAINT chk_shifts_status CHECK (status IN ('OPEN', 'CLOSED')),
  CONSTRAINT uq_shifts_business_day_type UNIQUE (tenant_id, business_day_id, shift_type)
);

CREATE INDEX idx_shifts_business_day ON shifts (tenant_id, business_day_id);
