"""Alert model."""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Severity(str, enum.Enum):
    advisory = "advisory"
    warning = "warning"
    danger = "danger"


class Hazard(str, enum.Enum):
    flood = "flood"
    landslide = "landslide"
    earthquake = "earthquake"


class AlertStatus(str, enum.Enum):
    active = "active"
    resolved = "resolved"
    expired = "expired"


class AlertSource(str, enum.Enum):
    rule = "rule"
    ai = "ai"
    manual = "manual"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    village_id: Mapped[int] = mapped_column(ForeignKey("villages.id"), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    hazard: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=AlertStatus.active.value
    )
    source: Mapped[str] = mapped_column(String(20), nullable=False)

    # relationships
    village = relationship("Village", back_populates="alerts")
    deliveries = relationship(
        "AlertDelivery", back_populates="alert", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Alert {self.id} {self.severity}/{self.hazard}>"

