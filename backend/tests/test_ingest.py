"""
Unit tests for sensor telemetry ingestion:
- Validation via Pydantic
- Authentication via per-node API key header (and optional master key)
- Quality flag assignment (ok, out_of_range, stuck_value, duplicate_timestamp)
- Node metadata updates (battery_pct, last_seen)
- Batch telemetry ingest
- MQTT message handler logic
"""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import District, Village, Node, Reading
from app.services.ingest import process_ingest_items, IngestionError
from app.services.mqtt_subscriber import handle_mqtt_message


@pytest.fixture()
def client(db_session):
    """TestClient that overrides get_db dependency with test in-memory session."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def sample_node(db_session):
    """Fixture providing a seeded district, village, and node."""
    district = District(name="Majuli", state="Assam")
    db_session.add(district)
    db_session.flush()

    village = Village(
        district_id=district.id,
        name="Kamalabari",
        lat=26.95,
        lng=94.17,
        population=15000,
        language="assamese",
        is_char_area=True,
    )
    db_session.add(village)
    db_session.flush()

    node = Node(
        village_id=village.id,
        type="water_level",
        lat=26.95,
        lng=94.17,
        status="active",
        battery_pct=95.0,
        api_key="test-node-key-12345",
        device_type="esp8266",
        source="device",
        mount_height_cm=500.0,
        last_seen=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db_session.add(node)
    db_session.commit()
    db_session.refresh(node)
    return node


# ═══════════════════════════════════════════════════════
# Authentication Tests
# ═══════════════════════════════════════════════════════
class TestIngestAuth:
    def test_missing_api_key_header(self, client, sample_node):
        payload = {
            "node_id": sample_node.id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "value": 150.0,
            "unit": "cm",
        }
        resp = client.post("/ingest", json=payload)
        assert resp.status_code == 401
        assert "Missing X-API-Key" in resp.json()["detail"]

    def test_invalid_api_key_header(self, client, sample_node):
        payload = {
            "node_id": sample_node.id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "value": 150.0,
            "unit": "cm",
        }
        resp = client.post("/ingest", json=payload, headers={"X-API-Key": "wrong-key"})
        assert resp.status_code == 401
        assert "Invalid API key" in resp.json()["detail"]

    def test_valid_api_key_header(self, client, sample_node):
        payload = {
            "node_id": sample_node.id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "value": 150.0,
            "unit": "cm",
        }
        resp = client.post("/ingest", json=payload, headers={"X-API-Key": sample_node.api_key})
        assert resp.status_code == 201
        assert resp.json()["status"] == "success"
        assert resp.json()["processed"] == 1

    @patch("app.services.ingest.settings.master_api_key", "secret-master-key")
    def test_master_api_key_header(self, client, sample_node):
        payload = {
            "node_id": sample_node.id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "value": 150.0,
            "unit": "cm",
        }
        resp = client.post("/ingest", json=payload, headers={"X-API-Key": "secret-master-key"})
        assert resp.status_code == 201
        assert resp.json()["processed"] == 1


# ═══════════════════════════════════════════════════════
# Quality Flag: ok & metadata updates
# ═══════════════════════════════════════════════════════
class TestIngestNormal:
    def test_single_reading_updates_metadata(self, client, db_session, sample_node):
        ts = datetime.now(timezone.utc)
        payload = {
            "node_id": sample_node.id,
            "ts": ts.isoformat(),
            "value": 210.5,
            "unit": "cm",
            "battery_pct": 88.5,
        }
        resp = client.post("/ingest", json=payload, headers={"X-API-Key": sample_node.api_key})
        assert resp.status_code == 201

        reading_info = resp.json()["readings"][0]
        assert reading_info["quality_flag"] == "ok"
        assert reading_info["value"] == 210.5
        assert reading_info["unit"] == "cm"

        # Verify DB persisted changes
        db_session.refresh(sample_node)
        assert sample_node.battery_pct == 88.5
        last_seen = (
            sample_node.last_seen.replace(tzinfo=timezone.utc)
            if sample_node.last_seen.tzinfo is None
            else sample_node.last_seen
        )
        assert last_seen >= ts - timedelta(seconds=2)

        db_reading = db_session.query(Reading).filter(Reading.node_id == sample_node.id).first()
        assert db_reading is not None
        assert db_reading.quality_flag == "ok"


# ═══════════════════════════════════════════════════════
# Quality Flag: out_of_range
# ═══════════════════════════════════════════════════════
class TestIngestOutOfRange:
    def test_water_level_above_mount_height(self, client, sample_node):
        # mount_height_cm is 500.0, limit is mount_height + 100 = 600.0
        payload = {
            "node_id": sample_node.id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "value": 999.0,  # exceeds 600.0
            "unit": "cm",
        }
        resp = client.post("/ingest", json=payload, headers={"X-API-Key": sample_node.api_key})
        assert resp.status_code == 201
        assert resp.json()["readings"][0]["quality_flag"] == "out_of_range"

    def test_negative_reading_out_of_range(self, client, sample_node):
        payload = {
            "node_id": sample_node.id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "value": -15.0,
            "unit": "cm",
        }
        resp = client.post("/ingest", json=payload, headers={"X-API-Key": sample_node.api_key})
        assert resp.status_code == 201
        assert resp.json()["readings"][0]["quality_flag"] == "out_of_range"

    def test_soil_moisture_out_of_range(self, client, db_session, sample_node):
        soil_node = Node(
            village_id=sample_node.village_id,
            type="soil_moisture",
            lat=26.95,
            lng=94.17,
            api_key="soil-key-1",
        )
        db_session.add(soil_node)
        db_session.commit()

        payload = {
            "node_id": soil_node.id,
            "ts": datetime.now(timezone.utc).isoformat(),
            "value": 115.0,  # > 100%
            "unit": "%",
        }
        resp = client.post("/ingest", json=payload, headers={"X-API-Key": "soil-key-1"})
        assert resp.status_code == 201
        assert resp.json()["readings"][0]["quality_flag"] == "out_of_range"


# ═══════════════════════════════════════════════════════
# Quality Flag: duplicate_timestamp
# ═══════════════════════════════════════════════════════
class TestIngestDuplicateTimestamp:
    def test_duplicate_timestamp_flagged(self, client, sample_node):
        fixed_ts = datetime.now(timezone.utc).isoformat()
        payload = {
            "node_id": sample_node.id,
            "ts": fixed_ts,
            "value": 180.0,
            "unit": "cm",
        }
        # First send: normal ok
        resp1 = client.post("/ingest", json=payload, headers={"X-API-Key": sample_node.api_key})
        assert resp1.status_code == 201
        assert resp1.json()["readings"][0]["quality_flag"] == "ok"

        # Second send with identical node_id and timestamp: duplicate_timestamp
        resp2 = client.post("/ingest", json=payload, headers={"X-API-Key": sample_node.api_key})
        assert resp2.status_code == 201
        assert resp2.json()["readings"][0]["quality_flag"] == "duplicate_timestamp"


# ═══════════════════════════════════════════════════════
# Quality Flag: stuck_value
# ═══════════════════════════════════════════════════════
class TestIngestStuckValue:
    def test_stuck_value_flagged_after_consecutive_identical_readings(self, client, sample_node):
        now = datetime.now(timezone.utc)
        stuck_val = 222.2

        # Send 3 identical readings spaced across time
        for i in range(3):
            payload = {
                "node_id": sample_node.id,
                "ts": (now + timedelta(minutes=i)).isoformat(),
                "value": stuck_val,
                "unit": "cm",
            }
            resp = client.post("/ingest", json=payload, headers={"X-API-Key": sample_node.api_key})
            assert resp.status_code == 201

        # The 4th identical reading must be marked stuck_value
        payload_4th = {
            "node_id": sample_node.id,
            "ts": (now + timedelta(minutes=4)).isoformat(),
            "value": stuck_val,
            "unit": "cm",
        }
        resp4 = client.post("/ingest", json=payload_4th, headers={"X-API-Key": sample_node.api_key})
        assert resp4.status_code == 201
        assert resp4.json()["readings"][0]["quality_flag"] == "stuck_value"


# ═══════════════════════════════════════════════════════
# Batch Telemetry Ingestion
# ═══════════════════════════════════════════════════════
class TestBatchIngest:
    def test_batch_ingest_multiple_readings(self, client, sample_node):
        now = datetime.now(timezone.utc)
        batch = [
            {
                "node_id": sample_node.id,
                "ts": (now - timedelta(minutes=10)).isoformat(),
                "value": 150.0,
                "unit": "cm",
                "battery_pct": 94.0,
            },
            {
                "node_id": sample_node.id,
                "ts": (now - timedelta(minutes=5)).isoformat(),
                "value": 160.0,
                "unit": "cm",
                "battery_pct": 93.0,
            },
            {
                "node_id": sample_node.id,
                "ts": now.isoformat(),
                "value": 170.0,
                "unit": "cm",
                "battery_pct": 92.0,
            },
        ]
        resp = client.post("/ingest", json=batch, headers={"X-API-Key": sample_node.api_key})
        assert resp.status_code == 201
        data = resp.json()
        assert data["processed"] == 3
        assert all(r["quality_flag"] == "ok" for r in data["readings"])


# ═══════════════════════════════════════════════════════
# MQTT Message Ingestion Handler
# ═══════════════════════════════════════════════════════
class TestMQTTHandler:
    @pytest.mark.asyncio
    async def test_handle_mqtt_message_valid(self, db_session, sample_node):
        mock_msg = MagicMock()
        mock_msg.topic = f"sensors/{sample_node.village_id}/{sample_node.id}"
        payload = {
            "value": 245.0,
            "unit": "cm",
            "ts": datetime.now(timezone.utc).isoformat(),
            "battery_pct": 91.0,
            "api_key": sample_node.api_key,
        }
        mock_msg.payload = json.dumps(payload).encode("utf-8")

        await handle_mqtt_message(mock_msg, db_session)

        # Verify reading stored in db
        reading = (
            db_session.query(Reading)
            .filter(Reading.node_id == sample_node.id, Reading.value == 245.0)
            .first()
        )
        assert reading is not None
        assert reading.quality_flag == "ok"
        assert reading.unit == "cm"

    @pytest.mark.asyncio
    async def test_handle_mqtt_message_invalid_topic(self, db_session):
        mock_msg = MagicMock()
        mock_msg.topic = "other/unrelated/topic"
        mock_msg.payload = b'{"value": 100}'

        # Should quietly ignore without error
        await handle_mqtt_message(mock_msg, db_session)
