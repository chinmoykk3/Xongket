"""APScheduler runner for periodic AI flood forecasting.

Periodically computes multi-horizon water level forecasts every 10 minutes
(configurable via FORECAST_INTERVAL_MINUTES) across all active river stations.
"""

from __future__ import annotations

import logging
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import SessionLocal
from app.services.forecast_service import run_all_node_forecasts

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None


def scheduled_forecast_job() -> None:
    """Scheduled task executed every N minutes."""
    logger.info("Executing scheduled multi-horizon flood forecasting run...")
    db = SessionLocal()
    try:
        forecasts = run_all_node_forecasts(db)
        logger.info(
            "Scheduled forecast cycle finished. Generated and saved %d forecast horizons.",
            len(forecasts),
        )
    except Exception as exc:
        logger.error("Error during scheduled forecast cycle: %s", exc, exc_info=True)
    finally:
        db.close()


def start_forecast_scheduler() -> Optional[BackgroundScheduler]:
    """Start the APScheduler background runner if enabled."""
    global _scheduler
    if not settings.forecast_scheduler_enabled:
        logger.info("AI forecast scheduler is disabled in configuration.")
        return None

    if _scheduler is not None and _scheduler.running:
        return _scheduler

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        scheduled_forecast_job,
        trigger="interval",
        minutes=settings.forecast_interval_minutes,
        id="xongket_flood_forecasting_job",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        "Started AI Flood Forecasting Scheduler (interval=%d minutes)",
        settings.forecast_interval_minutes,
    )
    return _scheduler


def shutdown_forecast_scheduler() -> None:
    """Gracefully terminate background scheduler."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Stopped AI Flood Forecasting Scheduler.")
        _scheduler = None
