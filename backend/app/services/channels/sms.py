"""SMS channel adapter with Twilio and Mock providers."""

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

logger = logging.getLogger("xongket.channels.sms")


class SMSProvider(ABC):
    """Abstract SMS transport provider."""

    @abstractmethod
    def send_sms(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
    ) -> tuple[str, Optional[str], Optional[str]]:
        """Send SMS.

        Returns (status: 'sent'|'failed', external_id, error_message).
        """
        pass


class MockSMSProvider(SMSProvider):
    """Mock SMS provider that logs to stdout/logger.

    Zero paid credentials required. Default for local & test environments.
    """

    def __init__(self, fail_count: int = 0):
        self.sent_messages: list[dict] = []
        self._fail_remaining = fail_count

    def send_sms(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
    ) -> tuple[str, Optional[str], Optional[str]]:
        if self._fail_remaining > 0:
            self._fail_remaining -= 1
            logger.warning("[MOCK SMS] Simulated transient gateway failure for %s", to_phone)
            return "failed", None, "Simulated SMS gateway timeout"

        external_id = f"mock-sms-{uuid.uuid4().hex[:10]}"
        record = {
            "to": to_phone,
            "message": message,
            "alert_id": alert_id,
            "external_id": external_id,
            "timestamp": datetime.now(timezone.utc),
        }
        self.sent_messages.append(record)
        logger.info(
            "📱 [MOCK SMS SENT] to=%s alert_id=%d text='%s' (id=%s)",
            to_phone,
            alert_id,
            message[:80] + ("..." if len(message) > 80 else ""),
            external_id,
        )
        return "sent", external_id, None


class TwilioSMSProvider(SMSProvider):
    """Production Twilio SMS provider via Twilio REST API."""

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None,
    ):
        self.account_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID", "")
        self.auth_token = auth_token or os.getenv("TWILIO_AUTH_TOKEN", "")
        self.from_number = from_number or os.getenv("TWILIO_FROM_NUMBER", "")

    def send_sms(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
    ) -> tuple[str, Optional[str], Optional[str]]:
        if not self.account_sid or not self.auth_token or not self.from_number:
            logger.warning("[TWILIO SMS] Missing credentials, falling back to mock failure")
            return "failed", None, "Twilio credentials not configured in environment"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        data = {
            "From": self.from_number,
            "To": to_phone,
            "Body": message,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, data=data, auth=(self.account_sid, self.auth_token))
                if resp.status_code in (200, 201):
                    sid = resp.json().get("sid", f"tw-{uuid.uuid4().hex[:8]}")
                    logger.info("📱 [TWILIO SMS SENT] to=%s sid=%s", to_phone, sid)
                    return "sent", sid, None
                else:
                    err = f"Twilio API HTTP {resp.status_code}: {resp.text}"
                    logger.error("[TWILIO SMS ERROR] %s", err)
                    return "failed", None, err
        except Exception as e:
            logger.error("[TWILIO SMS EXCEPTION] %s", e)
            return "failed", None, str(e)


class SMSAdapter(BaseChannelAdapter):
    """SMS Channel Adapter matching the common interface."""

    def __init__(self, provider: Optional[SMSProvider] = None):
        super().__init__(name="sms")
        if provider is None:
            provider_type = os.getenv("ALERT_SMS_PROVIDER", "mock").lower()
            if provider_type == "twilio":
                self.provider = TwilioSMSProvider()
            else:
                self.provider = MockSMSProvider()
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

        status, ext_id, err = self.provider.send_sms(to_phone, text, alert.id)
        return DeliveryResult(
            channel=self.name,
            status=status,
            recipient=to_phone,
            message=text,
            external_id=ext_id,
            error=err,
            sent_at=now if status == "sent" else None,
        )
