"""Flood forecasting and AI alert service.

Executes multi-horizon water level forecasts (1h, 3h, 6h) for river gauge nodes,
persists forecasts to the database, and raises early-warning alerts with
lead time and plain-language explanations when threshold crossings are predicted.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
from sqlalchemy import func
from sqlalchemy.orm import Session

from ai.forecasting.models import (
    HORIZONS,
    FloodForecaster,
    MultiHorizonForecast,
)
from app.models.alert import Alert
from app.models.alert_delivery import AlertDelivery
from app.models.forecast import Forecast
from app.models.node import Node
from app.models.reading import Reading
from app.models.threshold import Threshold
from app.models.village import Village
from app.services.websocket_manager import ws_manager
from app.translations.alert_messages import get_ai_forecast_alert_message

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parent.parent.parent.parent / "ai" / "models" / "flood_forecaster.joblib"

_cached_forecaster: Optional[FloodForecaster] = None


def get_or_load_forecaster() -> FloodForecaster:
    """Load pre-trained forecaster model or return an initialized instance."""
    global _cached_forecaster
    if _cached_forecaster is not None:
        return _cached_forecaster

    if MODEL_PATH.exists():
        try:
            _cached_forecaster = joblib.load(MODEL_PATH)
            logger.info("Loaded trained FloodForecaster from %s", MODEL_PATH)
            return _cached_forecaster
        except Exception as exc:
            logger.warning("Failed to load model from %s: %s", MODEL_PATH, exc)

    # Fallback initialized forecaster
    _cached_forecaster = FloodForecaster()
    return _cached_forecaster


def _to_utc(dt: datetime) -> datetime:
    """Ensure datetime has UTC timezone."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def extract_node_forecast_features(db: Session, node: Node) -> Dict[str, float]:
    """Extract hydrological feature values for a water-level sensor node."""
    now = datetime.now(timezone.utc)
    past_24h = now - timedelta(hours=24)
    past_6h = now - timedelta(hours=6)

    # 1. Query recent water level readings for this node
    recent_readings = (
        db.query(Reading)
        .filter(
            Reading.node_id == node.id,
            Reading.quality_flag == "ok",
            Reading.ts >= past_24h,
        )
        .order_by(Reading.ts.desc())
        .limit(30)
        .all()
    )

    if recent_readings:
        current_water_level = recent_readings[0].value
        current_ts = _to_utc(recent_readings[0].ts)
    else:
        current_water_level = 240.0
        current_ts = now

    # Lags: 1h, 3h, 6h ago
    def find_val_near_lag(hours_ago: float) -> float:
        target_t = current_ts - timedelta(hours=hours_ago)
        best_val = current_water_level
        best_diff = timedelta(days=99)
        for r in recent_readings:
            r_ts = _to_utc(r.ts)
            diff = abs(r_ts - target_t)
            if diff < best_diff and diff <= timedelta(hours=1.5):
                best_diff = diff
                best_val = r.value
        return best_val

    wl_lag1 = find_val_near_lag(1.0)
    wl_lag3 = find_val_near_lag(3.0)
    wl_lag6 = find_val_near_lag(6.0)

    rate_of_rise_1h = current_water_level - wl_lag1
    rate_of_rise_3h = current_water_level - wl_lag3

    # 2. Query recent rainfall for this village
    village_rain_nodes = (
        db.query(Node.id)
        .filter(
            Node.village_id == node.village_id,
            Node.type == "rain_gauge",
        )
        .all()
    )
    rain_node_ids = [rn[0] for rn in village_rain_nodes]

    rainfall_1h = 0.0
    rainfall_3h = 0.0
    rainfall_6h = 0.0
    rainfall_24h = 0.0

    if rain_node_ids:
        rain_readings = (
            db.query(Reading)
            .filter(
                Reading.node_id.in_(rain_node_ids),
                Reading.quality_flag == "ok",
                Reading.ts >= past_24h,
            )
            .order_by(Reading.ts.desc())
            .all()
        )
        t_1h = now - timedelta(hours=1)
        t_3h = now - timedelta(hours=3)
        t_6h = now - timedelta(hours=6)

        for r in rain_readings:
            r_ts = _to_utc(r.ts)
            v = r.value
            rainfall_24h += v
            if r_ts >= t_6h:
                rainfall_6h += v
            if r_ts >= t_3h:
                rainfall_3h += v
            if r_ts >= t_1h:
                rainfall_1h += v

    # 3. Upstream level proxy
    # Check for another active water_level node in the same or adjacent district
    upstream_node = (
        db.query(Node)
        .filter(
            Node.id != node.id,
            Node.type == "water_level",
            Node.status == "active",
        )
        .first()
    )
    if upstream_node:
        latest_up = (
            db.query(Reading)
            .filter(Reading.node_id == upstream_node.id, Reading.quality_flag == "ok")
            .order_by(Reading.ts.desc())
            .first()
        )
        up_current = latest_up.value if latest_up else (current_water_level * 0.95)
    else:
        up_current = current_water_level * 0.95

    # 4. Cyclical features
    doy = current_ts.timetuple().tm_yday
    hour = current_ts.hour
    import numpy as np

    hour_sin = float(np.sin(2 * np.pi * hour / 24.0))
    hour_cos = float(np.cos(2 * np.pi * hour / 24.0))
    doy_sin = float(np.sin(2 * np.pi * doy / 365.25))
    doy_cos = float(np.cos(2 * np.pi * doy / 365.25))

    saturation = min(100.0, 30.0 + rainfall_24h * 0.8)

    return {
        "water_level_current": float(current_water_level),
        "water_level_lag1": float(wl_lag1),
        "water_level_lag3": float(wl_lag3),
        "water_level_lag6": float(wl_lag6),
        "rate_of_rise_1h": float(rate_of_rise_1h),
        "rate_of_rise_3h": float(rate_of_rise_3h),
        "rainfall_1h": float(rainfall_1h),
        "rainfall_3h_sum": float(rainfall_3h),
        "rainfall_6h_sum": float(rainfall_6h),
        "rainfall_24h_sum": float(rainfall_24h),
        "upstream_level_current": float(up_current),
        "upstream_delta_3h": float(rate_of_rise_3h * 0.8),
        "catchment_saturation": float(saturation),
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "doy_sin": doy_sin,
        "doy_cos": doy_cos,
        "timestamp_str": current_ts.isoformat(),
    }


def find_water_level_threshold(db: Session, village_id: int) -> Tuple[float, float]:
    """Retrieve warning and danger thresholds for water level in this village."""
    village_thresh = (
        db.query(Threshold)
        .filter(Threshold.village_id == village_id, Threshold.node_type == "water_level")
        .first()
    )
    if village_thresh:
        return float(village_thresh.warning_level), float(village_thresh.danger_level)

    global_thresh = (
        db.query(Threshold)
        .filter(Threshold.village_id == None, Threshold.node_type == "water_level")  # noqa: E711
        .first()
    )
    if global_thresh:
        return float(global_thresh.warning_level), float(global_thresh.danger_level)

    # Defaults if not configured
    return 400.0, 450.0


def run_forecast_for_node(
    db: Session,
    node: Node,
    forecaster: Optional[FloodForecaster] = None,
) -> List[Forecast]:
    """Execute multi-horizon predictions for a single water-level node, save to DB, and evaluate AI alerts."""
    if node.type != "water_level":
        return []

    fc = forecaster or get_or_load_forecaster()
    features = extract_node_forecast_features(db, node)
    warn_thresh, danger_thresh = find_water_level_threshold(db, node.village_id)

    prediction_result: MultiHorizonForecast = fc.predict_single(
        features_dict=features,
        station_id=f"NODE_{node.id}",
        node_id=node.id,
        danger_threshold_cm=danger_thresh,
        warning_threshold_cm=warn_thresh,
    )

    now_utc = datetime.now(timezone.utc)
    stored_forecasts: List[Forecast] = []

    # Save forecasts for 1h, 3h, 6h
    for h in HORIZONS:
        hz_res = prediction_result.forecasts[h]
        target_ts = now_utc + timedelta(hours=h)

        record = Forecast(
            node_id=node.id,
            generated_at=now_utc,
            target_ts=target_ts,
            horizon_hours=h,
            predicted_value=hz_res.predicted_value,
            lower_bound=hz_res.lower_bound,
            upper_bound=hz_res.upper_bound,
            unit=hz_res.unit,
            model_name=prediction_result.model_name,
            explanation=hz_res.explanation,
        )
        db.add(record)
        stored_forecasts.append(record)

    db.commit()

    # Check for early-warning threshold crossings across horizons
    # Check 1h, then 3h, then 6h to find the earliest / highest severity trigger
    highest_severity: Optional[str] = None
    trigger_horizon: Optional[int] = None
    trigger_res = None

    for h in [1, 3, 6]:
        hz = prediction_result.forecasts[h]
        if hz.predicted_value >= danger_thresh:
            highest_severity = "danger"
            trigger_horizon = h
            trigger_res = hz
            break  # Danger is highest severity
        elif hz.predicted_value >= warn_thresh and highest_severity != "danger":
            highest_severity = "warning"
            trigger_horizon = h
            trigger_res = hz

    if highest_severity and trigger_horizon is not None and trigger_res is not None:
        _evaluate_and_raise_ai_alert(
            db=db,
            node=node,
            severity=highest_severity,
            lead_time_hours=trigger_horizon,
            predicted_val=trigger_res.predicted_value,
            unit=trigger_res.unit,
            explanation=trigger_res.explanation,
        )

    return stored_forecasts


def _evaluate_and_raise_ai_alert(
    db: Session,
    node: Node,
    severity: str,
    lead_time_hours: int,
    predicted_val: float,
    unit: str,
    explanation: str,
) -> Optional[Alert]:
    """Create and broadcast an AI early-warning alert if not within cooldown."""
    now_utc = datetime.now(timezone.utc)
    cooldown_cutoff = now_utc - timedelta(minutes=30)

    # Check for recent active AI flood alert in this village
    recent_ai_alert = (
        db.query(Alert)
        .filter(
            Alert.village_id == node.village_id,
            Alert.hazard == "flood",
            Alert.source == "ai",
            Alert.status == "active",
            Alert.created_at >= cooldown_cutoff,
        )
        .first()
    )
    if recent_ai_alert:
        logger.info(
            "Suppressing duplicate AI alert for village %s (cooldown active until %s)",
            node.village_id,
            recent_ai_alert.created_at + timedelta(minutes=30),
        )
        return None

    village = db.query(Village).filter(Village.id == node.village_id).first()
    village_name = village.name if village else f"Village-{node.village_id}"
    language = village.language if village else "assamese"

    msg = get_ai_forecast_alert_message(
        severity=severity,
        language=language,
        village_name=village_name,
        predicted_value=predicted_val,
        unit=unit,
        lead_time_hours=lead_time_hours,
        explanation=explanation,
    )

    alert = Alert(
        village_id=node.village_id,
        severity=severity,
        hazard="flood",
        message=msg,
        status="active",
        source="ai",
        created_at=now_utc,
    )
    db.add(alert)
    db.flush()

    delivery = AlertDelivery(
        alert_id=alert.id,
        channel="dashboard",
        status="sent",
        sent_at=now_utc,
    )
    db.add(delivery)
    db.commit()

    logger.warning("AI Forecast Alert [%s] raised for %s: %s", severity.upper(), village_name, msg)

    # Broadcast via WebSocket live stream
    ws_manager.broadcast_sync(
        "alert_raised",
        {
            "source": "ai",
            "alert": {
                "id": alert.id,
                "village_id": alert.village_id,
                "village_name": village_name,
                "severity": alert.severity,
                "hazard": alert.hazard,
                "message": alert.message,
                "source": "ai",
                "lead_time_hours": lead_time_hours,
                "explanation": explanation,
                "created_at": alert.created_at.isoformat(),
                "status": alert.status,
            },
        },
    )

    return alert


def run_all_node_forecasts(db: Session) -> List[Forecast]:
    """Execute forecasts across all active water level stations."""
    nodes = (
        db.query(Node)
        .filter(Node.type == "water_level", Node.status == "active")
        .all()
    )
    fc = get_or_load_forecaster()
    all_forecasts: List[Forecast] = []
    for node in nodes:
        try:
            fc_list = run_forecast_for_node(db, node, forecaster=fc)
            all_forecasts.extend(fc_list)
        except Exception as exc:
            logger.error("Error generating forecast for node %s: %s", node.id, exc)

    return all_forecasts
