-- Daily weather aggregates from Open-Meteo. One row per (tenant, date) — actuals
-- overwrite forecasts as days pass. Feeds the weather-adjusted demand forecaster.

CREATE TABLE daily_weather (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL DEFAULT 1,
  snapshot_date DATE NOT NULL,
  precipitation_mm NUMERIC(6, 2) NOT NULL,
  temp_max_c NUMERIC(4, 1) NOT NULL,
  temp_min_c NUMERIC(4, 1) NOT NULL,
  wind_max_kph NUMERIC(5, 1),
  source VARCHAR(20) NOT NULL,
  observed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_weather_date UNIQUE (tenant_id, snapshot_date),
  CONSTRAINT chk_daily_weather_source CHECK (source IN ('ARCHIVE', 'FORECAST', 'MANUAL'))
);

CREATE INDEX idx_daily_weather_date ON daily_weather (tenant_id, snapshot_date DESC);
