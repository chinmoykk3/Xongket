"""
Rainfall fetcher — pulls hourly precipitation from the free Open-Meteo API
and stores it as readings on virtual ``rain_gauge`` nodes (source=api).

Falls back to the last stored value when the network is unreachable.

Usage (standalone test):
    cd backend
    .venv/Scripts/python -m app.services.rainfall   # Windows
    .venv/bin/python -m app.services.rainfall        # macOS / Linux

In production this should run as a scheduled job (APScheduler / cron / etc.).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.node import Node, NodeSource, NodeStatus, NodeType
from app.models.reading import Reading
from app.models.village import Village

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT = 10  # seconds


def _fetch_current_rainfall(lat: float, lng: float) -> float | None:
    """Return the current-hour rainfall in mm from Open-Meteo, or None on failure."""
    try:
        resp = httpx.get(
            OPEN_METEO_URL,
            params={
                "latitude": round(lat, 4),
                "longitude": round(lng, 4),
                "hourly": "rain",
                "forecast_days": 1,
                "timezone": "auto",
            },
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        times: list[str] = data["hourly"]["time"]
        rains: list[float | None] = data["hourly"]["rain"]
        now_hour = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
        for t, r in zip(times, rains):
            if t == now_hour and r is not None:
                return float(r)
        # If exact hour not found, return the latest non-null value
        for r in reversed(rains):
            if r is not None:
                return float(r)
        return 0.0
    except Exception as exc:
        logger.warning("Open-Meteo request failed: %s", exc)
        return None


def _get_or_create_virtual_rain_node(db: Session, village: Village) -> Node:
    """Return the virtual rain_gauge node for *village*, creating it if absent."""
    node = (
        db.query(Node)
        .filter(
            Node.village_id == village.id,
            Node.type == NodeType.rain_gauge.value,
            Node.source == NodeSource.api.value,
        )
        .first()
    )
    if node is None:
        node = Node(
            village_id=village.id,
            type=NodeType.rain_gauge.value,
            lat=village.lat,
            lng=village.lng,
            status=NodeStatus.active.value,
            device_type="virtual",
            source=NodeSource.api.value,
        )
        db.add(node)
        db.flush()
        logger.info("Created virtual rain_gauge node %d for village %s", node.id, village.name)
    return node


def _last_stored_rainfall(db: Session, node: Node) -> float:
    """Return the most recent rainfall reading for *node*, or 0.0."""
    reading = (
        db.query(Reading)
        .filter(Reading.node_id == node.id)
        .order_by(Reading.ts.desc())
        .first()
    )
    return reading.value if reading else 0.0


def fetch_rainfall_for_all_villages(db: Session) -> dict[str, float]:
    """Fetch rainfall for every village and store as readings.

    Returns a dict ``{village_name: rainfall_mm}``.
    """
    villages = db.query(Village).all()
    results: dict[str, float] = {}

    for village in villages:
        node = _get_or_create_virtual_rain_node(db, village)
        rainfall = _fetch_current_rainfall(village.lat, village.lng)

        if rainfall is None:
            # Offline fallback
            rainfall = _last_stored_rainfall(db, node)
            logger.info(
                "Offline fallback for %s: using last stored value %.1f mm",
                village.name,
                rainfall,
            )

        reading = Reading(
            node_id=node.id,
            ts=datetime.now(timezone.utc),
            value=rainfall,
            unit="mm",
            quality_flag="ok" if rainfall is not None else "stale",
        )
        db.add(reading)
        node.last_seen = datetime.now(timezone.utc)
        results[village.name] = rainfall

    db.commit()
    logger.info("Rainfall fetch complete for %d villages", len(results))
    return results


# ── CLI entry-point ──────────────────────────────────────
if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, stream=sys.stdout)

    from app.database import SessionLocal

    db = SessionLocal()
    try:
        res = fetch_rainfall_for_all_villages(db)
        for name, mm in res.items():
            print(f"  {name:25s}  {mm:6.1f} mm")
    finally:
        db.close()
