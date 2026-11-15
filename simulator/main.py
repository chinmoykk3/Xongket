"""
Sensor simulator — generates synthetic IoT readings
(water-level, rainfall, soil-moisture, vibration) for local testing.

Usage:  python -m simulator.main
"""

import random
import time
import json
from datetime import datetime, timezone


SENSOR_TYPES = {
    "water_level_m": (0.5, 12.0),
    "rainfall_mm": (0.0, 80.0),
    "soil_moisture_pct": (10.0, 95.0),
    "vibration_g": (0.0, 2.5),
}


def generate_reading() -> dict:
    """Return one synthetic sensor payload."""
    return {
        "station_id": f"STA-{random.randint(1, 20):03d}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "readings": {
            name: round(random.uniform(*bounds), 2)
            for name, bounds in SENSOR_TYPES.items()
        },
    }


def main():
    print("🌊 Xongket sensor simulator running — Ctrl+C to stop")
    while True:
        payload = generate_reading()
        print(json.dumps(payload, indent=2))
        time.sleep(2)


if __name__ == "__main__":
    main()

