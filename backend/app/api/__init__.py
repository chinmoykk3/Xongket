from .alerts import router as alerts_router
from .auth import router as auth_router
from .ingest import router as ingest_router
from .telemetry import router as telemetry_router
from .websocket import router as ws_router
from .ai import router as ai_router

__all__ = [
    "ingest_router",
    "telemetry_router",
    "alerts_router",
    "auth_router",
    "ws_router",
    "ai_router",
]
