"""Contact model — village-level emergency contacts."""

from __future__ import annotations

import enum

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class ContactRole(str, enum.Enum):
    volunteer = "volunteer"
    gram_panchayat = "gram_panchayat"
    asdma = "asdma"


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    village_id: Mapped[int] = mapped_column(ForeignKey("villages.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False)

    # relationships
    village = relationship("Village", back_populates="contacts")

    def __repr__(self) -> str:
        return f"<Contact {self.name} role={self.role}>"

