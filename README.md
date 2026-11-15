# 🌊 Xongket — Integrated Rural Disaster Management System for Assam

> IoT + AI + Cloud early-warning platform for flood and landslide disasters in rural Assam.

---

## Architecture Overview

```
┌──────────────┐   MQTT / HTTP   ┌───────────────┐   REST API   ┌──────────────┐
│  ESP32 Nodes │ ──────────────▶ │   Backend     │ ◀──────────▶ │  Dashboard   │
│  (firmware/) │                 │   (FastAPI)   │              │  (Next.js)   │
└──────────────┘                 │   backend/    │              │  dashboard/  │
                                 └───────┬───────┘              └──────────────┘
        ┌──────────────┐                 │
        │  Simulator   │ ───────────────▶│
        │  simulator/  │    synthetic    │
        └──────────────┘    readings     │
                                 ┌───────▼───────┐
                                 │   AI Engine   │
                                 │  (ai/)        │
                                 │  forecasting  │
                                 │  anomaly det. │
                                 └───────────────┘
```

| Component | Stack | Path |
|-----------|-------|------|
| **Backend** | FastAPI, Python 3.11+, Uvicorn | `backend/` |
| **AI Engine** | Python package (imported by backend) | `ai/` |
| **Simulator** | Python (stdlib) | `simulator/` |
| **Dashboard** | Next.js 14, TypeScript, Tailwind CSS | `dashboard/` |
| **Firmware** | ESP32, PlatformIO, Arduino | `firmware/` |
| **Docs** | Markdown | `docs/` |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| Git | 2.x |

---

## Setup

### 1 · Clone the repo

```bash
git clone <repo-url> xongket
cd xongket
```

### 2 · Backend (Python venv)

<details>
<summary><strong>Windows (PowerShell)</strong></summary>

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e ..\ai
cp .env.example .env
cd ..
```
</details>

<details>
<summary><strong>macOS / Linux</strong></summary>

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e ../ai
cp .env.example .env
cd ..
```
</details>

### 3 · Dashboard (Node)

```bash
cd dashboard
npm install
cp .env.example .env.local
cd ..
```

### 4 · Root dev dependencies

```bash
npm install          # installs `concurrently`
```

### 5 · Environment files

Copy each `.env.example` to `.env` (backend) and `.env.local` (dashboard) and edit as needed.

---

## Running in Development

From the project root:

```bash
npm run dev
```

This starts **both** servers concurrently:

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| Health check | http://localhost:8000/health |
| Dashboard | http://localhost:3000 |

> **Note (Windows):** The root `dev` script references `.venv/Scripts/python`. On macOS/Linux, edit `package.json` to use `.venv/bin/python` instead.

---

## Project Structure

```
xongket/
├── ai/                    # Forecasting & anomaly-detection package
│   ├── forecasting/
│   ├── anomaly/
│   └── pyproject.toml
├── backend/               # FastAPI server
│   ├── app/
│   │   ├── main.py        # App entry + /health endpoint
│   │   └── config.py      # Pydantic settings
│   ├── requirements.txt
│   └── .env.example
├── dashboard/             # Next.js 14 App Router + Tailwind
│   ├── src/app/
│   └── .env.example
├── firmware/              # ESP32 PlatformIO (empty scaffold)
│   ├── src/main.cpp
│   └── platformio.ini
├── simulator/             # Synthetic sensor data generator
│   └── main.py
├── docs/                  # Documentation
├── package.json           # Root scripts (concurrently)
├── .gitignore
└── README.md
```

---

## License

TBD
