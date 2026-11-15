"""Voice (IVR) channel adapter with Twilio and Mock providers."""

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

logger = logging.getLogger("xongket.channels.voice")


class VoiceProvider(ABC):
    """Abstract Voice / IVR telephony provider."""

    @abstractmethod
    def make_call(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
        language: str = "assamese",
    ) -> tuple[str, Optional[str], Optional[str]]:
        """Initiate automated IVR voice alert call.

        Returns (status: 'sent'|'failed', external_id, error_message).
        """
        pass


class MockVoiceProvider(VoiceProvider):
    """Mock IVR telephony provider simulating spoken voice alerts.

    Zero paid credentials required. Default for local & test environments.
    """

    def __init__(self, fail_count: int = 0):
        self.placed_calls: list[dict] = []
        self._fail_remaining = fail_count

    def make_call(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
        language: str = "assamese",
    ) -> tuple[str, Optional[str], Optional[str]]:
        if self._fail_remaining > 0:
            self._fail_remaining -= 1
            logger.warning("[MOCK IVR] Simulated transient SIP trunk busy for %s", to_phone)
            return "failed", None, "Simulated line busy / trunk failure"

        call_id = f"mock-call-{uuid.uuid4().hex[:10]}"
        record = {
            "to": to_phone,
            "message": message,
            "language": language,
            "alert_id": alert_id,
            "call_id": call_id,
            "timestamp": datetime.now(timezone.utc),
        }
        self.placed_calls.append(record)
        logger.info(
            "📞 [MOCK IVR CALL] to=%s alert_id=%d lang=%s speech='%s' (call_id=%s)",
            to_phone,
            alert_id,
            language,
            message[:80] + ("..." if len(message) > 80 else ""),
            call_id,
        )
        return "sent", call_id, None


class TwilioVoiceProvider(VoiceProvider):
    """Twilio programmable voice provider using TwiML <Say>."""

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None,
    ):
        self.account_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID", "")
        self.auth_token = auth_token or os.getenv("TWILIO_AUTH_TOKEN", "")
        self.from_number = from_number or os.getenv("TWILIO_FROM_NUMBER", "")

    def make_call(
        self,
        to_phone: str,
        message: str,
        alert_id: int,
        language: str = "assamese",
    ) -> tuple[str, Optional[str], Optional[str]]:
        if not self.account_sid or not self.auth_token or not self.from_number:
            logger.warning("[TWILIO IVR] Missing credentials, failing cleanly")
            return "failed", None, "Twilio voice credentials not configured"

        # Map language to Twilio Polly voice language if available (hi-IN fallback)
        tw_lang = "hi-IN" if language in ("hindi", "assamese", "bengali", "bodo") else "en-IN"
        twiml = f"<Response><Say voice='Polly.Aditi' language='{tw_lang}'>{message}</Say></Response>"
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls.json"
        data = {
            "From": self.from_number,
            "To": to_phone,
            "Twiml": twiml,
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, data=data, auth=(self.account_sid, self.auth_token))
                if resp.status_code in (200, 201):
                    sid = resp.json().get("sid", f"ca-{uuid.uuid4().hex[:8]}")
                    logger.info("📞 [TWILIO IVR CALL INITIATED] to=%s sid=%s", to_phone, sid)
                    return "sent", sid, None
                else:
                    err = f"Twilio Voice API HTTP {resp.status_code}: {resp.text}"
                    logger.error("[TWILIO IVR ERROR] %s", err)
                    return "failed", None, err
        except Exception as e:
            logger.error("[TWILIO IVR EXCEPTION] %s", e)
            return "failed", None, str(e)


class IVRAdapter(BaseChannelAdapter):
    """Voice (IVR) Channel Adapter matching the common interface."""

    def __init__(self, provider: Optional[VoiceProvider] = None):
        super().__init__(name="ivr")
        if provider is None:
            provider_type = os.getenv("ALERT_VOICE_PROVIDER", "mock").lower()
            if provider_type == "twilio":
                self.provider = TwilioVoiceProvider()
            else:
                self.provider = MockVoiceProvider()
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
        language = getattr(alert, "language", "assamese")

        status, ext_id, err = self.provider.make_call(
            to_phone=to_phone,
            message=text,
            alert_id=alert.id,
            language=language,
        )
        return DeliveryResult(
            channel=self.name,
            status=status,
            recipient=to_phone,
            message=text,
            external_id=ext_id,
            error=err,
            sent_at=now if status == "sent" else None,
        )
