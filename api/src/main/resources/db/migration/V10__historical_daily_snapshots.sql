CREATE TABLE historical_daily_snapshots (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   BIGINT NOT NULL DEFAULT 1,
  snapshot_date DATE NOT NULL,
  total_cars  INTEGER,
  revenue_mxn NUMERIC(12, 2),
  expenses_mxn NUMERIC(12, 2),
  resultado_mxn NUMERIC(12, 2),
  source      VARCHAR(20) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_historical_snapshots_tenant_date UNIQUE (tenant_id, snapshot_date)
);

CREATE INDEX idx_historical_snapshots_date
  ON historical_daily_snapshots (tenant_id, snapshot_date);
