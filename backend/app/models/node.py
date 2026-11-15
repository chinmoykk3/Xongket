"""IoT sensor node model."""

from __future__ import annotations

import enum
import secrets
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class NodeType(str, enum.Enum):
    water_level = "water_level"
    rain_gauge = "rain_gauge"
    soil_moisture = "soil_moisture"
    seismic = "seismic"
    temperature = "temperature"
    humidity = "humidity"


class NodeStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"


class DeviceType(str, enum.Enum):
    esp8266 = "esp8266"
    esp32 = "esp32"
    virtual = "virtual"


class NodeSource(str, enum.Enum):
    device = "device"
    api = "api"
    simulator = "simulator"


def generate_node_api_key() -> str:
    return secrets.token_hex(16)


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
    battery_pct: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Hardware identity & security ─────────────────────
    api_key: Mapped[str] = mapped_column(
        String(64), nullable=False, default=generate_node_api_key, index=True
    )
    device_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=DeviceType.esp8266.value
    )
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default=NodeSource.device.value
    )

    # ── Water-level calibration (HC-SR04) ────────────────
    # Distance from sensor to river-bed / floor in cm.
    # water_level_cm = mount_height_cm - measured_distance_cm
    mount_height_cm: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)

    # ── Soil-moisture calibration (capacitive V2.0) ──────
    # Raw 10-bit ADC value when sensor is completely dry / submerged.
    raw_dry: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)
    raw_wet: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)

    # relationships
    village = relationship("Village", back_populates="nodes")
    readings = relationship("Reading", back_populates="node", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Node {self.id} type={self.type} dev={self.device_type} village={self.village_id}>"
