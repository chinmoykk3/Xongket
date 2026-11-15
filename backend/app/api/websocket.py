"""WebSocket endpoint for real-time telemetry and alert streaming."""

from __future__ import annotations

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import ws_manager

logger = logging.getLogger("xongket.ws")
router = APIRouter(tags=["Real-time Streaming"])


@router.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    """
    Real-time bidirectional WebSocket stream:
    - Streams new sensor readings (`type: "new_reading"`)
    - Streams new disaster alerts (`type: "new_alert"`)
    - Streams alert acknowledgement events (`type: "alert_acknowledged"`)
    """
    await ws_manager.connect(websocket)
    try:
        # Send initial welcome / connection confirmation
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to Xongket Live Telemetry & Alert Stream",
        })

        while True:
            # Keep connection alive; accept any client messages/pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as err:
        logger.debug("WebSocket client error: %s", err)
        await ws_manager.disconnect(websocket)
