"""
Sensor readings ingestion engine.
Validates readings, updates node status/battery/last_seen,
and performs quality-flag evaluation (duplicate timestamp, out of range, stuck value).

Shared by HTTP POST /ingest and MQTT subscriber.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy.orm import Session

from app.config import settings
from app.models.node import Node
from app.models.reading import Reading
from app.schemas.ingest import ReadingIngestItem
from app.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


# ── Range limits by sensor type ──────────────────────────
RANGE_LIMITS: dict[str, tuple[float, float]] = {
    "water_level":   (0.0, 2500.0),  # cm (0 - 25m)
    "rain_gauge":    (0.0, 500.0),   # mm/hour
    "soil_moisture": (0.0, 100.0),   # %
    "temperature":   (-20.0, 65.0),  # °C (DHT11 ambient)
    "humidity":      (0.0, 100.0),   # %
    "seismic":       (0.0, 10.0),    # g
}

STUCK_VALUE_THRESHOLD = 3


def is_out_of_range(node: Node, value: float) -> bool:
    """Return True if value is outside physical/sensor capability limits."""
    if node.type == "water_level" and node.mount_height_cm is not None:
        if value < 0.0 or value > (node.mount_height_cm + 100.0):
            return True

    limits = RANGE_LIMITS.get(node.type)
    if limits:
        min_val, max_val = limits
        if value < min_val or value > max_val:
            return True
    return False


def is_stuck_value(
    db: Session,
    node_id: int,
    node_type: str,
    current_value: float,
    batch_history: list[float],
) -> bool:
    """Check if sensor value has been completely flat for STUCK_VALUE_THRESHOLD readings."""
    if node_type in ("rain_gauge", "seismic") and abs(current_value) < 1e-4:
        return False

    stuck_in_batch = 0
    for prev_val in reversed(batch_history):
        if abs(prev_val - current_value) < 1e-4:
            stuck_in_batch += 1
        else:
            break

    if stuck_in_batch >= STUCK_VALUE_THRESHOLD:
        return True

    needed_from_db = STUCK_VALUE_THRESHOLD - stuck_in_batch
    recent_db_readings = (
        db.query(Reading.value)
        .filter(Reading.node_id == node_id)
        .order_by(Reading.ts.desc(), Reading.id.desc())
        .limit(needed_from_db)
        .all()
    )

    if len(recent_db_readings) == needed_from_db:
        if all(abs(r[0] - current_value) < 1e-4 for r in recent_db_readings):
            return True

    return False


class IngestionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def process_ingest_items(
    db: Session,
    items: Sequence[ReadingIngestItem],
    api_key: str | None = None,
    bypass_auth: bool = False,
) -> list[Reading]:
    """
    Ingest a batch or single item:
    1. Authenticates against node.api_key.
    2. Validates & assigns quality_flag: duplicate_timestamp | out_of_range | stuck_value | ok.
    3. Updates node.last_seen and battery_pct.
    4. Evaluates Rule-Based Alert Engine on clean readings.
    5. Broadcasts to WebSocket subscribers.
    """
    if not items:
        return []

    unique_node_ids = {item.node_id for item in items}
    nodes_by_id: dict[int, Node] = {
        node.id: node
        for node in db.query(Node).filter(Node.id.in_(unique_node_ids)).all()
    }

    for node_id in unique_node_ids:
        if node_id not in nodes_by_id:
            raise IngestionError(f"Node with id={node_id} not found", status_code=404)

    if not bypass_auth:
        is_master = bool(settings.master_api_key and api_key == settings.master_api_key)
        if not is_master:
            if not api_key:
                raise IngestionError("Missing X-API-Key header", status_code=401)
            for node_id, node in nodes_by_id.items():
                if node.api_key != api_key:
                    raise IngestionError(
                        f"Invalid API key for node {node_id}", status_code=401
                    )

    seen_timestamps_in_batch: set[tuple[int, datetime]] = set()
    node_batch_value_history: dict[int, list[float]] = {nid: [] for nid in unique_node_ids}

    created_readings: list[Reading] = []
    now_utc = datetime.now(timezone.utc)

    for item in items:
        node = nodes_by_id[item.node_id]
        quality_flag = "ok"

        # 1. Duplicate timestamp check
        key = (item.node_id, item.ts)
        if key in seen_timestamps_in_batch:
            quality_flag = "duplicate_timestamp"
        else:
            db_duplicate = (
                db.query(Reading.id)
                .filter(Reading.node_id == item.node_id, Reading.ts == item.ts)
                .first()
            )
            if db_duplicate:
                quality_flag = "duplicate_timestamp"

        seen_timestamps_in_batch.add(key)

        # 2. Out of range check
        if quality_flag == "ok" and is_out_of_range(node, item.value):
            quality_flag = "out_of_range"

        # 3. Stuck value check
        if quality_flag == "ok" and is_stuck_value(
            db,
            node.id,
            node.type,
            item.value,
            node_batch_value_history[item.node_id],
        ):
            quality_flag = "stuck_value"

        node_batch_value_history[item.node_id].append(item.value)

        reading = Reading(
            node_id=node.id,
            ts=item.ts,
            value=item.value,
            unit=item.unit,
            quality_flag=quality_flag,
        )
        db.add(reading)
        created_readings.append(reading)

        node.last_seen = now_utc
        if item.battery_pct is not None:
            node.battery_pct = round(item.battery_pct, 1)

    db.commit()
    for r in created_readings:
        db.refresh(r)

    # ── Evaluate alert engine on clean readings ──────────
    from app.services.alert_engine import evaluate_reading_alert

    for r in created_readings:
        if r.quality_flag == "ok":
            node = nodes_by_id[r.node_id]
            evaluate_reading_alert(db, r, node)

    db.commit()

    # ── Broadcast new readings over WebSocket ────────────
    try:
        loop = asyncio.get_running_loop()
        for r in created_readings:
            loop.create_task(
                ws_manager.broadcast(
                    "new_reading",
                    {
                        "id": r.id,
                        "node_id": r.node_id,
                        "ts": r.ts.isoformat(),
                        "value": r.value,
                        "unit": r.unit,
                        "quality_flag": r.quality_flag,
                    },
                )
            )
    except RuntimeError:
        pass

    return created_readings
