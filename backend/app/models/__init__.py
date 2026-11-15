"""ORM models package — import all models so Alembic can auto-detect them."""

from .district import District
from .village import Village
from .shelter import Shelter
from .node import Node
from .reading import Reading
from .threshold import Threshold
from .alert import Alert
from .alert_delivery import AlertDelivery
from .contact import Contact
from .user import User, UserRole

__all__ = [
    "District",
    "Village",
    "Shelter",
    "Node",
    "Reading",
    "Threshold",
    "Alert",
    "AlertDelivery",
    "Contact",
    "User",
    "UserRole",
]
