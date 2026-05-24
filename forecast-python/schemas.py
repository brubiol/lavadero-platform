"""Pydantic request/response schemas for the forecast service."""
from __future__ import annotations

from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class TrainingRow(BaseModel):
    """A single observed training day."""

    date: date
    value: float
    precip_mm: float = 0.0
    temp_max_c: float = 0.0
    temp_min_c: float = 0.0
    wind_max_kph: float = 0.0
    is_holiday: bool = False
    day_before_holiday: bool = False
    day_after_holiday: bool = False
    is_quincena_post: bool = False
    is_border_traffic_holiday: bool = False
    holiday_name: Optional[str] = None


class HorizonRow(BaseModel):
    """A single future day to predict (no value)."""

    date: date
    precip_mm: float = 0.0
    temp_max_c: float = 0.0
    temp_min_c: float = 0.0
    wind_max_kph: float = 0.0
    is_holiday: bool = False
    day_before_holiday: bool = False
    day_after_holiday: bool = False
    is_quincena_post: bool = False
    is_border_traffic_holiday: bool = False
    holiday_name: Optional[str] = None


class ForecastRequest(BaseModel):
    snapshot_date: date
    horizon_days: int = Field(ge=1, le=14)
    axis: Literal["cars", "revenue"]
    training: List[TrainingRow]
    horizon: List[HorizonRow]


class Prediction(BaseModel):
    date: date
    predicted: float
    low: float
    high: float


class FeatureImportance(BaseModel):
    name: str
    gain: float


class ForecastResponse(BaseModel):
    # Silence pydantic v2's "model_" protected-namespace warning for model_version.
    model_config = ConfigDict(protected_namespaces=())

    predictions: List[Prediction]
    model_version: str
    feature_importance: List[FeatureImportance]


class HealthResponse(BaseModel):
    status: str
