"""District model."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class District(Base):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    state: Mapped[str] = mapped_column(String(60), nullable=False, default="Assam")

    # relationships
    villages = relationship("Village", back_populates="district", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<District {self.name}>"

