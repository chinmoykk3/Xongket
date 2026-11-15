"""
Rule-Based Alert Engine for Xongket.

Evaluates every clean sensor reading (`quality_flag == 'ok'`):
1. Looks up thresholds (village-specific override takes precedence over global default).
2. Calculates rate-of-rise for water levels and escalates severity if rising faster than threshold.
3. Applies cooldown and hysteresis to prevent alert flapping and duplicate alert spam.
4. Generates localized alert messages in Assamese, Bodo, Bengali, Hindi, or English.
5. Dispatches alerts, creates initial delivery records, and broadcasts to live WebSockets.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertStatus, Hazard, Severity
from app.models.alert_delivery import AlertDelivery
from app.models.node import Node
from app.models.reading import Reading
from app.models.threshold import Threshold
from app.models.village import Village
from app.services.websocket_manager import ws_manager
from app.translations.alert_messages import get_alert_message

logger = logging.getLogger("xongket.alert_engine")

# Severity order
SEVERITY_RANK: dict[str, int] = {
    Severity.advisory.value: 1,
    Severity.warning.value: 2,
    Severity.danger.value: 3,
}

# Cooldown before repeating an alert of the SAME severity for the same village/hazard (in minutes)
ALERT_COOLDOWN_MINUTES = 30

# Hysteresis buffer in percent to prevent boundary flapping (e.g., 5%)
HYSTERESIS_FACTOR = 0.05

# Rate of rise escalation threshold in cm/hour
FAST_RISE_CM_PER_HOUR = 20.0


def _to_utc(dt: datetime) -> datetime:
    """Normalize any datetime to UTC timezone-aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def map_node_to_hazard(node_type: str) -> Optional[str]:
    """Map sensor telemetry type to corresponding natural hazard."""
    if node_type in ("water_level", "rain_gauge"):
        return Hazard.flood.value
    elif node_type in ("soil_moisture",):
        return Hazard.landslide.value
    elif node_type in ("seismic",):
        return Hazard.earthquake.value
    return None


def get_applicable_threshold(db: Session, node_type: str, village_id: int) -> Optional[Threshold]:
    """
    Retrieve threshold with village-specific override taking precedence
    over global default (village_id is None).
    """
    village_thresh = (
        db.query(Threshold)
        .filter(Threshold.node_type == node_type, Threshold.village_id == village_id)
        .first()
    )
    if village_thresh:
        return village_thresh

    global_thresh = (
        db.query(Threshold)
        .filter(Threshold.node_type == node_type, Threshold.village_id.is_(None))
        .first()
    )
    return global_thresh


def calculate_water_level_rate_of_rise(db: Session, node: Node, current_reading: Reading) -> float:
    """
    Calculate water level rate of rise in cm/hour compared to recent historical reading.
    Returns cm/hour (positive = rising, negative = falling).
    """
    # Look back for previous reading between 10 and 120 minutes ago
    prev_reading = (
        db.query(Reading)
        .filter(
            Reading.node_id == node.id,
            Reading.id != current_reading.id,
            Reading.quality_flag == "ok",
            Reading.ts < current_reading.ts,
        )
        .order_by(Reading.ts.desc())
        .first()
    )

    if not prev_reading:
        return 0.0

    cur_ts = _to_utc(current_reading.ts)
    prev_ts = _to_utc(prev_reading.ts)
    delta_h = current_reading.value - prev_reading.value
    delta_t_seconds = (cur_ts - prev_ts).total_seconds()
    if delta_t_seconds <= 0:
        return 0.0

    delta_t_hours = delta_t_seconds / 3600.0
    # Avoid extreme spikes if timestamps are seconds apart
    if delta_t_hours < (5.0 / 60.0):
        return 0.0

    rate_cm_per_hour = delta_h / delta_t_hours
    return rate_cm_per_hour


def evaluate_reading_alert(db: Session, reading: Reading, node: Node) -> Optional[Alert]:
    """
    Core rule evaluation on an individual reading:
    - Filters bad quality flags
    - Calculates severity & rate-of-rise escalation
    - Enforces cooldown & hysteresis
    - Persists and returns Alert if triggered
    """
    # Rule 1: Ignore bad quality readings
    if reading.quality_flag != "ok":
        return None

    hazard = map_node_to_hazard(node.type)
    if not hazard:
        return None

    threshold = get_applicable_threshold(db, node.type, node.village_id)
    if not threshold:
        return None

    val = reading.value
    warn_lvl = threshold.warning_level
    danger_lvl = threshold.danger_level
    # Advisory is typically 75% of warning level
    advisory_lvl = warn_lvl * 0.75

    # 1. Base severity from raw value
    base_severity: Optional[str] = None
    if val >= danger_lvl:
        base_severity = Severity.danger.value
    elif val >= warn_lvl:
        base_severity = Severity.warning.value
    elif val >= advisory_lvl:
        base_severity = Severity.advisory.value

    # 2. Rate-of-rise escalation rule for water level
    rate_of_rise = 0.0
    if node.type == "water_level":
        rate_of_rise = calculate_water_level_rate_of_rise(db, node, reading)
        if rate_of_rise >= FAST_RISE_CM_PER_HOUR:
            # Rapid rise escalates severity
            if base_severity == Severity.advisory.value:
                logger.info(
                    "Rate of rise %.1f cm/h escalated village %d from advisory -> warning",
                    rate_of_rise,
                    node.village_id,
                )
                base_severity = Severity.warning.value
            elif base_severity == Severity.warning.value:
                logger.info(
                    "Rate of rise %.1f cm/h escalated village %d from warning -> danger",
                    rate_of_rise,
                    node.village_id,
                )
                base_severity = Severity.danger.value

    if not base_severity:
        return None

    current_severity_rank = SEVERITY_RANK[base_severity]

    # 3. Check for existing active alerts for this village and hazard
    active_alerts = (
        db.query(Alert)
        .filter(
            Alert.village_id == node.village_id,
            Alert.hazard == hazard,
            Alert.status == AlertStatus.active.value,
        )
        .order_by(Alert.created_at.desc())
        .all()
    )

    now = datetime.now(timezone.utc)
    ts_now = _to_utc(reading.ts) if reading.ts else now

    if active_alerts:
        latest_alert = active_alerts[0]
        latest_rank = SEVERITY_RANK.get(latest_alert.severity, 0)

        # Escalation condition:
        if current_severity_rank > latest_rank:
            logger.info(
                "Escalating alert for village %d: %s -> %s",
                node.village_id,
                latest_alert.severity,
                base_severity,
            )
            # Mark previous lower-severity alerts resolved / superseded
            for a in active_alerts:
                a.status = AlertStatus.resolved.value

        # Same severity condition -> check cooldown
        elif current_severity_rank == latest_rank:
            created_at = _to_utc(latest_alert.created_at)
            time_since_last = ts_now - created_at
            if time_since_last < timedelta(minutes=ALERT_COOLDOWN_MINUTES):
                # Within cooldown: Do NOT spam duplicate alert!
                return None

        # De-escalation condition -> check hysteresis buffer
        else:
            # e.g., dropping from danger to warning requires dropping below danger_lvl * (1 - HYSTERESIS_FACTOR)
            threshold_boundary = danger_lvl if latest_rank == 3 else warn_lvl
            hysteresis_boundary = threshold_boundary * (1.0 - HYSTERESIS_FACTOR)
            if val > hysteresis_boundary:
                # Still within hysteresis band, hold previous higher severity
                return None
            else:
                # Receded sufficiently: resolve old alert, allow new lower severity
                for a in active_alerts:
                    a.status = AlertStatus.resolved.value

    # 4. Generate localized message
    village = db.query(Village).filter(Village.id == node.village_id).first()
    village_name = village.name if village else f"Village {node.village_id}"
    village_lang = village.language if village else "assamese"

    message = get_alert_message(
        hazard=hazard,
        severity=base_severity,
        language=village_lang,
        village_name=village_name,
        value=val,
        unit=reading.unit,
    )

    # 5. Persist alert
    alert = Alert(
        village_id=node.village_id,
        severity=base_severity,
        hazard=hazard,
        message=message,
        created_at=ts_now,
        status=AlertStatus.active.value,
        source="rule",
    )
    db.add(alert)
    db.flush()

    # Create initial delivery log
    delivery = AlertDelivery(
        alert_id=alert.id,
        channel="dashboard",
        status="sent",
        sent_at=ts_now,
    )
    db.add(delivery)
    db.flush()

    logger.warning(
        "🚨 TRIGGERED ALERT id=%d village=%s (%s/%s): %s",
        alert.id,
        village_name,
        hazard,
        base_severity,
        message[:60],
    )

    # Broadcast via WebSocket (fire-and-forget in background)
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            ws_manager.broadcast(
                "new_alert",
                {
                    "id": alert.id,
                    "village_id": alert.village_id,
                    "village_name": village_name,
                    "severity": alert.severity,
                    "hazard": alert.hazard,
                    "message": alert.message,
                    "created_at": alert.created_at.isoformat(),
                    "status": alert.status,
                },
            )
        )
    except RuntimeError:
        pass

    return alert
