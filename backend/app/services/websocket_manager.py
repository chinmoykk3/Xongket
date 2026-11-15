"""
WebSocket Connection Manager for live streaming telemetry and alert updates.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("xongket.ws")


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info("WebSocket client connected. Total clients: %d", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info("WebSocket client disconnected. Total clients: %d", len(self.active_connections))

    async def broadcast(self, event_type: str, data: dict[str, Any]):
        """Broadcast JSON message to all active WebSocket clients."""
        if not self.active_connections:
            return

        message = json.dumps({"type": event_type, "data": data}, default=str)
        async with self._lock:
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except Exception as err:
                    logger.debug("Failed to send to client (%s), queuing removal", err)
                    disconnected.append(connection)

            for conn in disconnected:
                if conn in self.active_connections:
                    self.active_connections.remove(conn)

    def broadcast_sync(self, event_type: str, data: dict[str, Any]):
        """Safely schedule a broadcast on the running asyncio event loop if active."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(event_type, data))
        except RuntimeError:
            pass


ws_manager = ConnectionManager()
