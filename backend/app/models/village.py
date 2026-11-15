"""Village model."""

from __future__ import annotations

import enum

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Language(str, enum.Enum):
    assamese = "assamese"
    bodo = "bodo"
    bengali = "bengali"
    hindi = "hindi"


class Village(Base):
    __tablename__ = "villages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    language: Mapped[str] = mapped_column(String(20), nullable=False, default=Language.assamese.value)
    is_char_area: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    nearest_shelter_id: Mapped[int | None] = mapped_column(
        ForeignKey("shelters.id"), nullable=True
    )

    # relationships
    district = relationship("District", back_populates="villages")
    nearest_shelter = relationship("Shelter", foreign_keys=[nearest_shelter_id])
    nodes = relationship("Node", back_populates="village", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="village", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="village", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Village {self.name} ({self.district_id})>"

