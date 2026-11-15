"""Pluggable channel adapters package for multi-channel alert delivery."""

from app.services.channels.base import BaseChannelAdapter, DeliveryResult
from app.services.channels.dashboard import DashboardAdapter
from app.services.channels.siren import SirenAdapter
from app.services.channels.sms import (
    MockSMSProvider,
    SMSAdapter,
    SMSProvider,
    TwilioSMSProvider,
)
from app.services.channels.voice import (
    IVRAdapter,
    MockVoiceProvider,
    TwilioVoiceProvider,
    VoiceProvider,
)
from app.services.channels.whatsapp import (
    MetaWhatsAppProvider,
    MockWhatsAppProvider,
    WhatsAppAdapter,
    WhatsAppProvider,
)

__all__ = [
    "BaseChannelAdapter",
    "DeliveryResult",
    "SMSAdapter",
    "SMSProvider",
    "MockSMSProvider",
    "TwilioSMSProvider",
    "IVRAdapter",
    "VoiceProvider",
    "MockVoiceProvider",
    "TwilioVoiceProvider",
    "WhatsAppAdapter",
    "WhatsAppProvider",
    "MockWhatsAppProvider",
    "MetaWhatsAppProvider",
    "DashboardAdapter",
    "SirenAdapter",
]
