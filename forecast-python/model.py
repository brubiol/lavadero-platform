"""Feature engineering + LightGBM training/prediction for the forecast service.

The service is stateless: each /forecast request fits a fresh model on the
training rows that the caller provides, then performs chained recursive
prediction across the requested horizon.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import lightgbm as lgb
import numpy as np
import pandas as pd

# LightGBM hyperparameters (kept in module scope so callers/tests can inspect).
LGBM_PARAMS: Dict[str, object] = {
    "n_estimators": 200,
    "max_depth": 4,
    "learning_rate": 0.05,
    "num_leaves": 15,
    "min_data_in_leaf": 10,
    "reg_alpha": 0.1,
    "reg_lambda": 0.1,
    "random_state": 42,
    "verbosity": -1,
}

MODEL_VERSION_PREFIX = "lgbm-1.0"

# Columns from the request rows that are direct numeric/boolean features.
BASE_EXOG_COLUMNS: Tuple[str, ...] = (
    "precip_mm",
    "temp_max_c",
    "temp_min_c",
    "wind_max_kph",
    "is_holiday",
    "day_before_holiday",
    "day_after_holiday",
    "is_quincena_post",
    "is_border_traffic_holiday",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(name: str) -> str:
    """Turn a holiday name into a safe column suffix (lowercase, underscores)."""
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = s.strip("_")
    return s or "unknown"


def top_holiday_names(rows: List[dict], top_k: int = 7) -> List[str]:
    """Return up to `top_k` most-frequent non-null holiday_name values in training."""
    counter: Counter = Counter()
    for r in rows:
        name = r.get("holiday_name")
        if name:
            counter[name] += 1
    return [name for name, _ in counter.most_common(top_k)]


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

@dataclass
class FeatureSpec:
    """Captures the per-request feature schema chosen at fit-time."""

    top_holidays: List[str]              # list of original holiday names
    holiday_feature_names: List[str]     # ["is_<slug>", ...] in order
    holiday_slugs_by_name: Dict[str, str]  # original name -> slug
    feature_columns: List[str]           # final ordered list of columns

    def holiday_column_for(self, name: Optional[str]) -> Optional[str]:
        if not name:
            return None
        slug = self.holiday_slugs_by_name.get(name)
        if slug is None:
            return None
        return f"is_{slug}"


def build_feature_spec(training_rows: List[dict]) -> FeatureSpec:
    """Decide which holiday-specific columns to add based on training frequency."""
    top = top_holiday_names(training_rows, top_k=7)
    slugs = {name: _slugify(name) for name in top}
    holiday_cols = [f"is_{slugs[name]}" for name in top]

    feature_columns = [
        "lag_1",
        "lag_7",
        "rolling_7_mean",
        "day_of_year_sin",
        "day_of_year_cos",
        "day_of_week",
        "month",
        "days_since_rain",
        *BASE_EXOG_COLUMNS,
        *holiday_cols,
    ]
    return FeatureSpec(
        top_holidays=top,
        holiday_feature_names=holiday_cols,
        holiday_slugs_by_name=slugs,
        feature_columns=feature_columns,
    )


def _to_dataframe(rows: List[dict]) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])
    return df.sort_values("date").reset_index(drop=True) if "date" in df.columns else df


def _compute_days_since_rain(precip: pd.Series) -> pd.Series:
    """Counter resets to 0 on rainy days (precip >= 1), otherwise +1 per day."""
    out = np.zeros(len(precip), dtype=np.int64)
    counter = 0
    for i, p in enumerate(precip.to_numpy()):
        if p >= 1.0:
            counter = 0
        else:
            counter += 1
        out[i] = counter
    return pd.Series(out, index=precip.index, name="days_since_rain")


def _add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add day-of-year sin/cos, day-of-week int, month int (in place-friendly)."""
    doy = df["date"].dt.dayofyear.to_numpy()
    df["day_of_year_sin"] = np.sin(2 * math.pi * doy / 365.0)
    df["day_of_year_cos"] = np.cos(2 * math.pi * doy / 365.0)
    df["day_of_week"] = df["date"].dt.dayofweek.astype(int)
    df["month"] = df["date"].dt.month.astype(int)
    return df


def _add_holiday_dummies(df: pd.DataFrame, spec: FeatureSpec) -> pd.DataFrame:
    for col in spec.holiday_feature_names:
        df[col] = 0
    if "holiday_name" in df.columns:
        for idx, name in df["holiday_name"].items():
            col = spec.holiday_column_for(name if pd.notna(name) else None)
            if col is not None:
                df.at[idx, col] = 1
    return df


def _coerce_booleans(df: pd.DataFrame) -> pd.DataFrame:
    for col in BASE_EXOG_COLUMNS:
        if col in df.columns and df[col].dtype == bool:
            df[col] = df[col].astype(int)
    return df


def build_training_frame(
    training_rows: List[dict], spec: FeatureSpec
) -> Tuple[pd.DataFrame, pd.Series]:
    """Return (X, y) for training. Drops rows whose lag features can't be computed."""
    df = _to_dataframe(training_rows)
    df = _add_calendar_features(df)
    df = _add_holiday_dummies(df, spec)
    df = _coerce_booleans(df)

    df["days_since_rain"] = _compute_days_since_rain(df["precip_mm"])
    df["lag_1"] = df["value"].shift(1)
    df["lag_7"] = df["value"].shift(7)
    # rolling 7-day mean ending at the prior day -> shift the rolling mean by 1
    df["rolling_7_mean"] = df["value"].shift(1).rolling(window=7, min_periods=7).mean()

    df = df.dropna(subset=["lag_1", "lag_7", "rolling_7_mean"]).reset_index(drop=True)

    X = df[spec.feature_columns].astype(float)
    y = df["value"].astype(float)
    return X, y


def _row_to_feature_dict(
    row: dict,
    spec: FeatureSpec,
    lag_1: float,
    lag_7: float,
    rolling_7_mean: float,
    days_since_rain: int,
) -> Dict[str, float]:
    """Convert one horizon dict + computed lags into the model's feature vector."""
    d = pd.Timestamp(row["date"])
    doy = d.dayofyear
    feats: Dict[str, float] = {
        "lag_1": float(lag_1),
        "lag_7": float(lag_7),
        "rolling_7_mean": float(rolling_7_mean),
        "day_of_year_sin": math.sin(2 * math.pi * doy / 365.0),
        "day_of_year_cos": math.cos(2 * math.pi * doy / 365.0),
        "day_of_week": int(d.dayofweek),
        "month": int(d.month),
        "days_since_rain": int(days_since_rain),
    }
    for col in BASE_EXOG_COLUMNS:
        v = row.get(col, 0)
        feats[col] = float(int(v)) if isinstance(v, bool) else float(v or 0.0)
    for col in spec.holiday_feature_names:
        feats[col] = 0.0
    hc = spec.holiday_column_for(row.get("holiday_name"))
    if hc is not None:
        feats[hc] = 1.0
    return feats


# ---------------------------------------------------------------------------
# Model fit + recursive predict
# ---------------------------------------------------------------------------

@dataclass
class FitResult:
    model: lgb.LGBMRegressor
    spec: FeatureSpec
    sigma: float
    n_train_rows: int
    feature_importance: List[Tuple[str, float]]

    @property
    def model_version(self) -> str:
        return (
            f"{MODEL_VERSION_PREFIX}"
            f"/n={self.n_train_rows}"
            f"/depth={LGBM_PARAMS['max_depth']}"
            f"/sigma={self.sigma:.1f}"
        )


def fit_model(training_rows: List[dict]) -> FitResult:
    """Fit a LightGBM regressor with an internal validation tail for early stopping."""
    spec = build_feature_spec(training_rows)
    X, y = build_training_frame(training_rows, spec)
    if len(X) < 10:
        raise ValueError(
            f"Not enough training rows after lag computation ({len(X)} < 10)."
        )

    # Last 20% as validation tail
    split = max(1, int(len(X) * 0.8))
    X_train, X_val = X.iloc[:split], X.iloc[split:]
    y_train, y_val = y.iloc[:split], y.iloc[split:]

    model = lgb.LGBMRegressor(**LGBM_PARAMS)
    if len(X_val) >= 2:
        model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)],
        )
        val_pred = model.predict(X_val)
        residuals = y_val.to_numpy() - val_pred
        sigma = float(np.std(residuals)) if len(residuals) >= 2 else 0.0
    else:
        model.fit(X_train, y_train)
        sigma = 0.0

    # Gain importance, sorted desc
    importances = model.booster_.feature_importance(importance_type="gain")
    names = list(X.columns)
    paired = sorted(zip(names, importances), key=lambda kv: kv[1], reverse=True)
    feature_importance = [(name, float(gain)) for name, gain in paired]

    return FitResult(
        model=model,
        spec=spec,
        sigma=sigma,
        n_train_rows=len(X),
        feature_importance=feature_importance,
    )


def recursive_predict(
    fit: FitResult,
    training_rows: List[dict],
    horizon_rows: List[dict],
) -> List[Dict[str, float]]:
    """Predict each horizon day in sequence, feeding earlier predictions forward."""
    if not horizon_rows:
        return []

    # Build the time-ordered history we use to source lag_1, lag_7, rolling means.
    train_df = _to_dataframe(training_rows)
    history_values: List[float] = train_df["value"].astype(float).tolist()
    history_precip: List[float] = train_df["precip_mm"].astype(float).tolist()

    # days_since_rain state, continued from training tail
    if len(history_precip) > 0:
        days_since = 0
        for p in history_precip:
            days_since = 0 if p >= 1.0 else days_since + 1
    else:
        days_since = 0

    predictions: List[Dict[str, float]] = []
    sorted_horizon = sorted(horizon_rows, key=lambda r: pd.Timestamp(r["date"]))

    for row in sorted_horizon:
        precip = float(row.get("precip_mm") or 0.0)
        days_since = 0 if precip >= 1.0 else days_since + 1

        lag_1 = history_values[-1]
        lag_7 = history_values[-7] if len(history_values) >= 7 else history_values[0]
        if len(history_values) >= 7:
            rolling_7_mean = float(np.mean(history_values[-7:]))
        else:
            rolling_7_mean = float(np.mean(history_values))

        feats = _row_to_feature_dict(
            row=row,
            spec=fit.spec,
            lag_1=lag_1,
            lag_7=lag_7,
            rolling_7_mean=rolling_7_mean,
            days_since_rain=days_since,
        )
        x = pd.DataFrame([feats])[fit.spec.feature_columns].astype(float)
        yhat = float(fit.model.predict(x)[0])
        yhat = max(0.0, yhat)  # values can't be negative for cars/revenue

        low = max(0.0, yhat - 1.96 * fit.sigma)
        high = yhat + 1.96 * fit.sigma

        predictions.append(
            {
                "date": pd.Timestamp(row["date"]).date(),
                "predicted": yhat,
                "low": low,
                "high": high,
            }
        )

        # Extend history with the predicted value so the next iteration sees it.
        history_values.append(yhat)
        history_precip.append(precip)

    return predictions
