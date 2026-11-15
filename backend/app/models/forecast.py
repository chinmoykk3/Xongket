"""Forecast model for storing multi-horizon AI water-level predictions."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .node import Node


class Forecast(Base):
    __tablename__ = "forecasts"
    __table_args__ = (
        Index("ix_forecasts_node_target", "node_id", "target_ts"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("nodes.id"), nullable=False, index=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    target_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    horizon_hours: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 3, or 6
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound: Mapped[float] = mapped_column(Float, nullable=False)
    upper_bound: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="cm")
    model_name: Mapped[str] = mapped_column(
        String(100), nullable=False, default="HistGradientBoosting-Quantile"
    )
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    node: Mapped["Node"] = relationship("Node", backref="forecasts")

    def __repr__(self) -> str:
        return (
            f"<Forecast(node_id={self.node_id}, horizon={self.horizon_hours}h, "
            f"pred={self.predicted_value}, bounds=[{self.lower_bound}, {self.upper_bound}])>"
        )
