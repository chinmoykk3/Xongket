"""Pydantic schemas for sensor reading ingestion."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict, Field


class ReadingIngestItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    node_id: int = Field(..., description="ID of the sensor node")
    ts: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of the reading in ISO 8601 UTC format",
    )
    value: float = Field(..., description="Sensor reading value")
    unit: str = Field(..., max_length=20, description="Measurement unit (cm, mm, %, °C, g)")
    battery_pct: Optional[float] = Field(
        None, ge=0.0, le=100.0, description="Optional battery percentage"
    )


class IngestedReadingResult(BaseModel):
    id: int
    node_id: int
    ts: datetime
    value: float
    unit: str
    quality_flag: str


class IngestResponse(BaseModel):
    status: str
    processed: int
    readings: list[IngestedReadingResult]
