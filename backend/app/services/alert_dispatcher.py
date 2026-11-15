"""
Alert Dispatcher and Multi-Channel Routing Engine for Xongket.

Enforces:
1. Routing rules by severity:
   - advisory: volunteers only (SMS, WhatsApp, Dashboard).
   - warning: volunteers + gram panchayat (SMS, WhatsApp, IVR, Dashboard).
   - danger: everyone (volunteers, gram panchayat, ASDMA) + Siren trigger.
2. Village language localization using translation templates.
3. Retries with exponential backoff for transient delivery failures.
4. Per-village rate limiting to prevent notification spam.
5. Persistent delivery status tracking in the `alert_deliveries` table.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Tuple

from sqlalchemy.orm import Session

from app.models.alert import Alert, Severity
from app.models.alert_delivery import AlertDelivery, DeliveryStatus
from app.models.contact import Contact
from app.models.village import Village
from app.services.channels.base import BaseChannelAdapter, DeliveryResult
from app.services.channels.dashboard import DashboardAdapter
from app.services.channels.siren import SirenAdapter
from app.services.channels.sms import SMSAdapter
from app.services.channels.voice import IVRAdapter
from app.services.channels.whatsapp import WhatsAppAdapter
from app.translations.alert_messages import get_alert_message

logger = logging.getLogger("xongket.alert_dispatcher")

# Role routing matrix by alert severity
SEVERITY_ROLES: dict[str, list[str]] = {
    Severity.advisory.value: ["volunteer"],
    Severity.warning.value: ["volunteer", "gram_panchayat"],
    Severity.danger.value: ["volunteer", "gram_panchayat", "asdma"],
}

# Channels activated by severity
SEVERITY_CHANNELS: dict[str, list[str]] = {
    Severity.advisory.value: ["sms", "whatsapp", "dashboard"],
    Severity.warning.value: ["sms", "whatsapp", "ivr", "dashboard"],
    Severity.danger.value: ["sms", "whatsapp", "ivr", "dashboard", "siren"],
}


class AlertDispatcher:
    """Dispatches alerts to recipients according to severity and village configuration."""

    def __init__(
        self,
        sms_adapter: Optional[SMSAdapter] = None,
        ivr_adapter: Optional[IVRAdapter] = None,
        whatsapp_adapter: Optional[WhatsAppAdapter] = None,
        dashboard_adapter: Optional[DashboardAdapter] = None,
        siren_adapter: Optional[SirenAdapter] = None,
        rate_limit_seconds: int = 300,  # 5 minute cooldown between non-danger dispatches
        max_retries: int = 3,
        retry_base_delay: float = 0.05,  # 50ms base delay for fast tests & async
    ):
        self.sms = sms_adapter or SMSAdapter()
        self.ivr = ivr_adapter or IVRAdapter()
        self.whatsapp = whatsapp_adapter or WhatsAppAdapter()
        self.dashboard = dashboard_adapter or DashboardAdapter()
        self.siren = siren_adapter or SirenAdapter()

        self.rate_limit_seconds = rate_limit_seconds
        self.max_retries = max_retries
        self.retry_base_delay = retry_base_delay

        # Tracking: (village_id, severity) -> last dispatch datetime
        self._last_dispatches: Dict[Tuple[int, str], datetime] = {}

    def get_adapter(self, channel: str) -> Optional[BaseChannelAdapter]:
        """Look up adapter by channel name."""
        channel_map = {
            "sms": self.sms,
            "ivr": self.ivr,
            "whatsapp": self.whatsapp,
            "dashboard": self.dashboard,
            "siren": self.siren,
        }
        return channel_map.get(channel.lower())

    def is_rate_limited(self, village_id: int, severity: str) -> bool:
        """
        Check if dispatches to this village for this severity are currently in cooldown.
        Critical 'danger' severity alerts bypass cooldown.
        """
        if severity == Severity.danger.value:
            return False

        key = (village_id, severity)
        last_time = self._last_dispatches.get(key)
        if not last_time:
            return False

        now = datetime.now(timezone.utc)
        elapsed = (now - last_time).total_seconds()
        return elapsed < self.rate_limit_seconds

    def record_dispatch(self, village_id: int, severity: str) -> None:
        """Update last dispatch timestamp for rate limiting."""
        self._last_dispatches[(village_id, severity)] = datetime.now(timezone.utc)

    def clear_rate_limits(self) -> None:
        """Clear rate limit history (useful for test isolation)."""
        self._last_dispatches.clear()

    def send_with_retry(
        self,
        adapter: BaseChannelAdapter,
        alert: Alert,
        contact: Optional[Contact] = None,
    ) -> DeliveryResult:
        """
        Send an alert via a channel adapter with exponential backoff retries.
        """
        last_result: Optional[DeliveryResult] = None
        for attempt in range(self.max_retries):
            try:
                res = adapter.send(alert=alert, contact=contact)
                if res.is_success:
                    return res
                last_result = res
                logger.warning(
                    "Channel %s delivery attempt %d failed: %s",
                    adapter.name,
                    attempt + 1,
                    res.error,
                )
            except Exception as e:
                logger.error("Channel %s exception on attempt %d: %s", adapter.name, attempt + 1, e)
                last_result = DeliveryResult(
                    channel=adapter.name,
                    status=DeliveryStatus.failed.value,
                    recipient=contact.phone if contact else None,
                    message=alert.message,
                    error=str(e),
                )

            # Sleep with exponential backoff if more attempts remain
            if attempt < self.max_retries - 1:
                delay = self.retry_base_delay * (2 ** attempt)
                time.sleep(delay)

        return last_result or DeliveryResult(
            channel=adapter.name,
            status=DeliveryStatus.failed.value,
            recipient=contact.phone if contact else None,
            message=alert.message,
            error="Exhausted all retries",
        )

    def dispatch_alert(
        self,
        alert: Alert,
        db: Session,
        bypass_rate_limit: bool = False,
    ) -> list[AlertDelivery]:
        """
        Main dispatch entry point:
        1. Rate limit check.
        2. Resolve village and language.
        3. Filter recipient contacts by severity routing rules.
        4. Broadcast to appropriate channels.
        5. Record AlertDelivery status in the database.
        """
        severity = alert.severity.lower()
        village = db.query(Village).filter(Village.id == alert.village_id).first()
        village_name = village.name if village else f"Village-{alert.village_id}"
        village_lang = village.language if village else "assamese"

        # Attach localized language for downstream IVR adapter
        setattr(alert, "language", village_lang)

        # Rate limiting check
        if not bypass_rate_limit and self.is_rate_limited(alert.village_id, severity):
            logger.info(
                "⏸️ [RATE LIMITED] Suppressing duplicate %s dispatch for village %d (%s)",
                severity,
                alert.village_id,
                village_name,
            )
            return []

        # Find eligible contacts for this severity
        allowed_roles = SEVERITY_ROLES.get(severity, ["volunteer"])
        contacts = (
            db.query(Contact)
            .filter(Contact.village_id == alert.village_id, Contact.role.in_(allowed_roles))
            .all()
        )

        channels = SEVERITY_CHANNELS.get(severity, ["dashboard"])
        deliveries: list[AlertDelivery] = []
        now = datetime.now(timezone.utc)

        # 1. Dashboard Broadcast (always for all severities)
        if "dashboard" in channels:
            dash_res = self.send_with_retry(self.dashboard, alert=alert, contact=None)
            d = AlertDelivery(
                alert_id=alert.id,
                channel="dashboard",
                status=dash_res.status,
                sent_at=dash_res.sent_at or now,
            )
            db.add(d)
            deliveries.append(d)

        # 2. Siren Broadcast (for danger severity)
        if "siren" in channels:
            siren_res = self.send_with_retry(self.siren, alert=alert, contact=None)
            d = AlertDelivery(
                alert_id=alert.id,
                channel="siren",
                status=siren_res.status,
                sent_at=siren_res.sent_at or now,
            )
            db.add(d)
            deliveries.append(d)

        # 3. Direct Contact Channels: SMS, WhatsApp, IVR
        for contact in contacts:
            # SMS
            if "sms" in channels:
                sms_res = self.send_with_retry(self.sms, alert=alert, contact=contact)
                d = AlertDelivery(
                    alert_id=alert.id,
                    channel="sms",
                    status=sms_res.status,
                    sent_at=sms_res.sent_at or now,
                )
                db.add(d)
                deliveries.append(d)

            # WhatsApp
            if "whatsapp" in channels:
                wa_res = self.send_with_retry(self.whatsapp, alert=alert, contact=contact)
                d = AlertDelivery(
                    alert_id=alert.id,
                    channel="whatsapp",
                    status=wa_res.status,
                    sent_at=wa_res.sent_at or now,
                )
                db.add(d)
                deliveries.append(d)

            # IVR / Voice
            if "ivr" in channels:
                ivr_res = self.send_with_retry(self.ivr, alert=alert, contact=contact)
                d = AlertDelivery(
                    alert_id=alert.id,
                    channel="ivr",
                    status=ivr_res.status,
                    sent_at=ivr_res.sent_at or now,
                )
                db.add(d)
                deliveries.append(d)

        db.flush()
        self.record_dispatch(alert.village_id, severity)

        logger.info(
            "🚀 Dispatched alert #%d (%s/%s) for %s to %d contacts across %d channel records",
            alert.id,
            alert.hazard,
            severity,
            village_name,
            len(contacts),
            len(deliveries),
        )

        return deliveries


# Global default dispatcher singleton
alert_dispatcher = AlertDispatcher()
