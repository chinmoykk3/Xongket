"""
Seed script — populates the database with realistic data for 4 flood-prone
Assam districts: Dhemaji, Lakhimpur, Majuli, Barpeta.

Hardware per ESP8266 board: HC-SR04 (water level), capacitive soil-moisture
V2.0, DHT11 (temperature + humidity), SSD1306 OLED display.

Usage:
    cd backend
    .venv/Scripts/python seed.py          # Windows
    .venv/bin/python seed.py              # macOS / Linux
"""

from datetime import datetime, timezone, timedelta
import random

from app.database import engine, SessionLocal, Base
from app.models import (
    District, Village, Shelter, Node, Reading,
    Threshold, Alert, AlertDelivery, Contact, User,
)
from app.services.auth import get_password_hash

random.seed(42)

# ─── Shelters ────────────────────────────────────────────
SHELTERS = [
    # Dhemaji shelters
    {"name": "Dhemaji High School Relief Camp", "lat": 27.4833, "lng": 94.5667, "capacity": 500},
    {"name": "Jonai Community Hall", "lat": 27.8300, "lng": 95.2200, "capacity": 350},
    {"name": "Sissiborgaon LP School", "lat": 27.4500, "lng": 94.5000, "capacity": 250},
    # Lakhimpur shelters
    {"name": "North Lakhimpur Stadium", "lat": 27.2353, "lng": 94.1035, "capacity": 800},
    {"name": "Dhakuakhana Block Relief Centre", "lat": 27.0700, "lng": 94.3200, "capacity": 400},
    {"name": "Bihpuria Community Centre", "lat": 27.0167, "lng": 93.9167, "capacity": 300},
    # Majuli shelters
    {"name": "Kamalabari Satra Hall", "lat": 26.9500, "lng": 94.1700, "capacity": 450},
    {"name": "Garamur High School", "lat": 26.9300, "lng": 94.2200, "capacity": 350},
    {"name": "Jengraimukh PHC", "lat": 26.9800, "lng": 94.3000, "capacity": 200},
    # Barpeta shelters
    {"name": "Barpeta Satra Compound", "lat": 26.3200, "lng": 91.0000, "capacity": 600},
    {"name": "Howly HS School", "lat": 26.4200, "lng": 90.9700, "capacity": 300},
    {"name": "Mandia Relief Camp", "lat": 26.4600, "lng": 90.8200, "capacity": 250},
]

# ─── Districts & Villages ────────────────────────────────
# fmt: off
DISTRICTS = {
    "Dhemaji": {
        "state": "Assam",
        "villages": [
            {"name": "Jonai",          "lat": 27.830, "lng": 95.220, "pop": 12500, "lang": "assamese", "char": False, "shelter_idx": 1},
            {"name": "Sissiborgaon",   "lat": 27.450, "lng": 94.500, "pop": 8300,  "lang": "assamese", "char": False, "shelter_idx": 2},
            {"name": "Machkhowa",      "lat": 27.500, "lng": 94.600, "pop": 4200,  "lang": "assamese", "char": False, "shelter_idx": 0},
            {"name": "Dhemaji Town",   "lat": 27.483, "lng": 94.567, "pop": 22000, "lang": "assamese", "char": False, "shelter_idx": 0},
            {"name": "Murkongselek",   "lat": 27.623, "lng": 95.183, "pop": 6700,  "lang": "bodo",     "char": False, "shelter_idx": 1},
            {"name": "Simen Chapori",  "lat": 27.550, "lng": 94.700, "pop": 1800,  "lang": "assamese", "char": True,  "shelter_idx": 2},
        ],
    },
    "Lakhimpur": {
        "state": "Assam",
        "villages": [
            {"name": "North Lakhimpur","lat": 27.235, "lng": 94.104, "pop": 30000, "lang": "assamese", "char": False, "shelter_idx": 3},
            {"name": "Narayanpur",     "lat": 27.200, "lng": 94.050, "pop": 5600,  "lang": "assamese", "char": False, "shelter_idx": 3},
            {"name": "Bihpuria",       "lat": 27.017, "lng": 93.917, "pop": 9400,  "lang": "assamese", "char": False, "shelter_idx": 5},
            {"name": "Laluk",          "lat": 27.100, "lng": 94.000, "pop": 7200,  "lang": "hindi",    "char": False, "shelter_idx": 5},
            {"name": "Dhakuakhana",    "lat": 27.070, "lng": 94.320, "pop": 11000, "lang": "assamese", "char": False, "shelter_idx": 4},
            {"name": "Majuli Chapori", "lat": 27.150, "lng": 94.200, "pop": 2300,  "lang": "assamese", "char": True,  "shelter_idx": 4},
        ],
    },
    "Majuli": {
        "state": "Assam",
        "villages": [
            {"name": "Kamalabari",     "lat": 26.950, "lng": 94.170, "pop": 15000, "lang": "assamese", "char": True,  "shelter_idx": 6},
            {"name": "Garamur",        "lat": 26.930, "lng": 94.220, "pop": 11000, "lang": "assamese", "char": True,  "shelter_idx": 7},
            {"name": "Auniati",        "lat": 26.960, "lng": 94.200, "pop": 8000,  "lang": "assamese", "char": True,  "shelter_idx": 6},
            {"name": "Salmora",        "lat": 26.920, "lng": 94.100, "pop": 5500,  "lang": "assamese", "char": True,  "shelter_idx": 7},
            {"name": "Jengraimukh",    "lat": 26.980, "lng": 94.300, "pop": 9200,  "lang": "assamese", "char": True,  "shelter_idx": 8},
            {"name": "Dakhinpat",      "lat": 26.910, "lng": 94.250, "pop": 6800,  "lang": "assamese", "char": True,  "shelter_idx": 7},
        ],
    },
    "Barpeta": {
        "state": "Assam",
        "villages": [
            {"name": "Barpeta Town",   "lat": 26.320, "lng": 91.000, "pop": 42000, "lang": "assamese", "char": False, "shelter_idx": 9},
            {"name": "Howly",          "lat": 26.420, "lng": 90.970, "pop": 18000, "lang": "assamese", "char": False, "shelter_idx": 10},
            {"name": "Sarthebari",     "lat": 26.340, "lng": 91.200, "pop": 13000, "lang": "assamese", "char": False, "shelter_idx": 9},
            {"name": "Baghbar",        "lat": 26.350, "lng": 90.850, "pop": 9800,  "lang": "bengali",  "char": False, "shelter_idx": 11},
            {"name": "Mandia",         "lat": 26.460, "lng": 90.820, "pop": 7500,  "lang": "assamese", "char": False, "shelter_idx": 11},
            {"name": "Kalgachia Char", "lat": 26.380, "lng": 90.900, "pop": 3200,  "lang": "bengali",  "char": True,  "shelter_idx": 11},
        ],
    },
}
# fmt: on

# Each physical ESP8266 board carries these 4 sensors:
#   HC-SR04 → water_level, Capacitive V2.0 → soil_moisture,
#   DHT11  → temperature + humidity
PHYSICAL_SENSOR_TYPES = ["water_level", "soil_moisture", "temperature", "humidity"]

NODE_UNITS = {
    "water_level":   "cm",
    "rain_gauge":    "mm",
    "soil_moisture": "%",
    "seismic":       "g",
    "temperature":   "°C",
    "humidity":      "%",
}

# ─── Default Thresholds ─────────────────────────────────
DEFAULT_THRESHOLDS = {
    "water_level":   {"warning": 600.0,  "danger": 850.0},   # cm
    "rain_gauge":    {"warning": 50.0,   "danger": 100.0},   # mm/h
    "soil_moisture": {"warning": 80.0,   "danger": 92.0},    # %
    "seismic":       {"warning": 0.5,    "danger": 1.2},     # g
    "temperature":   {"warning": 40.0,   "danger": 45.0},    # °C
    "humidity":      {"warning": 90.0,   "danger": 98.0},    # %
}

# ─── Contacts pool ──────────────────────────────────────
FIRST_NAMES = [
    "Ranjit", "Pranjal", "Bhaskar", "Manash", "Rituraj",
    "Dipika", "Nilakshi", "Pallavi", "Jyotirmoy", "Kamal",
    "Hemanta", "Lakshmi", "Biren", "Anjali", "Tapan",
    "Mridul", "Gitali", "Nayan", "Rukmini", "Pradip",
]
LAST_NAMES = [
    "Bora", "Hazarika", "Kalita", "Das", "Saikia",
    "Gogoi", "Baruah", "Nath", "Deka", "Phukan",
    "Sarma", "Medhi", "Choudhury", "Rajbongshi", "Koch",
]
ROLES = ["volunteer", "gram_panchayat", "asdma"]


def fake_phone() -> str:
    return f"+919{random.randint(100000000, 999999999)}"


def seed():
    """Create all tables and populate with realistic data."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(District).first():
            print("⚠  Database already seeded — skipping.")
            return

        # ── Shelters ─────────────────────────────────────
        shelter_objs = []
        for s in SHELTERS:
            obj = Shelter(**s)
            db.add(obj)
            shelter_objs.append(obj)
        db.flush()

        # ── Districts & Villages ─────────────────────────
        village_objs = []
        for dist_name, dist_data in DISTRICTS.items():
            district = District(name=dist_name, state=dist_data["state"])
            db.add(district)
            db.flush()
            for v in dist_data["villages"]:
                village = Village(
                    district_id=district.id,
                    name=v["name"],
                    lat=v["lat"],
                    lng=v["lng"],
                    population=v["pop"],
                    language=v["lang"],
                    is_char_area=v["char"],
                    nearest_shelter_id=shelter_objs[v["shelter_idx"]].id,
                )
                db.add(village)
                village_objs.append(village)
            db.flush()

        # ── Physical sensor nodes (ESP8266 boards) ───────
        now = datetime.now(timezone.utc)
        node_objs = []
        for village in village_objs:
            for sensor_type in PHYSICAL_SENSOR_TYPES:
                extra = dict(
                    device_type="esp8266",
                    source="device",
                    mount_height_cm=None,
                    raw_dry=None,
                    raw_wet=None,
                )
                if sensor_type == "water_level":
                    extra["mount_height_cm"] = round(random.uniform(300, 600), 1)
                elif sensor_type == "soil_moisture":
                    extra["raw_dry"] = random.randint(750, 850)
                    extra["raw_wet"] = random.randint(300, 420)

                node = Node(
                    village_id=village.id,
                    type=sensor_type,
                    lat=village.lat + random.uniform(-0.003, 0.003),
                    lng=village.lng + random.uniform(-0.003, 0.003),
                    status="active",
                    battery_pct=None,  # no battery monitoring
                    last_seen=now - timedelta(minutes=random.randint(0, 60)),
                    api_key=f"node_key_{village.id}_{sensor_type}",
                    **extra,
                )
                db.add(node)
                node_objs.append(node)
        db.flush()

        # ── Virtual rain_gauge nodes (source=api) ────────
        rain_nodes = []
        for village in village_objs:
            rain_node = Node(
                village_id=village.id,
                type="rain_gauge",
                lat=village.lat,
                lng=village.lng,
                status="active",
                battery_pct=None,
                last_seen=now,
                device_type="virtual",
                source="api",
                api_key=f"node_key_{village.id}_rain_gauge",
            )
            db.add(rain_node)
            rain_nodes.append(rain_node)
        db.flush()

        # ── Readings (5 recent per physical node) ────────
        for node in node_objs:
            unit = NODE_UNITS[node.type]
            for i in range(5):
                ts = now - timedelta(minutes=i * 15)
                if node.type == "water_level":
                    # HC-SR04 distance → water level
                    distance_cm = random.uniform(50, 350)
                    val = round(node.mount_height_cm - distance_cm, 1)
                    val = max(0, val)
                elif node.type == "soil_moisture":
                    # Raw ADC → 0-100%
                    raw = random.randint(node.raw_wet, node.raw_dry)
                    pct = (node.raw_dry - raw) / (node.raw_dry - node.raw_wet) * 100
                    val = round(max(0, min(100, pct)), 1)
                elif node.type == "temperature":
                    # DHT11: integer resolution, ±2°C, range 0-50°C
                    val = float(random.randint(22, 36))
                elif node.type == "humidity":
                    # DHT11: integer resolution, ±5%, range 20-90%
                    val = float(random.randint(55, 95))
                else:
                    val = round(random.uniform(0.0, 1.0), 2)

                # DHT11 occasional failed read (~5%)
                quality = "ok"
                if node.type in ("temperature", "humidity") and random.random() < 0.05:
                    quality = "error"
                    val = 0.0

                reading = Reading(
                    node_id=node.id, ts=ts, value=val, unit=unit, quality_flag=quality,
                )
                db.add(reading)

        # ── Seed rain readings (placeholder) ─────────────
        for rain_node in rain_nodes:
            for i in range(3):
                reading = Reading(
                    node_id=rain_node.id,
                    ts=now - timedelta(hours=i),
                    value=round(random.uniform(0.0, 15.0), 1),
                    unit="mm",
                    quality_flag="ok",
                )
                db.add(reading)

        # ── Default Thresholds ───────────────────────────
        for nt, levels in DEFAULT_THRESHOLDS.items():
            db.add(Threshold(
                node_type=nt, village_id=None,
                warning_level=levels["warning"], danger_level=levels["danger"],
            ))

        # ── Contacts (2-3 per village) ───────────────────
        for village in village_objs:
            for _ in range(random.randint(2, 3)):
                db.add(Contact(
                    village_id=village.id,
                    name=f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
                    phone=fake_phone(),
                    role=random.choice(ROLES),
                ))

        # ── Sample Alerts & Deliveries ───────────────────
        hazard_messages = {
            "flood": "Water level rising rapidly. Move to higher ground immediately.",
            "landslide": "Heavy rainfall detected. Potential landslide risk in hilly areas.",
        }
        char_villages = [v for v in village_objs if v.is_char_area]
        for v in char_villages[:4]:
            hazard = random.choice(["flood", "landslide"])
            severity = random.choice(["advisory", "warning", "danger"])
            alert = Alert(
                village_id=v.id, severity=severity, hazard=hazard,
                message=hazard_messages[hazard],
                created_at=now - timedelta(hours=random.randint(1, 48)),
                status="active", source=random.choice(["rule", "ai"]),
            )
            db.add(alert)
            db.flush()
            for channel in ["sms", "dashboard"]:
                db.add(AlertDelivery(
                    alert_id=alert.id, channel=channel,
                    status="sent" if channel == "dashboard" else "delivered",
                    sent_at=alert.created_at + timedelta(seconds=random.randint(5, 60)),
                ))

        # ── System Users (Auth) ──────────────────────────
        users_to_seed = [
            User(
                username="admin",
                email="admin@xongket.assam.gov.in",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True,
            ),
            User(
                username="officer_majuli",
                email="officer.majuli@xongket.assam.gov.in",
                hashed_password=get_password_hash("officer123"),
                role="district_officer",
                district_id=3,  # Majuli
                is_active=True,
            ),
            User(
                username="officer_dhemaji",
                email="officer.dhemaji@xongket.assam.gov.in",
                hashed_password=get_password_hash("officer123"),
                role="district_officer",
                district_id=1,  # Dhemaji
                is_active=True,
            ),
            User(
                username="volunteer_jonai",
                email="volunteer.jonai@gmail.com",
                hashed_password=get_password_hash("volunteer123"),
                role="volunteer",
                is_active=True,
            ),
        ]
        for u in users_to_seed:
            db.add(u)

        db.commit()

        # ── Summary ──────────────────────────────────────
        print("✅ Seed complete:")
        print(f"   Districts:    {db.query(District).count()}")
        print(f"   Villages:     {db.query(Village).count()}")
        print(f"   Shelters:     {db.query(Shelter).count()}")
        print(f"   Nodes total:  {db.query(Node).count()}")
        print(f"     ├ physical: {db.query(Node).filter(Node.source == 'device').count()}")
        print(f"     └ virtual:  {db.query(Node).filter(Node.source == 'api').count()}")
        print(f"   Readings:     {db.query(Reading).count()}")
        print(f"   Thresholds:   {db.query(Threshold).count()}")
        print(f"   Contacts:     {db.query(Contact).count()}")
        print(f"   Alerts:       {db.query(Alert).count()}")
        print(f"   Deliveries:   {db.query(AlertDelivery).count()}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
