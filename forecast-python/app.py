"""FastAPI application exposing /health and /forecast.

Stateless: each /forecast call fits a fresh LightGBM model on the training
rows provided by the Java client and returns recursive predictions for the
horizon rows. No DB, no disk, no in-memory model cache.
"""
from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException

from model import fit_model, recursive_predict
from schemas import (
    FeatureImportance,
    ForecastRequest,
    ForecastResponse,
    HealthResponse,
    Prediction,
)

MIN_TRAINING_ROWS = 30

app = FastAPI(title="Lavadero Forecast Service", version="1.0.0")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    if len(req.training) < MIN_TRAINING_ROWS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient training data: got {len(req.training)} rows, "
                f"need at least {MIN_TRAINING_ROWS}."
            ),
        )
    if len(req.horizon) != req.horizon_days:
        raise HTTPException(
            status_code=400,
            detail=(
                f"horizon_days={req.horizon_days} does not match "
                f"len(horizon)={len(req.horizon)}."
            ),
        )

    training_rows = [r.model_dump() for r in req.training]
    horizon_rows = [r.model_dump() for r in req.horizon]

    try:
        fit = fit_model(training_rows)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    preds = recursive_predict(fit, training_rows, horizon_rows)

    return ForecastResponse(
        predictions=[Prediction(**p) for p in preds],
        model_version=fit.model_version,
        feature_importance=[
            FeatureImportance(name=name, gain=gain)
            for name, gain in fit.feature_importance
        ],
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8081"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
