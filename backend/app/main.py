"""FastAPI application entry-point for the Xongket backend."""

import asyncio
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.ingest import router as ingest_router
from .config import settings
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

    try:
        yield
    finally:
        if mqtt_task is not None:
            logger.info("Shutting down MQTT subscriber task...")
            mqtt_task.cancel()
            try:
                await mqtt_task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Integrated Rural Disaster Management System for Assam — IoT, AI & Cloud",
    lifespan=lifespan,
)

# Allow the Next.js dashboard during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(ingest_router)


@app.get("/health")
async def health_check():
    """Liveness probe — returns 200 when the server is up."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": "0.1.0",
    }
