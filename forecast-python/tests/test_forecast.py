"""Tests for the Lavadero forecast service."""
from __future__ import annotations

import math
import os
import sys
from datetime import date, timedelta
from typing import List

import numpy as np
import pytest
from fastapi.testclient import TestClient

# Make sibling modules importable when running `pytest -q` from forecast-python/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))

from app import app  # noqa: E402
from model import (  # noqa: E402
    LGBM_PARAMS,
    build_feature_spec,
    build_training_frame,
    fit_model,
    recursive_predict,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_row(d: date, value: float, **overrides) -> dict:
    row = {
        "date": d.isoformat(),
        "value": value,
        "precip_mm": 0.0,
        "temp_max_c": 28.0,
        "temp_min_c": 18.0,
        "wind_max_kph": 12.0,
        "is_holiday": False,
        "day_before_holiday": False,
        "day_after_holiday": False,
        "is_quincena_post": False,
        "is_border_traffic_holiday": False,
        "holiday_name": None,
    }
    row.update(overrides)
    return row


def _make_horizon_row(d: date, **overrides) -> dict:
    row = _make_row(d, value=0.0, **overrides)
    row.pop("value", None)
    return row


def _synthetic_training(n_days: int = 120, start: date = date(2025, 1, 1),
                        rng_seed: int = 0) -> List[dict]:
    """Stable synthetic data with weekly seasonality + slow trend."""
    rng = np.random.default_rng(rng_seed)
    rows = []
    for i in range(n_days):
        d = start + timedelta(days=i)
        dow = d.weekday()
        base = 50 + 10 * math.sin(2 * math.pi * dow / 7) + 0.05 * i
        noise = rng.normal(0, 2)
        rows.append(_make_row(d, value=max(0.0, base + noise)))
    return rows


def _synthetic_horizon(n_days: int, start_after: date) -> List[dict]:
    return [_make_horizon_row(start_after + timedelta(days=i + 1)) for i in range(n_days)]


# ---------------------------------------------------------------------------
# 1) /health returns 200
# ---------------------------------------------------------------------------

def test_health_endpoint_returns_200():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# 2) /forecast returns predictions of the right shape
# ---------------------------------------------------------------------------

def test_forecast_endpoint_returns_correct_shape():
    client = TestClient(app)
    training = _synthetic_training(n_days=90)
    horizon_days = 7
    last = date.fromisoformat(training[-1]["date"])
    horizon = _synthetic_horizon(horizon_days, last)

    payload = {
        "snapshot_date": last.isoformat(),
        "horizon_days": horizon_days,
        "axis": "cars",
        "training": training,
        "horizon": horizon,
    }
    resp = client.post("/forecast", json=payload)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert "predictions" in body
    assert "model_version" in body
    assert "feature_importance" in body

    assert len(body["predictions"]) == horizon_days
    for p in body["predictions"]:
        assert set(p.keys()) == {"date", "predicted", "low", "high"}
        assert isinstance(p["predicted"], (int, float))
        assert p["low"] <= p["predicted"] <= p["high"]
        assert p["low"] >= 0.0

    assert body["model_version"].startswith("lgbm-1.0/")
    assert "/n=" in body["model_version"]
    assert "/depth=" in body["model_version"]
    assert "/sigma=" in body["model_version"]

    assert len(body["feature_importance"]) > 0
    for fi in body["feature_importance"]:
        assert "name" in fi and "gain" in fi


def test_forecast_rejects_too_few_training_rows():
    client = TestClient(app)
    training = _synthetic_training(n_days=10)
    last = date.fromisoformat(training[-1]["date"])
    horizon = _synthetic_horizon(3, last)
    payload = {
        "snapshot_date": last.isoformat(),
        "horizon_days": 3,
        "axis": "cars",
        "training": training,
        "horizon": horizon,
    }
    resp = client.post("/forecast", json=payload)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 3) Lag features correctly computed in feature builder
# ---------------------------------------------------------------------------

def test_lag_features_correctly_computed():
    training = _synthetic_training(n_days=40)
    spec = build_feature_spec(training)
    X, y = build_training_frame(training, spec)

    # First 14 rows have no lag_14/rolling_14, so they should be dropped.
    assert len(X) == len(training) - 14

    # The first surviving row corresponds to training index 14. Its lag_1 is the
    # value at index 13, lag_7 at index 7, lag_14 at index 0; rolling_7_mean is
    # the mean of indices 7..13 and rolling_14_mean the mean of indices 0..13.
    expected_lag_1 = training[13]["value"]
    expected_lag_7 = training[7]["value"]
    expected_lag_14 = training[0]["value"]
    expected_rolling_7 = float(np.mean([training[i]["value"] for i in range(7, 14)]))
    expected_rolling_14 = float(np.mean([training[i]["value"] for i in range(0, 14)]))

    assert X.iloc[0]["lag_1"] == pytest.approx(expected_lag_1)
    assert X.iloc[0]["lag_7"] == pytest.approx(expected_lag_7)
    assert X.iloc[0]["lag_14"] == pytest.approx(expected_lag_14)
    assert X.iloc[0]["rolling_7_mean"] == pytest.approx(expected_rolling_7)
    assert X.iloc[0]["rolling_14_mean"] == pytest.approx(expected_rolling_14)

    # y must equal the original training value at that row (index 14).
    assert y.iloc[0] == pytest.approx(training[14]["value"])


# ---------------------------------------------------------------------------
# 4) Chained recursive prediction uses prior predicted values
# ---------------------------------------------------------------------------

def test_recursive_prediction_uses_prior_predictions(monkeypatch):
    """Patch the model to record the lag_1 value seen on each horizon step."""
    training = _synthetic_training(n_days=60)
    fit = fit_model(training)

    seen_lag_1: List[float] = []
    returned_yhat: List[float] = []

    class _FakeModel:
        def predict(self, X):
            seen_lag_1.append(float(X.iloc[0]["lag_1"]))
            # Deterministic ramp so we can detect feedback.
            yhat = 100.0 + 10.0 * len(returned_yhat)
            returned_yhat.append(yhat)
            return np.array([yhat])

    fit.model = _FakeModel()
    fit.sigma = 0.0

    last = date.fromisoformat(training[-1]["date"])
    horizon = _synthetic_horizon(5, last)
    preds = recursive_predict(fit, training, horizon)

    assert len(preds) == 5
    # Day 1's lag_1 must equal the last actual training value.
    assert seen_lag_1[0] == pytest.approx(training[-1]["value"])
    # Days 2..N's lag_1 must equal the predicted value from the previous step.
    for i in range(1, 5):
        assert seen_lag_1[i] == pytest.approx(returned_yhat[i - 1]), (
            f"step {i} expected lag_1={returned_yhat[i-1]} got {seen_lag_1[i]}"
        )
    # And the surfaced predictions must match what the fake model returned.
    for p, yhat in zip(preds, returned_yhat):
        assert p["predicted"] == pytest.approx(yhat)


# ---------------------------------------------------------------------------
# 5) Rain-correlated drops show up in feature_importance
# ---------------------------------------------------------------------------

def test_rain_signal_appears_in_feature_importance():
    """Training data where rainy days slash value should give precip non-zero gain."""
    rng = np.random.default_rng(42)
    rows: List[dict] = []
    start = date(2025, 1, 1)
    for i in range(180):
        d = start + timedelta(days=i)
        dow = d.weekday()
        base = 60 + 8 * math.sin(2 * math.pi * dow / 7)
        # 25% of days rain hard; rain crushes the value.
        is_rainy = rng.random() < 0.25
        precip = float(rng.uniform(5, 25)) if is_rainy else 0.0
        value = base - 0.8 * precip + rng.normal(0, 1.5)
        rows.append(_make_row(d, value=max(0.0, value), precip_mm=precip))

    fit = fit_model(rows)
    importances = dict(fit.feature_importance)

    # precip_mm must be present and have positive gain.
    assert "precip_mm" in importances
    assert importances["precip_mm"] > 0.0

    # Compare against a typically-low-signal feature: wind_max_kph stays at 12
    # for all rows (constant), so the model should rely on precip far more.
    assert importances["precip_mm"] > importances.get("wind_max_kph", 0.0)


# ---------------------------------------------------------------------------
# Sanity: hyperparameters match spec
# ---------------------------------------------------------------------------

def test_lgbm_hyperparameters_match_spec():
    assert LGBM_PARAMS["n_estimators"] == 200
    assert LGBM_PARAMS["max_depth"] == 4
    assert LGBM_PARAMS["learning_rate"] == 0.05
    assert LGBM_PARAMS["num_leaves"] == 15
    assert LGBM_PARAMS["min_data_in_leaf"] == 10
    assert LGBM_PARAMS["reg_alpha"] == 0.1
    assert LGBM_PARAMS["reg_lambda"] == 0.1
    assert LGBM_PARAMS["random_state"] == 42
