"""FastAPI application entry-point for the Xongket backend."""

import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    ai_router,
    alerts_router,
    auth_router,
    ingest_router,
    telemetry_router,
    ws_router,
)
from .config import settings
from .services.forecast_scheduler import shutdown_forecast_scheduler, start_forecast_scheduler
from .services.mqtt_subscriber import run_mqtt_subscriber

logger = logging.getLogger("xongket")


@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_task = None
    if settings.mqtt_enabled:
        logger.info("MQTT_ENABLED=true. Launching async MQTT subscriber...")
        mqtt_task = asyncio.create_task(run_mqtt_subscriber())
    else:
        logger.info("MQTT_ENABLED=false. Skipping MQTT subscriber startup.")

    # Start APScheduler for AI flood forecasts
    start_forecast_scheduler()

    try:
        yield
    finally:
        shutdown_forecast_scheduler()
        if mqtt_task is not None:
            logger.info("Shutting down MQTT subscriber task...")
            mqtt_task.cancel()
            try:
                await mqtt_task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="Integrated Rural Disaster Management System for Assam — IoT, AI & Cloud",
    lifespan=lifespan,
)

# Allow dashboard / local clients during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(auth_router)
app.include_router(ingest_router)
app.include_router(telemetry_router)
app.include_router(alerts_router)
app.include_router(ws_router)
app.include_router(ai_router)


@app.get("/health")
async def health_check():
    """Liveness probe — returns 200 when the server is up."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "0.2.0",
    }
