"""User model for role-based authentication (admin, district_officer, volunteer)."""

from __future__ import annotations

import enum

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    district_officer = "district_officer"
    volunteer = "volunteer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default=UserRole.volunteer.value)
    district_id: Mapped[int | None] = mapped_column(ForeignKey("districts.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    district = relationship("District")

    def __repr__(self) -> str:
        return f"<User {self.username} role={self.role}>"
