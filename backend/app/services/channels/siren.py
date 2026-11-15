"""Siren trigger channel adapter for critical danger alerts."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from app.models.alert import Alert
from app.models.contact import Contact
from app.services.channels.base import BaseChannelAdapter, DeliveryResult

logger = logging.getLogger("xongket.channels.siren")


class SirenAdapter(BaseChannelAdapter):
    """Activates physical or simulated village emergency sirens."""

    def __init__(self):
        super().__init__(name="siren")
        self.triggered_events: list[dict] = []

    def send(
        self,
        alert: Alert,
        contact: Optional[Contact] = None,
    ) -> DeliveryResult:
        now = datetime.now(timezone.utc)
        record = {
            "village_id": alert.village_id,
            "alert_id": alert.id,
            "severity": alert.severity,
            "timestamp": now,
            "action": "SIREN_ACTIVATED",
            "duration_seconds": 180,
            "decibel_target": 110,
        }
        self.triggered_events.append(record)

        logger.critical(
            "🚨🔊 [EMERGENCY SIREN TRIGGERED] Village ID: %d | Alert: #%d (%s/%s) | Duration: 180s",
            alert.village_id,
            alert.id,
            alert.hazard,
            alert.severity,
        )

        return DeliveryResult(
            channel=self.name,
            status="sent",
            recipient=f"village_{alert.village_id}_siren",
            message=f"SIREN ACTIVATION: {alert.hazard.upper()} {alert.severity.upper()}",
            external_id=f"siren-v{alert.village_id}-{alert.id}",
            sent_at=now,
        )
