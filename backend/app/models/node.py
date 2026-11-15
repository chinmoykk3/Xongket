"""IoT sensor node model."""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class NodeType(str, enum.Enum):
    water_level = "water_level"
    rain_gauge = "rain_gauge"
    soil_moisture = "soil_moisture"
    seismic = "seismic"


class NodeStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    village_id: Mapped[int] = mapped_column(ForeignKey("villages.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=NodeStatus.active.value
    )
    battery_pct: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # relationships
    village = relationship("Village", back_populates="nodes")
    readings = relationship("Reading", back_populates="node", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Node {self.id} type={self.type} village={self.village_id}>"

