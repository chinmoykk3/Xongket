"""AI forecasting, anomaly, and geotechnical risk REST endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ai.landslide.risk import compute_landslide_risk
from app.database import get_db
from app.models.forecast import Forecast
from app.models.node import Node
from app.models.reading import Reading
from app.models.user import User
from app.models.village import Village
from app.schemas.api import ForecastOut, LandslideRiskOut
from app.services.auth import require_roles
from app.services.forecast_service import run_all_node_forecasts, run_forecast_for_node

router = APIRouter(tags=["AI & Forecasting"])


@router.get("/nodes/{node_id}/forecasts", response_model=List[ForecastOut])
def get_node_forecasts(
    node_id: int,
    db: Session = Depends(get_db),
):
    """Retrieve the latest multi-horizon (1h, 3h, 6h) flood forecasts for a water-level sensor node."""
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    if node.type != "water_level":
        raise HTTPException(
            status_code=400,
            detail=f"Node {node_id} is of type '{node.type}', not 'water_level'",
        )

    # Query latest forecasts generated for this node
    latest_forecasts = (
        db.query(Forecast)
        .filter(Forecast.node_id == node_id)
        .order_by(Forecast.generated_at.desc(), Forecast.horizon_hours.asc())
        .limit(6)
        .all()
    )

    if not latest_forecasts:
        # If none exist yet, generate them on-demand
        latest_forecasts = run_forecast_for_node(db, node)

    return latest_forecasts


@router.get("/villages/{village_id}/landslide-risk", response_model=LandslideRiskOut)
def get_village_landslide_risk(
    village_id: int,
    slope: str = Query("moderate", description="Slope category: low, moderate, high, steep, or degrees"),
    db: Session = Depends(get_db),
):
    """Calculate geotechnical landslide risk score and severity for a village based on recent soil moisture and rainfall."""
    village = db.query(Village).filter(Village.id == village_id).first()
    if not village:
        raise HTTPException(status_code=404, detail=f"Village {village_id} not found")

    now = datetime.now(timezone.utc)
    t_24h = now - timedelta(hours=24)
    t_72h = now - timedelta(hours=72)

    # 1. Fetch latest soil moisture reading in village
    sm_node = (
        db.query(Node)
        .filter(Node.village_id == village_id, Node.type == "soil_moisture")
        .first()
    )
    soil_moisture = 45.0  # Baseline normal
    if sm_node:
        latest_sm = (
            db.query(Reading)
            .filter(Reading.node_id == sm_node.id, Reading.quality_flag == "ok")
            .order_by(Reading.ts.desc())
            .first()
        )
        if latest_sm:
            soil_moisture = latest_sm.value

    # 2. Fetch rainfall in 24h and 72h
    rain_nodes = (
        db.query(Node.id)
        .filter(Node.village_id == village_id, Node.type == "rain_gauge")
        .all()
    )
    rain_ids = [rn[0] for rn in rain_nodes]

    rain_24h = 0.0
    rain_72h = 0.0
    if rain_ids:
        rain_readings = (
            db.query(Reading)
            .filter(
                Reading.node_id.in_(rain_ids),
                Reading.quality_flag == "ok",
                Reading.ts >= t_72h,
            )
            .all()
        )
        for r in rain_readings:
            r_ts = r.ts if r.ts.tzinfo else r.ts.replace(tzinfo=timezone.utc)
            rain_72h += r.value
            if r_ts >= t_24h:
                rain_24h += r.value

    assessment = compute_landslide_risk(
        soil_moisture_pct=soil_moisture,
        rainfall_24h_mm=rain_24h,
        rainfall_72h_mm=rain_72h,
        slope=slope,
    )

    return LandslideRiskOut(
        village_id=village.id,
        village_name=village.name,
        risk_score=assessment.risk_score,
        severity=assessment.severity,
        soil_moisture_pct=assessment.soil_moisture_pct,
        rainfall_24h_mm=assessment.rainfall_24h_mm,
        rainfall_72h_mm=assessment.rainfall_72h_mm,
        slope_class=assessment.slope_class,
        explanation=assessment.explanation,
        contributing_factors=assessment.contributing_factors,
    )


@router.post("/forecasts/trigger", status_code=status.HTTP_200_OK)
def trigger_forecast_cycle(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "district_officer")),
):
    """Manually trigger a multi-horizon forecast execution cycle across all water level gauges."""
    forecasts = run_all_node_forecasts(db)
    return {
        "status": "success",
        "message": f"Successfully generated {len(forecasts)} forecast horizons across active stations.",
        "forecasts_count": len(forecasts),
    }
