"""Base interface for disaster alert delivery channels."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from app.models.alert import Alert
from app.models.contact import Contact


@dataclass
class DeliveryResult:
    """Standard delivery result returned by all channel adapters."""

    channel: str
    status: str  # "sent", "delivered", "failed", "pending"
    recipient: Optional[str] = None
    message: Optional[str] = None
    external_id: Optional[str] = None
    error: Optional[str] = None
    sent_at: Optional[datetime] = None

    def __str__(self) -> str:
        return self.status

    @property
    def is_success(self) -> bool:
        return self.status in ("sent", "delivered")


class BaseChannelAdapter(ABC):
    """Common pluggable interface for all alert delivery channels.

    Signature: send(alert, contact) -> DeliveryResult / delivery status
    """

    name: str

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def send(
        self,
        alert: Alert,
        contact: Optional[Contact] = None,
    ) -> DeliveryResult:
        """Send an alert to a specific contact or broadcast channel.

        Returns a DeliveryResult indicating status (sent, delivered, failed).
        """
        pass
