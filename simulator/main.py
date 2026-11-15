"""
Sensor simulator — generates synthetic IoT readings matching the actual
hardware: 3× NodeMCU ESP8266, each with HC-SR04 (water level), capacitive
soil-moisture V2.0, and DHT11 (temperature + humidity).

Features:
  • HC-SR04 distance → water-level conversion (mount_height - distance)
  • Capacitive soil-moisture raw ADC → 0-100% via calibration
  • DHT11-style integer resolution, ±2°C / ±5% noise
  • ~5% chance of DHT11 failed reads (NaN)
  • Simulated rain from Open-Meteo-style random data

Usage:  python -m simulator.main
"""

import json
import math
import random
import time
from datetime import datetime, timezone

# ── Configuration ────────────────────────────────────────

STATIONS = [
    {
        "station_id": "ESP8266-001",
        "village": "Kamalabari",
        "lat": 26.950,
        "lng": 94.170,
        "mount_height_cm": 450.0,
        "raw_dry": 820,
        "raw_wet": 380,
    },
    {
        "station_id": "ESP8266-002",
        "village": "Simen Chapori",
        "lat": 27.550,
        "lng": 94.700,
        "mount_height_cm": 380.0,
        "raw_dry": 790,
        "raw_wet": 350,
    },
    {
        "station_id": "ESP8266-003",
        "village": "Kalgachia Char",
        "lat": 26.380,
        "lng": 90.900,
        "mount_height_cm": 520.0,
        "raw_dry": 840,
        "raw_wet": 400,
    },
]

DHT11_FAIL_RATE = 0.05  # 5% chance of failed read


def _hcsr04_reading(mount_height_cm: float) -> dict:
    """Simulate HC-SR04 ultrasonic distance → water level."""
    # HC-SR04 range: 2-400 cm, ±3mm accuracy
    distance_cm = random.uniform(30, mount_height_cm - 10)
    distance_cm += random.gauss(0, 0.3)  # sensor noise
    distance_cm = max(2, min(400, distance_cm))

    water_level_cm = round(mount_height_cm - distance_cm, 1)
    water_level_cm = max(0, water_level_cm)

    return {
        "type": "water_level",
        "raw_distance_cm": round(distance_cm, 1),
        "value": water_level_cm,
        "unit": "cm",
        "quality": "ok",
    }


def _soil_moisture_reading(raw_dry: int, raw_wet: int) -> dict:
    """Simulate capacitive soil-moisture V2.0 (analog ADC)."""
    # ESP8266 has 10-bit ADC (0-1023)
    raw = random.randint(raw_wet - 20, raw_dry + 20)
    raw = max(0, min(1023, raw))

    # Convert to percentage
    pct = (raw_dry - raw) / (raw_dry - raw_wet) * 100
    pct = round(max(0, min(100, pct)), 1)

    return {
        "type": "soil_moisture",
        "raw_adc": raw,
        "value": pct,
        "unit": "%",
        "quality": "ok",
    }


def _dht11_reading() -> list[dict]:
    """Simulate DHT11 temperature + humidity with realistic noise.

    DHT11 specs:
      Temperature: 0-50°C, ±2°C, integer resolution
      Humidity:    20-80%, ±5%, integer resolution
      ~5% read failure rate
    """
    readings = []

    # Temperature
    if random.random() < DHT11_FAIL_RATE:
        readings.append({
            "type": "temperature",
            "value": None,
            "unit": "°C",
            "quality": "error",
        })
    else:
        base_temp = 28 + 6 * math.sin(time.time() / 3600)  # diurnal cycle
        noise = random.choice([-2, -1, 0, 0, 0, 1, 1, 2])  # ±2°C
        temp = int(round(base_temp + noise))
        temp = max(0, min(50, temp))
        readings.append({
            "type": "temperature",
            "value": float(temp),
            "unit": "°C",
            "quality": "ok",
        })

    # Humidity
    if random.random() < DHT11_FAIL_RATE:
        readings.append({
            "type": "humidity",
            "value": None,
            "unit": "%",
            "quality": "error",
        })
    else:
        base_hum = 72 + 10 * math.sin(time.time() / 7200)
        noise = random.choice([-5, -3, -1, 0, 0, 1, 3, 5])  # ±5%
        hum = int(round(base_hum + noise))
        hum = max(20, min(80, hum))
        readings.append({
            "type": "humidity",
            "value": float(hum),
            "unit": "%",
            "quality": "ok",
        })

    return readings


def generate_station_payload(station: dict) -> dict:
    """Generate a full sensor payload for one ESP8266 station."""
    readings = [
        _hcsr04_reading(station["mount_height_cm"]),
        _soil_moisture_reading(station["raw_dry"], station["raw_wet"]),
    ]
    readings.extend(_dht11_reading())

    return {
        "station_id": station["station_id"],
        "village": station["village"],
        "device_type": "esp8266",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "readings": readings,
    }


def main():
    print("🌊 Xongket sensor simulator — 3× ESP8266 + HC-SR04/Soil/DHT11")
    print("   Ctrl+C to stop\n")

    cycle = 0
    while True:
        cycle += 1
        print(f"─── cycle {cycle} ───")
        for station in STATIONS:
            payload = generate_station_payload(station)
            print(json.dumps(payload, indent=2, default=str))
        print()
        time.sleep(5)


if __name__ == "__main__":
    main()
