"""WhatsApp channel adapter with Meta Cloud API and Mock providers."""

from __future__ import annotations

import logging
import os
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.models.alert import Alert
from app.models.contact import Contact
from app.services.channels.base import BaseChannelAdapter, DeliveryResult

logger = logging.getLogger("xongket.channels.whatsapp")


class WhatsAppProvider(ABC):
    """Abstract WhatsApp transport provider."""

    @abstractmethod
    def send_whatsapp(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
    ) -> tuple[str, Optional[str], Optional[str]]:
        """Send WhatsApp alert message.

        Returns (status: 'sent'|'failed', external_id, error_message).
        """
        pass


class MockWhatsAppProvider(WhatsAppProvider):
    """Mock WhatsApp provider.

    Zero paid credentials required. Default for local & test environments.
    """

    def __init__(self, fail_count: int = 0):
        self.sent_messages: list[dict] = []
        self._fail_remaining = fail_count

    def send_whatsapp(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
    ) -> tuple[str, Optional[str], Optional[str]]:
        if self._fail_remaining > 0:
            self._fail_remaining -= 1
            logger.warning("[MOCK WHATSAPP] Simulated transient WhatsApp API failure for %s", to_phone)
            return "failed", None, "Simulated Meta Cloud API rate limit"

        external_id = f"mock-wa-{uuid.uuid4().hex[:10]}"
        record = {
            "to": to_phone,
            "message": message,
            "alert_id": alert_id,
            "external_id": external_id,
            "timestamp": datetime.now(timezone.utc),
        }
        self.sent_messages.append(record)
        logger.info(
            "💬 [MOCK WHATSAPP SENT] to=%s alert_id=%d text='%s' (id=%s)",
            to_phone,
            alert_id,
            message[:80] + ("..." if len(message) > 80 else ""),
            external_id,
        )
        return "sent", external_id, None


class MetaWhatsAppProvider(WhatsAppProvider):
    """Meta WhatsApp Cloud API provider."""

    def __init__(
        self,
        phone_number_id: Optional[str] = None,
        access_token: Optional[str] = None,
    ):
        self.phone_number_id = phone_number_id or os.getenv("META_WA_PHONE_NUMBER_ID", "")
        self.access_token = access_token or os.getenv("META_WA_ACCESS_TOKEN", "")

    def send_whatsapp(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
    ) -> tuple[str, Optional[str], Optional[str]]:
        if not self.phone_number_id or not self.access_token:
            logger.warning("[META WHATSAPP] Credentials missing, failing cleanly")
            return "failed", None, "Meta WhatsApp credentials not configured"

        # Sanitize target phone (remove '+' and spaces for Meta API)
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
        url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {"preview_url": False, "body": message},
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    msg_id = (
                        resp.json()
                        .get("messages", [{}])[0]
                        .get("id", f"wam-{uuid.uuid4().hex[:8]}")
                    )
                    logger.info("💬 [META WHATSAPP SENT] to=%s id=%s", to_phone, msg_id)
                    return "sent", msg_id, None
                else:
                    err = f"Meta WA API HTTP {resp.status_code}: {resp.text}"
                    logger.error("[META WHATSAPP ERROR] %s", err)
                    return "failed", None, err
        except Exception as e:
            logger.error("[META WHATSAPP EXCEPTION] %s", e)
            return "failed", None, str(e)


class WhatsAppAdapter(BaseChannelAdapter):
    """WhatsApp Channel Adapter matching the common interface."""

    def __init__(self, provider: Optional[WhatsAppProvider] = None):
        super().__init__(name="whatsapp")
        if provider is None:
            provider_type = os.getenv("ALERT_WHATSAPP_PROVIDER", "mock").lower()
            if provider_type == "meta":
                self.provider = MetaWhatsAppProvider()
            else:
                self.provider = MockWhatsAppProvider()
        else:
            self.provider = provider

    def send(
        self,
        alert: Alert,
        contact: Optional[Contact] = None,
    ) -> DeliveryResult:
        now = datetime.now(timezone.utc)
        to_phone = contact.phone if contact else "unknown"
        text = alert.message

        status, ext_id, err = self.provider.send_whatsapp(to_phone, text, alert.id)
        return DeliveryResult(
            channel=self.name,
            status=status,
            recipient=to_phone,
            message=text,
            external_id=ext_id,
            error=err,
            sent_at=now if status == "sent" else None,
        )
