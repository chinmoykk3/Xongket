"""Threshold model — alert trigger levels per node type and optional village."""

from __future__ import annotations

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Threshold(Base):
    __tablename__ = "thresholds"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    node_type: Mapped[str] = mapped_column(String(30), nullable=False)
    village_id: Mapped[int | None] = mapped_column(
        ForeignKey("villages.id"), nullable=True
    )
    warning_level: Mapped[float] = mapped_column(Float, nullable=False)
    danger_level: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self) -> str:
        return (
            f"<Threshold {self.node_type} warn={self.warning_level} "
            f"danger={self.danger_level}>"
        )

