"""
Async MQTT subscriber service using aiomqtt.
Subscribes to `sensors/{village_id}/{node_id}` and forwards telemetry
to the central `process_ingest_items` engine.

Only active when MQTT_ENABLED=true in settings.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

import aiomqtt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.schemas.ingest import ReadingIngestItem
from app.services.ingest import IngestionError, process_ingest_items

logger = logging.getLogger("xongket.mqtt")


async def handle_mqtt_message(message: aiomqtt.Message, db: Session) -> None:
    """Parse MQTT payload and forward to ingestion engine."""
    topic_str = str(message.topic)
    parts = topic_str.split("/")
    # Topic pattern: sensors/{village_id}/{node_id}
    if len(parts) < 3 or parts[0] != "sensors":
        logger.debug("Ignoring non-matching topic: %s", topic_str)
        return

    try:
        village_id = int(parts[1])
        node_id = int(parts[2])
    except ValueError:
        logger.warning("Invalid village_id or node_id in topic: %s", topic_str)
        return

    try:
        raw_payload = message.payload.decode("utf-8")
        data = json.loads(raw_payload)
    except Exception as err:
        logger.warning("Failed to decode JSON from topic %s: %s", topic_str, err)
        return

    # Extract reading fields
    try:
        ts = data.get("ts")
        if ts:
            ts_dt = datetime.fromisoformat(ts)
        else:
            ts_dt = datetime.now(timezone.utc)

        reading_item = ReadingIngestItem(
            node_id=node_id,
            ts=ts_dt,
            value=float(data["value"]),
            unit=str(data.get("unit", "")),
            battery_pct=data.get("battery_pct"),
        )
    except Exception as err:
        logger.warning("Invalid telemetry payload from node %d: %s", node_id, err)
        return

    api_key = data.get("api_key")
    # If api_key provided in MQTT payload, enforce auth; otherwise if authenticated at broker level, allow bypass
    bypass_auth = api_key is None

    try:
        process_ingest_items(
            db=db,
            items=[reading_item],
            api_key=api_key,
            bypass_auth=bypass_auth,
        )
        logger.info(
            "MQTT ingested node=%d val=%.2f %s (topic=%s)",
            node_id,
            reading_item.value,
            reading_item.unit,
            topic_str,
        )
    except IngestionError as err:
        logger.warning("MQTT ingestion rejected for node %d: %s", node_id, err.message)
    except Exception as err:
        logger.exception("Unexpected error ingesting MQTT message: %s", err)


async def run_mqtt_subscriber() -> None:
    """Background loop connecting to MQTT broker and listening for sensor messages."""
    broker = settings.mqtt_broker
    port = settings.mqtt_port
    topic = settings.mqtt_topic

    logger.info("Starting MQTT subscriber connecting to %s:%d, topic=%s", broker, port, topic)

    reconnect_interval = 3
    while True:
        try:
            client_kwargs = {
                "hostname": broker,
                "port": port,
            }
            if settings.mqtt_username:
                client_kwargs["username"] = settings.mqtt_username
            if settings.mqtt_password:
                client_kwargs["password"] = settings.mqtt_password

            async with aiomqtt.Client(**client_kwargs) as client:
                await client.subscribe(topic)
                logger.info("Connected and subscribed to MQTT topic: %s", topic)
                reconnect_interval = 3  # reset backoff

                async for message in client.messages:
                    # Create a scoped DB session per incoming message
                    db: Session = SessionLocal()
                    try:
                        await handle_mqtt_message(message, db)
                    finally:
                        db.close()

        except asyncio.CancelledError:
            logger.info("MQTT subscriber task cancelled; shutting down.")
            break
        except Exception as err:
            logger.warning(
                "MQTT connection failed (%s). Retrying in %d seconds...",
                err,
                reconnect_interval,
            )
            await asyncio.sleep(reconnect_interval)
            reconnect_interval = min(reconnect_interval * 2, 60)
