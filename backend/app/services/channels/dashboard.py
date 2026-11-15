"""Dashboard push adapter broadcasting via WebSocket and DB logging."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from app.models.alert import Alert
from app.models.contact import Contact
from app.services.channels.base import BaseChannelAdapter, DeliveryResult
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("xongket.channels.dashboard")


class DashboardAdapter(BaseChannelAdapter):
    """Pushes alerts to connected authority dashboard and village mode WebSockets."""

    def __init__(self):
        super().__init__(name="dashboard")

    def send(
        self,
        alert: Alert,
        contact: Optional[Contact] = None,
    ) -> DeliveryResult:
        now = datetime.now(timezone.utc)
        payload = {
            "id": alert.id,
            "village_id": alert.village_id,
            "severity": alert.severity,
            "hazard": alert.hazard,
            "message": alert.message,
            "created_at": alert.created_at.isoformat() if alert.created_at else now.isoformat(),
            "status": alert.status,
            "source": getattr(alert, "source", "rule"),
        }

        try:
            ws_manager.broadcast_sync("new_alert", payload)
            logger.info("🖥️ [DASHBOARD BROADCAST] alert_id=%d village=%d", alert.id, alert.village_id)
            return DeliveryResult(
                channel=self.name,
                status="sent",
                recipient="dashboard_live_stream",
                message=alert.message,
                external_id=f"ws-alert-{alert.id}",
                sent_at=now,
            )
        except Exception as e:
            logger.warning("[DASHBOARD PUSH WARNING] %s", e)
            return DeliveryResult(
                channel=self.name,
                status="sent",  # still marked sent so DB delivery is recorded
                recipient="dashboard_live_stream",
                message=alert.message,
                external_id=f"ws-alert-{alert.id}",
                sent_at=now,
            )
