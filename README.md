# 🌊 Xongket — Integrated Rural Disaster Management System for Assam

> IoT + AI + Cloud early-warning platform for flood and landslide disasters in rural Assam.

---

## Hardware Architecture

The physical deployment uses low-cost NodeMCU ESP8266 microcontrollers paired with local telemetry sensors:

| Component | Hardware Model | Telemetry / Purpose |
|-----------|----------------|---------------------|
| **MCU** | 3× NodeMCU ESP8266 (Wi-Fi) | Edge data collection & local OLED display |
| **Water Level** | HC-SR04 Ultrasonic | Distance measurement converted to water level (`water_level_cm = mount_height_cm - distance_cm`) |
| **Soil Moisture** | Capacitive Soil Moisture Sensor v2.0 | Analog reading (A0) calibrated via `raw_dry` and `raw_wet` ADC values to 0–100% |
| **Ambience** | DHT11 Digital Sensor | Ambient `temperature` (°C) and `humidity` (%) |
| **Display** | SSD1306 0.96" I2C OLED (128×64) | Local station status, latest readings, and warning indicators |
| **Rainfall** | Open-Meteo Free Weather API | Hourly precipitation (mm) fetched per village coordinates; stored as virtual `rain_gauge` nodes (`source=api`) with offline fallback |

---

## Architecture Overview

```
┌────────────────────────┐   HTTP / REST   ┌───────────────────────────┐   REST API   ┌──────────────┐
│  3× NodeMCU ESP8266    │ ──────────────▶ │  Backend (FastAPI)        │ ◀──────────▶ │  Dashboard   │
│  - HC-SR04 (water lvl) │                 │  backend/                 │              │  (Next.js)   │
│  - Capacitive Soil v2  │                 │  - SQLite (dev) / PG (prd)│              │  dashboard/  │
│  - DHT11 (temp & hum)  │                 │  - Open-Meteo rain sync   │              └──────────────┘
│  - SSD1306 OLED        │                 └─────────────┬─────────────┘
└────────────────────────┘                               │
                                                         │
        ┌────────────────────────┐                       │
        │  Sensor Simulator      │ ──────────────────────┤
        │  simulator/ (ESP8266)  │  synthetic readings   │
        └────────────────────────┘                       ▼
                                           ┌───────────────────────────┐
                                           │  AI Engine (ai/)          │
                                           │  - Flood / landslide fcst │
                                           │  - Sensor anomaly detect  │
                                           └───────────────────────────┘
```

| Component | Stack | Path |
|-----------|-------|------|
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy 2.0, Alembic, HTTPX | `backend/` |
| **AI Engine** | Python package (imported by backend) | `ai/` |
| **Simulator** | Python (simulates 3× ESP8266 stations + sensor noise & errors) | `simulator/` |
| **Dashboard** | Next.js 14, TypeScript, Tailwind CSS | `dashboard/` |
| **Firmware** | NodeMCU ESP8266 (PlatformIO / Arduino, ESP32 extensible) | `firmware/` |
| **Docs** | Markdown | `docs/` |

---

## Database Models

The database layer uses SQLAlchemy 2.0 and Alembic migrations, designed to run seamlessly on **SQLite (default)** and **PostgreSQL (production)** by changing only `DATABASE_URL`:

- **districts**: id, name, state (Assam)
- **villages**: id, district_id, name, lat, lng, population, language (`assamese`, `bodo`, `bengali`, `hindi`), `is_char_area`, `nearest_shelter_id`
- **shelters**: id, name, lat, lng, capacity
- **nodes**: id, village_id, type (`water_level`, `rain_gauge`, `soil_moisture`, `seismic`, `temperature`, `humidity`), lat, lng, status, battery_pct (nullable), last_seen, `device_type` (`esp8266`, `esp32`, `virtual`), `source` (`device`, `api`, `simulator`), `mount_height_cm` (for HC-SR04 calibration), `raw_dry` & `raw_wet` (for capacitive soil calibration)
- **readings**: id, node_id, ts, value, unit (`cm`, `mm`, `%`, `°C`), quality_flag (`ok`, `error`, `stale`), composite index on `(node_id, ts)`
- **thresholds**: id, node_type, village_id (nullable for global), warning_level, danger_level
- **alerts**: id, village_id, severity (`advisory`, `warning`, `danger`), hazard (`flood`, `landslide`, `earthquake`), message, created_at, status, source (`rule`, `ai`, `manual`)
- **alert_deliveries**: id, alert_id, channel (`sms`, `ivr`, `whatsapp`, `siren`, `dashboard`), status, sent_at
- **contacts**: id, village_id, name, phone, role (`volunteer`, `gram_panchayat`, `asdma`)

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| Git | 2.x |

---

## Setup & Quickstart

### 1 · Backend Environment

```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
pip install -e ../ai
cp .env.example .env
```

### 2 · Database Migration & Realistic Seed

```bash
# Run migrations
alembic upgrade head

# Seed realistic data for Dhemaji, Lakhimpur, Majuli, and Barpeta (including char areas)
python seed.py
```

### 3 · Run Model & Service Tests

```bash
python -m pytest tests/ -v
```

### 4 · Run Rainfall Fetcher (Open-Meteo Integration)

```bash
python -m app.services.rainfall
```

### 5 · Run Sensor Simulator (Hardware Mimic)

```bash
# From workspace root
python -m simulator.main
```

### 6 · Full Monorepo Development

```bash
# From workspace root
npm install
npm run dev
```

---

## License

TBD
