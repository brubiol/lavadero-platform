-- Adds the per-day weather expectations used by the weather-adjusted forecaster.
-- Nullable because pre-weather forecast rows must stay readable as-is.

ALTER TABLE daily_forecast
  ADD COLUMN expected_precipitation_mm NUMERIC(6, 2),
  ADD COLUMN expected_temp_max_c NUMERIC(4, 1);
