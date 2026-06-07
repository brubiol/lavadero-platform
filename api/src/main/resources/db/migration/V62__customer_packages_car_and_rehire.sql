-- Three related additions:
--   1. Car on file for a customer (size + free-text description) so we can tell
--      whether the car in front of us matches what they usually bring — and in
--      particular whether it is bigger than the size their prepaid package covers.
--   2. Customer-owned prepaid packages: a customer buys N washes at a locked
--      service + vehicle size; each visit burns one. Unlike prepaid_packages
--      (a shift-level sale record), these carry a remaining balance and a size
--      lock, and a ticket points back at the package it redeemed.
--   3. A do-not-rehire ("bad") flag on employees so a washer who left on bad
--      terms is remembered if they come back.

-- 1. Car on file --------------------------------------------------------------
ALTER TABLE customers ADD COLUMN vehicle_size_id BIGINT REFERENCES vehicle_sizes(id);
ALTER TABLE customers ADD COLUMN vehicle_description VARCHAR(160);

-- 3. Do-not-rehire flag -------------------------------------------------------
ALTER TABLE employees ADD COLUMN do_not_rehire BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN do_not_rehire_note VARCHAR(500);

-- 2. Customer prepaid packages ------------------------------------------------
CREATE TABLE customer_packages (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT        NOT NULL DEFAULT 1,
  customer_id     BIGINT        NOT NULL REFERENCES customers(id),
  service_type_id BIGINT        NOT NULL REFERENCES service_types(id),
  vehicle_size_id BIGINT        NOT NULL REFERENCES vehicle_sizes(id),
  washes_total    INTEGER       NOT NULL,
  washes_used     INTEGER       NOT NULL DEFAULT 0,
  unit_price      NUMERIC(10, 2) NOT NULL,
  amount_paid     NUMERIC(12, 2) NOT NULL,
  currency        VARCHAR(3)    NOT NULL DEFAULT 'MXN',
  payment_method  VARCHAR(20)   NOT NULL DEFAULT 'CASH',
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  notes           VARCHAR(500),
  purchased_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT chk_customer_packages_total CHECK (washes_total > 0),
  CONSTRAINT chk_customer_packages_used CHECK (washes_used >= 0 AND washes_used <= washes_total)
);

CREATE INDEX idx_customer_packages_customer
  ON customer_packages (tenant_id, customer_id, status);

-- Link a redeeming ticket back to the package it drew from.
ALTER TABLE tickets ADD COLUMN customer_package_id BIGINT REFERENCES customer_packages(id);
