# Lavadero Forecast Service (Python)

Stateless Python microservice that fits a LightGBM gradient-boosted regression
model on training rows provided by the Java Spring backend and returns
predictions for a short forecast horizon (1-14 days). No database, no on-disk
state, no in-memory model cache — every `/forecast` call trains a fresh model.

## HTTP contract

- `GET /health` -> `{"status": "ok"}`
- `POST /forecast` — see `schemas.py` for the request/response shape.
  - Requires at least 30 training rows.
  - `horizon_days` must equal `len(horizon)` and be between 1 and 14.

## Local development

```bash
cd lavadero-api/forecast-python
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run tests
pytest -q

# Run dev server (auto-reload)
uvicorn app:app --host 0.0.0.0 --port 8081 --reload
```

Then `curl http://localhost:8081/health` should return `{"status":"ok"}`.

## Docker

```bash
cd lavadero-api/forecast-python
docker build -t lavadero-forecast .
docker run --rm -p 8081:8081 lavadero-forecast
```

The container honours the `PORT` env var (defaults to `8081`).

## Feature engineering (done inside Python)

The Java client sends raw daily rows; this service derives:

- `lag_1`, `lag_7`, `rolling_7_mean` (rolling mean ending at the prior day)
- Day-of-year sin/cos for smooth seasonality
- `day_of_week` (0-6) and `month` (1-12)
- `days_since_rain` counter that resets on days with `precip_mm >= 1`
- One binary column per top-7 most-frequent `holiday_name` value in the
  training set, plus the generic `is_holiday` flag for everything else
- Weather + holiday booleans passed through as 0/1 features

## Model

`lightgbm.LGBMRegressor` with:

| param              | value |
| ------------------ | ----- |
| `n_estimators`     | 200   |
| `max_depth`        | 4     |
| `learning_rate`    | 0.05  |
| `num_leaves`       | 15    |
| `min_data_in_leaf` | 10    |
| `reg_alpha`        | 0.1   |
| `reg_lambda`       | 0.1   |
| `random_state`     | 42    |

The last 20% of training rows act as an internal validation tail for early
stopping (`stopping_rounds=20`). The residual std on that tail becomes the
`sigma` used for the `low`/`high` prediction interval (`+/- 1.96 * sigma`,
floored at 0).

## Recursive horizon prediction

Day 1 uses `lag_1 = last training day's value`. Each subsequent day's `lag_1`
becomes the prior day's predicted value. `lag_7` and `rolling_7_mean` are
sourced from the combined `[training tail | already-predicted days]` series.
Compound error grows with the horizon; we keep horizons short (<=14 days).

## Resource budget

Designed for `t3.micro` (1 GB total, shared). LightGBM with 200 trees on
~500 rows fits comfortably under 350 MB RSS for the Python process.
