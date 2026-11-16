# 🌊 Xongket — Integrated Rural Disaster Management System for Assam

> IoT + AI + Cloud early-warning platform for flood and landslide disasters in rural Assam.

----

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
│  - SSD1306 OLED        │                 │  - POST /ingest pipeline  │
└────────────────────────┘                 │  - aiomqtt subscriber     │
                                           └─────────────┬─────────────┘
        ┌────────────────────────┐                       │
        │  Sensor Simulator      │ ──────────────────────┤
        │  simulator/ (ESP8266)  │  HTTP / MQTT          │
        └────────────────────────┘                       ▼
                                           ┌───────────────────────────┐
                                           │  AI Engine (ai/)          │
                                           │  - Flood / landslide fcst │
                                           │  - Sensor anomaly detect  │
                                           └───────────────────────────┘
```

| Component | Stack | Path |
|-----------|-------|------|
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy 2.0, Alembic, HTTPX, aiomqtt | `backend/` |
| **AI Engine** | Python package (imported by backend) | `ai/` |
| **Simulator** | Python CLI simulating 120 nodes across 5 disaster/fault scenarios | `simulator/` |
| **Dashboard** | Next.js 14, TypeScript, Tailwind CSS | `dashboard/` |
| **Firmware** | NodeMCU ESP8266 (PlatformIO / Arduino, ESP32 extensible) | `firmware/` |
| **Docs** | Markdown | `docs/` |

---

## IoT Data Ingestion Pipeline

### HTTP Ingestion: `POST /ingest`

Accepts a single telemetry reading or an array batch of readings.

**Headers:**
```http
X-API-Key: <per-node-api-key>
Content-Type: application/json
```

**Single Reading Payload:**
```json
{
  "node_id": 49,
  "ts": "2026-11-15T13:30:00Z",
  "value": 245.5,
  "unit": "cm",
  "battery_pct": 89.0
}
```

**Batch Payload (e.g. after network reconnection):**
```json
[
  { "node_id": 49, "ts": "2026-11-15T13:20:00Z", "value": 240.0, "unit": "cm", "battery_pct": 90.0 },
  { "node_id": 49, "ts": "2026-11-15T13:25:00Z", "value": 245.5, "unit": "cm", "battery_pct": 89.5 },
  { "node_id": 49, "ts": "2026-11-15T13:30:00Z", "value": 250.2, "unit": "cm", "battery_pct": 89.0 }
]
```

**Quality Flag Assessment:**
Each reading is evaluated and assigned a `quality_flag`:
- `ok`: Valid reading within realistic sensor and environmental ranges.
- `out_of_range`: Exceeds physical bounds (e.g. water level exceeding mount height, soil moisture > 100%, DHT11 temp > 65°C or < -20°C).
- `stuck_value`: 3 or more consecutive identical readings for non-zero sensors indicating sensor freeze.
- `duplicate_timestamp`: A reading already exists for `(node_id, ts)`.

---

## Optional MQTT Pipeline

The backend includes an asynchronous MQTT subscriber using `aiomqtt`. When enabled in `.env` via `MQTT_ENABLED=true`, it connects to an MQTT broker and subscribes to:

```
sensors/{village_id}/{node_id}
```

Incoming JSON messages are automatically forwarded to the ingestion engine.

### Installing Mosquitto Natively (No Docker)

<details>
<summary><strong>Windows</strong></summary>

1. Download the native 64-bit installer from [mosquitto.org/download](https://mosquitto.org/download/) (e.g., `mosquitto-2.x.x-install-windows-x64.exe`).
2. Run the installer (defaults to `C:\Program Files\mosquitto`).
3. Create or edit `mosquitto.conf` in that folder to allow local unauthenticated traffic if testing locally:
   ```text
   listener 1883
   allow_anonymous true
   ```
4. Start Mosquitto from an administrative PowerShell or cmd:
   ```powershell
   cd "C:\Program Files\mosquitto"
   .\mosquitto.exe -v -c mosquitto.conf
   ```
   Or start as a Windows Service:
   ```powershell
   net start mosquitto
   ```
</details>

<details>
<summary><strong>macOS</strong></summary>

1. Install via Homebrew:
   ```bash
   brew install mosquitto
   ```
2. Start the Mosquitto service:
   ```bash
   brew services start mosquitto
   ```
   Or run directly:
   ```bash
   /usr/local/sbin/mosquitto -c /usr/local/etc/mosquitto/mosquitto.conf
   # Apple Silicon:
   /opt/homebrew/sbin/mosquitto -c /opt/homebrew/etc/mosquitto/mosquitto.conf
   ```
</details>

<details>
<summary><strong>Linux (Debian / Ubuntu / Raspberry Pi OS)</strong></summary>

1. Install via apt:
   ```bash
   sudo apt update
   sudo apt install -y mosquitto mosquitto-clients
   ```
2. Enable and start systemd service:
   ```bash
   sudo systemctl enable mosquitto
   sudo systemctl start mosquitto
   sudo systemctl status mosquitto
   ```
</details>

---

## Telemetry Simulator

The simulator (`simulator/cli.py`) can generate telemetry for all 120 seeded nodes across 5 disaster, baseline, and failure scenarios.

### Simulator Scenarios

| Scenario | CLI Argument | Behavior & Telemetry Dynamics |
|----------|--------------|-------------------------------|
| **Normal** | `--scenario normal` | Safe baseline fluctuations across all sensors. Water levels 120–280 cm, light rainfall 0–8 mm, soil moisture 40–70%, temperature 26–32°C. |
| **Flood** | `--scenario flood` | Simulates a monsoon deluge. Heavy sustained rainfall (40 -> 130 mm/h) triggers rapidly rising river and pond water levels climbing past warning (600 cm) to critical danger (> 850 cm), accompanied by saturated soil. |
| **Landslide** | `--scenario landslide` | Continuous rain saturates hilly terrain. Soil moisture spikes past warning (80%) to critical liquid saturation (92%–98%), accompanied by elevated seismic micro-tremors (0.1 -> 1.0g). |
| **Sensor Fault** | `--scenario sensor_fault` | Injects telemetry defects to verify data cleaning: frozen stuck values, impossible out-of-range spikes (e.g. 5000 cm water level, 145°C DHT11), and duplicate timestamps. |
| **Network Outage** | `--scenario network_outage` | Simulates rural connectivity dropouts. Nodes go silent for 3 cycles, buffering readings locally in memory, then transmit the full backlog as a batch request when connectivity restores on cycle 4. |

### Running the Simulator

```bash
# 1. Normal baseline (infinite loop, 2s interval)
python -m simulator.cli --scenario normal --interval 2

# 2. Flood scenario in Majuli district (3 cycles, 1s interval)
python -m simulator.cli --scenario flood --interval 1 --cycles 3 --district Majuli

# 3. Landslide scenario in Dhemaji
python -m simulator.cli --scenario landslide --interval 1 --cycles 5 --district Dhemaji

# 4. Sensor fault injection test
python -m simulator.cli --scenario sensor_fault --cycles 4

# 5. Network outage buffer & batch recovery test
python -m simulator.cli --scenario network_outage --cycles 6

# 6. Stream telemetry over native MQTT instead of HTTP
python -m simulator.cli --scenario flood --mqtt --mqtt-broker localhost
```

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

### 3 · Run Full Unit Test Suite

```bash
python -m pytest tests/ -v
```

### 4 · Run Rainfall Fetcher (Open-Meteo Integration)

```bash
python -m app.services.rainfall
```

---

## 📢 Multi-Channel Alert Delivery Layer

Xongket includes a pluggable, carrier-grade alert delivery layer (`backend/app/services/channels/`):

- **Pluggable Interface**: `send(alert, contact) -> DeliveryResult`
- **Adapters**:
  - **SMS**: Mock adapter (default, logs to DB) and Twilio REST API adapter (`ALERT_SMS_PROVIDER=twilio`).
  - **Voice (IVR)**: Mock automated voice call (default) and Twilio Programmable Voice (`ALERT_VOICE_PROVIDER=twilio`) speaking localized warnings.
  - **WhatsApp**: Mock adapter (default) and Meta Cloud Graph API adapter (`ALERT_WHATSAPP_PROVIDER=meta`).
  - **Dashboard Push**: Real-time WebSocket live broadcast to connected officers.
  - **Siren Trigger**: IoT relay / hardware alarm activation for imminent flood danger.
- **Routing Rules by Severity**:
  - `advisory`: Dispatched to village **volunteers** only via SMS, WhatsApp, and Dashboard.
  - `warning`: Dispatched to **volunteers** and **Gram Panchayat** members via SMS, WhatsApp, IVR, and Dashboard.
  - `danger`: Dispatched to **all contacts** (volunteers, GP, ASDMA disaster officers) via SMS, WhatsApp, IVR, Dashboard, and activates the **village emergency siren**.
- **Multilingual Localization**: Automatic translation into Assamese (অসমীয়া), Bodo (बर'), Bengali (বাংলা), Hindi (हिन्दी), and English using verified flood/landslide templates.
- **Resilience**: Exponential backoff retries on transient network failures and per-village rate limiting to prevent notification spam.

---

## 📱 Rural Village Mode (`/village/[id]`)

Designed specifically for low-literacy users, cheap smartphones, and 2G/3G connections in rural riverine and char areas:
- **Massive Visual Symbols**: High-contrast, color-coded status cards (Green ✓ Safe / Amber ▲ Warning / Red ⚠ Danger).
- **Web Speech API Voice Readout**: One-tap `🔊 Listen to Alert` button that speaks the alert aloud in Assamese, Bengali, Bodo, or Hindi.
- **One-Touch Emergency Calling**: Direct phone buttons for the local village volunteer and the 24/7 ASDMA State Disaster Helpline (`1079`).
- **Shelter Navigation**: Names, capacities, and Google Maps directions to the nearest safe flood shelter.
- **Zero Heavy Bundles**: No canvas maps or charting libraries loaded on this route for sub-second loads on low-end hardware.

---

### 5 · Start Servers Concurrently

```bash
# From workspace root
npm install
npm run dev
```

---

## License

MIT License — free and open source for disaster management, humanitarian, and research use in Assam and beyond.
