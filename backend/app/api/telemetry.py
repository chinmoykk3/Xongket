"""
Telemetry and geography query endpoints:
- GET /districts
- GET /villages
- GET /shelters
- GET /nodes
- GET /nodes/{id}/readings
- GET /risk-summary
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.alert import Alert, AlertStatus
from app.models.district import District
from app.models.node import Node
from app.models.reading import Reading
from app.models.shelter import Shelter
from app.models.village import Village
from app.schemas.api import (
    DistrictOut,
    NodeOut,
    ReadingOut,
    ShelterOut,
    VillageOut,
    VillageRiskSummary,
)

router = APIRouter(tags=["Telemetry & Geography"])


# ── Districts ────────────────────────────────────────────
@router.get("/districts", response_model=list[DistrictOut], summary="List all districts")
def list_districts(db: Session = Depends(get_db)):
    return db.query(District).order_by(District.name).all()


# ── Villages ─────────────────────────────────────────────
@router.get("/villages", response_model=list[VillageOut], summary="List villages with filters")
def list_villages(
    district_id: Optional[int] = Query(None, description="Filter by district ID"),
    is_char_area: Optional[bool] = Query(None, description="Filter by char area (riverine island)"),
    language: Optional[str] = Query(None, description="Filter by primary language"),
    db: Session = Depends(get_db),
):
    query = db.query(Village)
    if district_id is not None:
        query = query.filter(Village.district_id == district_id)
    if is_char_area is not None:
        query = query.filter(Village.is_char_area == is_char_area)
    if language is not None:
        query = query.filter(Village.language == language.lower())
    return query.order_by(Village.name).all()


# ── Shelters ─────────────────────────────────────────────
@router.get("/shelters", response_model=list[ShelterOut], summary="List emergency shelters")
def list_shelters(db: Session = Depends(get_db)):
    return db.query(Shelter).order_by(Shelter.name).all()


# ── Nodes ────────────────────────────────────────────────
@router.get("/nodes", response_model=list[NodeOut], summary="List sensor nodes with filters")
def list_nodes(
    village_id: Optional[int] = Query(None, description="Filter by village ID"),
    type: Optional[str] = Query(None, description="water_level, rain_gauge, soil_moisture, etc."),
    status: Optional[str] = Query(None, description="active, inactive, maintenance"),
    device_type: Optional[str] = Query(None, description="esp8266, esp32, virtual"),
    db: Session = Depends(get_db),
):
    query = db.query(Node)
    if village_id is not None:
        query = query.filter(Node.village_id == village_id)
    if type is not None:
        query = query.filter(Node.type == type)
    if status is not None:
        query = query.filter(Node.status == status)
    if device_type is not None:
        query = query.filter(Node.device_type == device_type)
    return query.order_by(Node.id).all()


# ── Node Readings with Time Range & Downsampling ─────────
@router.get("/nodes/{id}/readings", response_model=list[ReadingOut], summary="Get historical readings for node")
def get_node_readings(
    id: int,
    start_ts: Optional[datetime] = Query(None, description="Start timestamp (UTC)"),
    end_ts: Optional[datetime] = Query(None, description="End timestamp (UTC)"),
    limit: int = Query(100, ge=1, le=2000, description="Max readings to return"),
    downsample_interval: Optional[int] = Query(
        None,
        ge=1,
        le=1440,
        description="Downsampling bucket size in minutes (e.g. 15, 60)",
    ),
    db: Session = Depends(get_db),
):
    node = db.query(Node).filter(Node.id == id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Node {id} not found")

    query = db.query(Reading).filter(Reading.node_id == id)
    if start_ts is not None:
        query = query.filter(Reading.ts >= start_ts)
    if end_ts is not None:
        query = query.filter(Reading.ts <= end_ts)

    query = query.order_by(Reading.ts.asc())
    raw_readings = query.limit(limit * (downsample_interval or 1)).all()

    # If downsampling requested, bucket readings into intervals
    if downsample_interval and len(raw_readings) > 1:
        bucket_seconds = downsample_interval * 60
        downsampled: list[Reading] = []
        current_bucket_start: Optional[datetime] = None
        current_bucket_readings: list[Reading] = []

        for r in raw_readings:
            r_ts = r.ts.replace(tzinfo=timezone.utc) if r.ts.tzinfo is None else r.ts
            if current_bucket_start is None:
                current_bucket_start = r_ts
                current_bucket_readings = [r]
            elif (r_ts - current_bucket_start).total_seconds() < bucket_seconds:
                current_bucket_readings.append(r)
            else:
                # Average bucket values
                avg_val = round(sum(x.value for x in current_bucket_readings) / len(current_bucket_readings), 2)
                downsampled.append(
                    Reading(
                        id=current_bucket_readings[-1].id,
                        node_id=id,
                        ts=current_bucket_start,
                        value=avg_val,
                        unit=current_bucket_readings[0].unit,
                        quality_flag="ok",
                    )
                )
                current_bucket_start = r_ts
                current_bucket_readings = [r]

        if current_bucket_readings and current_bucket_start:
            avg_val = round(sum(x.value for x in current_bucket_readings) / len(current_bucket_readings), 2)
            downsampled.append(
                Reading(
                    id=current_bucket_readings[-1].id,
                    node_id=id,
                    ts=current_bucket_start,
                    value=avg_val,
                    unit=current_bucket_readings[0].unit,
                    quality_flag="ok",
                )
            )
        return downsampled[:limit]

    return raw_readings[:limit]


# ── Risk Summary per Village ─────────────────────────────
@router.get("/risk-summary", response_model=list[VillageRiskSummary], summary="Get current risk summary for all villages")
def get_risk_summary(
    district_id: Optional[int] = Query(None, description="Optional district filter"),
    db: Session = Depends(get_db),
):
    """
    Computes current disaster risk level per village combining:
    - Active alerts and highest severity (danger > warning > advisory > none)
    - Latest water level (cm)
    - Latest rainfall (mm)
    - Latest soil moisture (%)
    """
    query = db.query(Village).join(District)
    if district_id is not None:
        query = query.filter(Village.district_id == district_id)

    villages = query.order_by(District.name, Village.name).all()
    summaries: list[VillageRiskSummary] = []

    SEVERITY_ORDER = {"danger": 3, "warning": 2, "advisory": 1}

    for v in villages:
        # 1. Active alerts for this village
        active_alerts = (
            db.query(Alert)
            .filter(Alert.village_id == v.id, Alert.status == AlertStatus.active.value)
            .all()
        )
        alert_count = len(active_alerts)
        highest_sev = None
        if active_alerts:
            # find maximum severity
            sorted_alerts = sorted(
                active_alerts, key=lambda a: SEVERITY_ORDER.get(a.severity.lower(), 0), reverse=True
            )
            highest_sev = sorted_alerts[0].severity

        risk_level = highest_sev if highest_sev else "none"

        # 2. Latest readings for each key sensor type in this village
        latest_wl = None
        latest_rain = None
        latest_soil = None

        village_nodes = db.query(Node).filter(Node.village_id == v.id).all()
        for node in village_nodes:
            latest_r = (
                db.query(Reading)
                .filter(Reading.node_id == node.id)
                .order_by(Reading.ts.desc())
                .first()
            )
            if latest_r:
                if node.type == "water_level" and latest_wl is None:
                    latest_wl = latest_r.value
                elif node.type == "rain_gauge" and latest_rain is None:
                    latest_rain = latest_r.value
                elif node.type == "soil_moisture" and latest_soil is None:
                    latest_soil = latest_r.value

        summaries.append(
            VillageRiskSummary(
                village_id=v.id,
                village_name=v.name,
                district_name=v.district.name,
                is_char_area=v.is_char_area,
                language=v.language,
                risk_level=risk_level,
                active_alerts_count=alert_count,
                highest_severity=highest_sev,
                latest_water_level_cm=latest_wl,
                latest_rainfall_mm=latest_rain,
                latest_soil_moisture_pct=latest_soil,
            )
        )

    return summaries
