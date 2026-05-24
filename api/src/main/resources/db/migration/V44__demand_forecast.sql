-- Demand forecasting: 7-day rolling predictions for cars and revenue.
-- Append-only by (snapshot_date, horizon_date) so historical accuracy can be backtested.

CREATE TABLE daily_forecast (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  snapshot_date DATE NOT NULL,
  horizon_date DATE NOT NULL,
  predicted_cars INTEGER NOT NULL,
  predicted_cars_low INTEGER NOT NULL,
  predicted_cars_high INTEGER NOT NULL,
  predicted_revenue_mxn NUMERIC(12, 2) NOT NULL,
  predicted_revenue_mxn_low NUMERIC(12, 2) NOT NULL,
  predicted_revenue_mxn_high NUMERIC(12, 2) NOT NULL,
  model_version VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_forecast_snapshot_horizon UNIQUE (tenant_id, snapshot_date, horizon_date),
  CONSTRAINT chk_daily_forecast_horizon_after_snapshot CHECK (horizon_date >= snapshot_date),
  CONSTRAINT chk_daily_forecast_cars_band CHECK (predicted_cars_low <= predicted_cars AND predicted_cars <= predicted_cars_high),
  CONSTRAINT chk_daily_forecast_revenue_band CHECK (predicted_revenue_mxn_low <= predicted_revenue_mxn AND predicted_revenue_mxn <= predicted_revenue_mxn_high)
);

CREATE INDEX idx_daily_forecast_snapshot ON daily_forecast (tenant_id, snapshot_date DESC);
CREATE INDEX idx_daily_forecast_horizon ON daily_forecast (tenant_id, horizon_date);

-- Extend ai_insights.feature_type to allow DEMAND_FORECAST rows from the forecaster.
ALTER TABLE ai_insights DROP CONSTRAINT chk_ai_insights_feature_type;
ALTER TABLE ai_insights ADD CONSTRAINT chk_ai_insights_feature_type CHECK (feature_type IN (
  'DAILY_BRIEF',
  'ANOMALY_ALERT',
  'MONTHLY_ADVISOR',
  'ANALYST_CHAT',
  'AGENT_INVESTIGATION',
  'DEMAND_FORECAST'
));
