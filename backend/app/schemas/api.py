"""Pydantic schemas for REST API endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DistrictOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    state: str


class ShelterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    lat: float
    lng: float
    capacity: int


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    village_id: int
    name: str
    phone: str
    role: str


class VillageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    district_id: int
    name: str
    lat: float
    lng: float
    population: int
    language: str
    is_char_area: bool
    nearest_shelter_id: Optional[int] = None


class NodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    village_id: int
    type: str
    lat: float
    lng: float
    status: str
    battery_pct: Optional[float] = None
    last_seen: datetime
    device_type: str
    source: str
    mount_height_cm: Optional[float] = None
    raw_dry: Optional[int] = None
    raw_wet: Optional[int] = None


class ReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    node_id: int
    ts: datetime
    value: float
    unit: str
    quality_flag: str


class AlertDeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    channel: str
    status: str
    sent_at: Optional[datetime] = None


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    village_id: int
    severity: str
    hazard: str
    message: str
    created_at: datetime
    status: str
    source: str
    deliveries: list[AlertDeliveryOut] = []


class ManualAlertIn(BaseModel):
    village_id: int
    severity: str = Field(..., description="advisory, warning, danger")
    hazard: str = Field(..., description="flood, landslide, earthquake")
    message: Optional[str] = Field(None, description="Custom message or leave None for auto-template")


class AcknowledgeAlertIn(BaseModel):
    note: Optional[str] = Field(None, description="Optional acknowledgement note")
    new_status: str = Field("acknowledged", description="acknowledged or resolved")


class VillageRiskSummary(BaseModel):
    village_id: int
    village_name: str
    district_name: str
    is_char_area: bool
    language: str
    risk_level: str  # none, advisory, warning, danger
    active_alerts_count: int
    highest_severity: Optional[str] = None
    latest_water_level_cm: Optional[float] = None
    latest_rainfall_mm: Optional[float] = None
    latest_soil_moisture_pct: Optional[float] = None


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    role: str
    district_id: Optional[int] = None
    is_active: bool

class ForecastOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    node_id: int
    generated_at: datetime
    target_ts: datetime
    horizon_hours: int
    predicted_value: float
    lower_bound: float
    upper_bound: float
    unit: str
    model_name: str
    explanation: Optional[str] = None


class LandslideRiskOut(BaseModel):
    village_id: int
    village_name: str
    risk_score: float
    severity: str
    soil_moisture_pct: float
    rainfall_24h_mm: float
    rainfall_72h_mm: float
    slope_class: str
    explanation: str
    contributing_factors: dict
