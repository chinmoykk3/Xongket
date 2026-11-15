"""
Xongket IoT Telemetry Simulator CLI.

Simulates sensor telemetry for all seeded Assam village nodes across
multiple disaster, normal, and fault scenarios.
Transmits data via HTTP POST /ingest or MQTT.

Usage:
    python -m simulator.cli --scenario normal --interval 2
    python -m simulator.cli --scenario flood --interval 1 --cycles 10
    python -m simulator.cli --scenario landslide --interval 1 --cycles 8
    python -m simulator.cli --scenario sensor_fault --cycles 5
    python -m simulator.cli --scenario network_outage --cycles 6
    python -m simulator.cli --scenario flood --mqtt --mqtt-broker localhost
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import random
import sys
import time
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx

# Add backend to sys.path so we can read seeded nodes and database models directly
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import SessionLocal
from app.models.node import Node
from app.models.village import Village
from app.models.district import District

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("simulator")


def load_nodes_from_db(district_filter: str | None = None, village_filter: str | None = None) -> list[dict[str, Any]]:
    """Load node metadata and API keys from the seeded database."""
    db = SessionLocal()
    try:
        query = db.query(Node).join(Village).join(District)
        if district_filter:
            query = query.filter(District.name.ilike(f"%{district_filter}%"))
        if village_filter:
            query = query.filter(Village.name.ilike(f"%{village_filter}%"))

        nodes = query.all()
        node_records = []
        for n in nodes:
            node_records.append({
                "id": n.id,
                "village_id": n.village_id,
                "village_name": n.village.name,
                "district_name": n.village.district.name,
                "type": n.type,
                "api_key": n.api_key,
                "mount_height_cm": n.mount_height_cm or 450.0,
                "raw_dry": n.raw_dry or 820,
                "raw_wet": n.raw_wet or 380,
                "lat": n.lat,
                "lng": n.lng,
                "device_type": n.device_type,
            })
        return node_records
    finally:
        db.close()


def generate_reading_for_node(
    node: dict[str, Any],
    scenario: str,
    step: int,
    total_steps: int,
    last_reading_time: datetime,
) -> dict[str, Any]:
    """Generate a single reading payload based on the active scenario."""
    ntype = node["type"]
    mount_h = node["mount_height_cm"]
    ts = datetime.now(timezone.utc).isoformat()
    battery_pct = round(max(30.0, 95.0 - (step * 0.2) + random.uniform(-1, 1)), 1)
    unit = "cm"

    # ──────────────────────────────────────────────────────────
    # Scenario: NORMAL
    # Safe fluctuating conditions
    # ──────────────────────────────────────────────────────────
    if scenario == "normal":
        if ntype == "water_level":
            unit = "cm"
            # Safe water level: 120 - 280 cm (warning threshold is 600 cm)
            val = round(180.0 + 35.0 * math.sin(step * 0.3) + random.uniform(-5, 5), 1)
        elif ntype == "rain_gauge":
            unit = "mm"
            val = round(max(0.0, random.uniform(0.0, 8.0)), 1)
        elif ntype == "soil_moisture":
            unit = "%"
            val = round(max(10.0, min(75.0, 48.0 + random.uniform(-4, 4))), 1)
        elif ntype == "temperature":
            unit = "°C"
            val = round(28.0 + random.uniform(-2, 3), 1)
        elif ntype == "humidity":
            unit = "%"
            val = round(70.0 + random.uniform(-5, 5), 1)
        elif ntype == "seismic":
            unit = "g"
            val = round(max(0.0, random.uniform(0.01, 0.08)), 3)
        else:
            val = round(random.uniform(1.0, 10.0), 1)

    # ──────────────────────────────────────────────────────────
    # Scenario: FLOOD
    # Heavy rainfall -> water level rises past warning (600cm) then danger (850cm)
    # ──────────────────────────────────────────────────────────
    elif scenario == "flood":
        # Progress from 0.0 (normal) to 1.0 (peak flood)
        progress = min(1.0, step / max(1, total_steps - 1))

        if ntype == "rain_gauge":
            unit = "mm"
            # Rain starts at 20mm, climbs past warning (50mm) to extreme danger (120mm)
            val = round(20.0 + progress * 110.0 + random.uniform(-5, 5), 1)
        elif ntype == "water_level":
            unit = "cm"
            # Water level rises: 300cm -> 650cm (warning) -> 920cm (danger)
            base = 320.0 + progress * 620.0
            val = round(base + random.uniform(-4, 4), 1)
        elif ntype == "soil_moisture":
            unit = "%"
            # Soil moisture increases with rainfall: 55% -> 88%
            val = round(min(100.0, 55.0 + progress * 35.0 + random.uniform(-2, 2)), 1)
        elif ntype == "temperature":
            unit = "°C"
            val = round(24.0 - progress * 2.0 + random.uniform(-1, 1), 1)  # cooler during heavy monsoon
        elif ntype == "humidity":
            unit = "%"
            val = round(min(100.0, 85.0 + progress * 13.0 + random.uniform(-1, 1)), 1)
        elif ntype == "seismic":
            unit = "g"
            val = round(max(0.0, random.uniform(0.02, 0.1)), 3)
        else:
            val = round(random.uniform(5.0, 20.0), 1)

    # ──────────────────────────────────────────────────────────
    # Scenario: LANDSLIDE
    # Sustained heavy rain -> soil moisture spikes past warning (80%) then danger (92%)
    # ──────────────────────────────────────────────────────────
    elif scenario == "landslide":
        progress = min(1.0, step / max(1, total_steps - 1))

        if ntype == "soil_moisture":
            unit = "%"
            # Soil moisture spikes from 60% past 80% (warn) and 92% (danger) up to 98%
            val = round(min(99.0, 60.0 + progress * 38.0 + random.uniform(-1, 1)), 1)
        elif ntype == "rain_gauge":
            unit = "mm"
            val = round(60.0 + random.uniform(-10, 15), 1)
        elif ntype == "seismic":
            unit = "g"
            # Tremors and earth movement as slope destabilizes
            base_g = 0.05 + progress * 0.9
            val = round(base_g + random.uniform(-0.05, 0.2), 3)
        elif ntype == "water_level":
            unit = "cm"
            val = round(250.0 + progress * 150.0 + random.uniform(-5, 5), 1)
        elif ntype == "temperature":
            unit = "°C"
            val = round(25.0 + random.uniform(-1, 1), 1)
        elif ntype == "humidity":
            unit = "%"
            val = round(92.0 + random.uniform(-2, 2), 1)
        else:
            val = round(random.uniform(5.0, 15.0), 1)

    # ──────────────────────────────────────────────────────────
    # Scenario: SENSOR_FAULT
    # Injects stuck values, out-of-range spikes, duplicate timestamps
    # ──────────────────────────────────────────────────────────
    elif scenario == "sensor_fault":
        fault_type = (node["id"] + step) % 4
        if fault_type == 0:
            # Stuck value: exact constant across all cycles
            unit = "cm" if ntype == "water_level" else "%"
            val = 245.5
        elif fault_type == 1:
            # Out of range impossible spike
            if ntype == "water_level":
                unit = "cm"
                val = 4999.0  # impossible height
            elif ntype == "temperature":
                unit = "°C"
                val = 145.0  # impossible temperature
            elif ntype == "soil_moisture":
                unit = "%"
                val = 180.0  # > 100%
            else:
                unit = "mm"
                val = 999.0
        elif fault_type == 2:
            # Duplicate timestamp: reuse previous cycle's timestamp
            unit = "cm" if ntype == "water_level" else "°C"
            ts = last_reading_time.isoformat()
            val = 28.0
        else:
            # Normal baseline
            unit = "cm" if ntype == "water_level" else "%"
            val = 22.0

    else:
        unit = "cm"
        val = 100.0

    return {
        "node_id": node["id"],
        "village_id": node["village_id"],
        "village_name": node["village_name"],
        "node_type": ntype,
        "api_key": node["api_key"],
        "ts": ts,
        "value": val,
        "unit": unit,
        "battery_pct": battery_pct,
    }


def send_http_reading(url: str, reading: dict[str, Any], client: httpx.Client) -> bool:
    """Send a single reading via HTTP POST /ingest with X-API-Key header."""
    headers = {
        "X-API-Key": reading["api_key"],
        "Content-Type": "application/json",
    }
    payload = {
        "node_id": reading["node_id"],
        "ts": reading["ts"],
        "value": reading["value"],
        "unit": reading["unit"],
        "battery_pct": reading["battery_pct"],
    }
    try:
        resp = client.post(url, headers=headers, json=payload, timeout=5.0)
        if resp.status_code == 201:
            data = resp.json()
            r_info = data["readings"][0]
            logger.info(
                "HTTP POST [node=%d %-13s %s] -> %6.1f %-3s | flag=%-18s (status %d)",
                reading["node_id"],
                reading["village_name"],
                reading["node_type"],
                reading["value"],
                reading["unit"],
                r_info["quality_flag"],
                resp.status_code,
            )
            return True
        else:
            logger.warning(
                "HTTP POST rejected [node=%d]: %d %s",
                reading["node_id"],
                resp.status_code,
                resp.text,
            )
            return False
    except Exception as exc:
        logger.error("HTTP POST failed [node=%d]: %s", reading["node_id"], exc)
        return False


def send_http_batch(url: str, readings: list[dict[str, Any]], client: httpx.Client) -> bool:
    """Send a batch of readings for a single node via HTTP POST /ingest."""
    if not readings:
        return True

    api_key = readings[0]["api_key"]
    headers = {
        "X-API-Key": api_key,
        "Content-Type": "application/json",
    }
    payload = [
        {
            "node_id": r["node_id"],
            "ts": r["ts"],
            "value": r["value"],
            "unit": r["unit"],
            "battery_pct": r["battery_pct"],
        }
        for r in readings
    ]
    try:
        resp = client.post(url, headers=headers, json=payload, timeout=10.0)
        if resp.status_code == 201:
            data = resp.json()
            logger.info(
                "HTTP BATCH POST [%d readings for node=%d] -> Success (%d saved)",
                len(payload),
                readings[0]["node_id"],
                data["processed"],
            )
            return True
        else:
            logger.warning("HTTP BATCH rejected: %d %s", resp.status_code, resp.text)
            return False
    except Exception as exc:
        logger.error("HTTP BATCH POST failed: %s", exc)
        return False


def send_mqtt_reading(
    client: Any,
    reading: dict[str, Any],
) -> bool:
    """Publish reading to MQTT topic sensors/{village_id}/{node_id}."""
    topic = f"sensors/{reading['village_id']}/{reading['node_id']}"
    payload = {
        "ts": reading["ts"],
        "value": reading["value"],
        "unit": reading["unit"],
        "battery_pct": reading["battery_pct"],
        "api_key": reading["api_key"],
    }
    try:
        client.publish(topic, json.dumps(payload))
        logger.info(
            "MQTT PUB [%s] -> %6.1f %-3s",
            topic,
            reading["value"],
            reading["unit"],
        )
        return True
    except Exception as exc:
        logger.error("MQTT PUB failed [%s]: %s", topic, exc)
        return False


def run_simulator(
    scenario: str,
    interval: float,
    cycles: int | None,
    use_mqtt: bool,
    mqtt_broker: str,
    mqtt_port: int,
    url: str,
    district_filter: str | None,
    village_filter: str | None,
    limit_nodes: int | None = None,
):
    nodes = load_nodes_from_db(district_filter, village_filter)
    if not nodes:
        logger.error("No nodes found in database matching filter!")
        return

    if limit_nodes:
        nodes = nodes[:limit_nodes]

    logger.info("=" * 65)
    logger.info("🌊 Xongket IoT Telemetry Simulator")
    logger.info("   Scenario: %s", scenario.upper())
    logger.info("   Target:   %s", f"MQTT ({mqtt_broker}:{mqtt_port})" if use_mqtt else f"HTTP ({url})")
    logger.info("   Interval: %.1fs | Cycles: %s", interval, cycles if cycles else "infinite")
    logger.info("   Loaded:   %d nodes across Assam villages", len(nodes))
    logger.info("=" * 65)

    # Setup transport
    mqtt_client = None
    if use_mqtt:
        try:
            import paho.mqtt.client as paho_client
            mqtt_client = paho_client.Client(paho_client.CallbackAPIVersion.VERSION2)
            mqtt_client.connect(mqtt_broker, mqtt_port, 60)
            mqtt_client.loop_start()
            logger.info("Connected to MQTT broker at %s:%d", mqtt_broker, mqtt_port)
        except Exception as exc:
            logger.error("Failed to connect to MQTT broker: %s", exc)
            return

    http_client = httpx.Client()
    step = 0
    total_steps = cycles if cycles else 20
    last_timestamp = datetime.now(timezone.utc) - timedelta(minutes=5)

    # Buffer for network_outage scenario
    network_outage_buffer: dict[int, list[dict[str, Any]]] = {n["id"]: [] for n in nodes}

    try:
        while True:
            step += 1
            logger.info("─── Cycle %d / %s (Scenario: %s) ───", step, cycles or "∞", scenario.upper())

            # ──────────────────────────────────────────────────────────
            # Special Handling: NETWORK_OUTAGE
            # Outage occurs for cycles 1-3 (buffered), then dumps on cycle 4
            # ──────────────────────────────────────────────────────────
            if scenario == "network_outage":
                is_outage = (step % 4) != 0

                for node in nodes:
                    reading = generate_reading_for_node(node, "normal", step, total_steps, last_timestamp)
                    network_outage_buffer[node["id"]].append(reading)

                if is_outage:
                    logger.warning(
                        "🔴 NETWORK OUTAGE ACTIVE! Node telemetry buffered locally (%d items per node)",
                        len(network_outage_buffer[nodes[0]["id"]]),
                    )
                else:
                    logger.info("🟢 NETWORK RESTORED! Transmitting buffered telemetry in batches...")
                    for node in nodes:
                        buffered = network_outage_buffer[node["id"]]
                        if buffered:
                            send_http_batch(url, buffered, http_client)
                            network_outage_buffer[node["id"]] = []

            # ──────────────────────────────────────────────────────────
            # Standard Scenarios (Normal, Flood, Landslide, Sensor Fault)
            # ──────────────────────────────────────────────────────────
            else:
                for node in nodes:
                    reading = generate_reading_for_node(node, scenario, step, total_steps, last_timestamp)
                    if use_mqtt and mqtt_client:
                        send_mqtt_reading(mqtt_client, reading)
                    else:
                        send_http_reading(url, reading, http_client)

            last_timestamp = datetime.now(timezone.utc)

            if cycles is not None and step >= cycles:
                logger.info("Completed all %d requested cycles.", cycles)
                break

            time.sleep(interval)

    except KeyboardInterrupt:
        logger.info("Simulator stopped by user.")
    finally:
        http_client.close()
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()


def main():
    parser = argparse.ArgumentParser(
        description="Xongket IoT Telemetry Simulator for Rural Assam Disaster Warning"
    )
    parser.add_argument(
        "--scenario",
        choices=["normal", "flood", "landslide", "sensor_fault", "network_outage"],
        default="normal",
        help="Simulation scenario (default: normal)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Seconds between cycles (default: 2.0)",
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=None,
        help="Number of cycles to run (default: infinite)",
    )
    parser.add_argument(
        "--mqtt",
        action="store_true",
        help="Publish over MQTT instead of HTTP",
    )
    parser.add_argument(
        "--mqtt-broker",
        default="localhost",
        help="MQTT broker host (default: localhost)",
    )
    parser.add_argument(
        "--mqtt-port",
        type=int,
        default=1883,
        help="MQTT broker port (default: 1883)",
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000/ingest",
        help="Backend ingest URL (default: http://localhost:8000/ingest)",
    )
    parser.add_argument(
        "--district",
        default=None,
        help="Filter simulation to a specific district (e.g. Majuli, Dhemaji)",
    )
    parser.add_argument(
        "--village",
        default=None,
        help="Filter simulation to a specific village",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of nodes to simulate",
    )

    args = parser.parse_args()
    run_simulator(
        scenario=args.scenario,
        interval=args.interval,
        cycles=args.cycles,
        use_mqtt=args.mqtt,
        mqtt_broker=args.mqtt_broker,
        mqtt_port=args.mqtt_port,
        url=args.url,
        district_filter=args.district,
        village_filter=args.village,
        limit_nodes=args.limit,
    )


if __name__ == "__main__":
    main()
