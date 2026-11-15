"""Sensor reading model."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Reading(Base):
    __tablename__ = "readings"
    __table_args__ = (
        Index("ix_readings_node_ts", "node_id", "ts"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id"), nullable=False)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    quality_flag: Mapped[str] = mapped_column(String(30), nullable=False, default="ok")

    # relationships
    node = relationship("Node", back_populates="readings")

    def __repr__(self) -> str:
        return f"<Reading node={self.node_id} ts={self.ts} val={self.value}>"

