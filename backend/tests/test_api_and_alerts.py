"""
Comprehensive tests for:
1. REST Endpoints (districts, villages, shelters, nodes, readings, downsampling, risk summary).
2. JWT Authentication & Role-based Authorization (admin, district_officer, volunteer).
3. Alert Engine rules:
   - Village threshold override vs global default
   - Rate-of-rise escalation rule
   - Bad quality flag ignored
   - Multilingual template formatting (Assamese, Bodo, Bengali, Hindi, English)
   - Flood scenario test: sequence advisory -> warning -> danger, and assert no duplicate alerts.
   - Hysteresis holding alert from flapping.
4. WebSocket live streaming (/ws/live).
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import (
    District, Village, Shelter, Node, Reading, Threshold, Alert, AlertDelivery, User, UserRole
)
from app.services.alert_engine import evaluate_reading_alert
from app.services.auth import create_access_token, get_password_hash
from app.translations.alert_messages import get_alert_message, TEMPLATES


@pytest.fixture()
def client(db_session):
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
def test_setup(db_session):
    """Fixture providing clean district, village, shelter, nodes, thresholds, and users."""
    district = District(name="Majuli", state="Assam")
    db_session.add(district)
    db_session.flush()

    shelter = Shelter(name="Kamalabari Satra Hall", lat=26.95, lng=94.17, capacity=400)
    db_session.add(shelter)
    db_session.flush()

    village = Village(
        district_id=district.id,
        name="Kamalabari",
        lat=26.95,
        lng=94.17,
        population=15000,
        language="assamese",
        is_char_area=True,
        nearest_shelter_id=shelter.id,
    )
    db_session.add(village)
    db_session.flush()

    # Nodes
    water_node = Node(
        village_id=village.id,
        type="water_level",
        lat=26.95,
        lng=94.17,
        api_key="water-key-1",
        mount_height_cm=500.0,
    )
    rain_node = Node(
        village_id=village.id,
        type="rain_gauge",
        lat=26.95,
        lng=94.17,
        api_key="rain-key-1",
    )
    db_session.add(water_node)
    db_session.add(rain_node)

    # Thresholds: Global water level warning=300cm, danger=400cm
    db_session.add(Threshold(node_type="water_level", village_id=None, warning_level=300.0, danger_level=400.0))
    # Thresholds: Global rain gauge warning=50mm, danger=100mm
    db_session.add(Threshold(node_type="rain_gauge", village_id=None, warning_level=50.0, danger_level=100.0))

    # Users: Admin, Officer, Volunteer
    admin = User(
        username="admin_user",
        email="admin@test.gov.in",
        hashed_password=get_password_hash("pass123"),
        role=UserRole.admin.value,
        is_active=True,
    )
    officer = User(
        username="officer_user",
        email="officer@test.gov.in",
        hashed_password=get_password_hash("pass123"),
        role=UserRole.district_officer.value,
        district_id=district.id,
        is_active=True,
    )
    volunteer = User(
        username="volunteer_user",
        email="volunteer@test.gov.in",
        hashed_password=get_password_hash("pass123"),
        role=UserRole.volunteer.value,
        is_active=True,
    )
    db_session.add(admin)
    db_session.add(officer)
    db_session.add(volunteer)

    db_session.commit()
    db_session.refresh(village)
    db_session.refresh(water_node)
    db_session.refresh(rain_node)
    return {
        "district": district,
        "village": village,
        "shelter": shelter,
        "water_node": water_node,
        "rain_node": rain_node,
        "admin": admin,
        "officer": officer,
        "volunteer": volunteer,
    }


# ═══════════════════════════════════════════════════════
# Authentication & Role Tests
# ═══════════════════════════════════════════════════════
class TestAuthAPI:
    def test_login_success(self, client, test_setup):
        resp = client.post("/auth/login", json={"username": "admin_user", "password": "pass123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["role"] == "admin"
        assert data["username"] == "admin_user"

    def test_login_invalid_password(self, client, test_setup):
        resp = client.post("/auth/login", json={"username": "admin_user", "password": "wrongpassword"})
        assert resp.status_code == 401

    def test_get_me_authenticated(self, client, test_setup):
        token = create_access_token({"sub": "admin_user", "role": "admin"})
        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["username"] == "admin_user"
        assert resp.json()["role"] == "admin"

    def test_get_me_unauthenticated(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════
# REST Query Endpoints
# ═══════════════════════════════════════════════════════
class TestTelemetryEndpoints:
    def test_get_districts(self, client, test_setup):
        resp = client.get("/districts")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        assert resp.json()[0]["name"] == "Majuli"

    def test_get_villages_filter(self, client, test_setup):
        v = test_setup["village"]
        resp = client.get(f"/villages?district_id={v.district_id}&is_char_area=true")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["name"] == "Kamalabari"

    def test_get_shelters(self, client, test_setup):
        resp = client.get("/shelters")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        assert resp.json()[0]["name"] == "Kamalabari Satra Hall"

    def test_get_nodes(self, client, test_setup):
        v = test_setup["village"]
        resp = client.get(f"/nodes?village_id={v.id}&type=water_level")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["type"] == "water_level"

    def test_get_node_readings_and_downsampling(self, client, db_session, test_setup):
        node = test_setup["water_node"]
        now = datetime.now(timezone.utc)
        # Create 12 readings 5 minutes apart (1 hour total)
        for i in range(12):
            db_session.add(
                Reading(
                    node_id=node.id,
                    ts=now - timedelta(minutes=(12 - i) * 5),
                    value=100.0 + (i * 10),
                    unit="cm",
                )
            )
        db_session.commit()

        # 1. Raw readings
        resp_raw = client.get(f"/nodes/{node.id}/readings")
        assert resp_raw.status_code == 200
        assert len(resp_raw.json()) == 12

        # 2. Downsampled into 15-minute buckets (should yield ~4 points)
        resp_down = client.get(f"/nodes/{node.id}/readings?downsample_interval=15")
        assert resp_down.status_code == 200
        assert len(resp_down.json()) < 12

    def test_get_risk_summary(self, client, test_setup):
        resp = client.get("/risk-summary")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        v_summary = next(x for x in data if x["village_name"] == "Kamalabari")
        assert v_summary["risk_level"] in ("none", "advisory", "warning", "danger")


# ═══════════════════════════════════════════════════════
# Alert Endpoints & Role Restrictions
# ═══════════════════════════════════════════════════════
class TestAlertEndpoints:
    def test_volunteer_forbidden_from_manual_alert(self, client, test_setup):
        v = test_setup["village"]
        token = create_access_token({"sub": "volunteer_user", "role": "volunteer"})
        payload = {"village_id": v.id, "severity": "warning", "hazard": "flood"}
        resp = client.post("/alerts/manual", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    def test_admin_can_issue_manual_alert(self, client, test_setup):
        v = test_setup["village"]
        token = create_access_token({"sub": "admin_user", "role": "admin"})
        payload = {"village_id": v.id, "severity": "warning", "hazard": "flood", "message": "Manual test warning"}
        resp = client.post("/alerts/manual", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "active"
        assert data["source"] == "manual"
        assert data["message"] == "Manual test warning"

    def test_acknowledge_alert(self, client, db_session, test_setup):
        v = test_setup["village"]
        alert = Alert(
            village_id=v.id,
            severity="warning",
            hazard="flood",
            message="Alert to ack",
            status="active",
            source="manual",
        )
        db_session.add(alert)
        db_session.commit()

        token = create_access_token({"sub": "officer_user", "role": "district_officer"})
        resp = client.patch(
            f"/alerts/{alert.id}/acknowledge",
            json={"new_status": "acknowledged", "note": "Team deployed to shelter"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "acknowledged"


# ═══════════════════════════════════════════════════════
# Multilingual Template Tests
# ═══════════════════════════════════════════════════════
class TestTranslations:
    def test_all_languages_and_hazards(self):
        languages = ["assamese", "bodo", "bengali", "hindi", "english"]
        hazards = ["flood", "landslide", "earthquake"]
        severities = ["advisory", "warning", "danger"]

        for h in hazards:
            for s in severities:
                for lang in languages:
                    msg = get_alert_message(
                        hazard=h,
                        severity=s,
                        language=lang,
                        village_name="Simen Chapori",
                        value=350.0,
                        unit="cm",
                    )
                    assert "Simen Chapori" in msg
                    assert len(msg) > 10


# ═══════════════════════════════════════════════════════
# Alert Engine Rules & Flood Scenario Test
# ═══════════════════════════════════════════════════════
class TestAlertEngine:
    def test_ignore_bad_quality_readings(self, db_session, test_setup):
        """Readings with error or out_of_range quality flags must be ignored by alert engine."""
        node = test_setup["water_node"]
        bad_reading = Reading(
            node_id=node.id,
            ts=datetime.now(timezone.utc),
            value=450.0,  # over danger level!
            unit="cm",
            quality_flag="out_of_range",
        )
        db_session.add(bad_reading)
        db_session.commit()

        alert = evaluate_reading_alert(db_session, bad_reading, node)
        assert alert is None
        assert db_session.query(Alert).count() == 0

    def test_village_threshold_override(self, db_session, test_setup):
        """A village-specific threshold overrides the global default."""
        v = test_setup["village"]
        node = test_setup["water_node"]

        # Global warning=300, danger=400
        # Add village-specific override: warning=200, danger=250
        db_session.add(Threshold(node_type="water_level", village_id=v.id, warning_level=200.0, danger_level=250.0))
        db_session.commit()

        reading = Reading(node_id=node.id, ts=datetime.now(timezone.utc), value=210.0, unit="cm", quality_flag="ok")
        db_session.add(reading)
        db_session.commit()

        alert = evaluate_reading_alert(db_session, reading, node)
        assert alert is not None
        # With global (warning=300), 210 would only be advisory or safe;
        # with village override (warning=200), 210 triggers warning!
        assert alert.severity == "warning"

    def test_rate_of_rise_escalation(self, db_session, test_setup):
        """Fast rising water level (e.g. > 20 cm/hour) escalates severity."""
        node = test_setup["water_node"]
        t0 = datetime.now(timezone.utc) - timedelta(hours=1)
        t1 = datetime.now(timezone.utc)

        # Global thresholds: warning=300, danger=400, advisory=225
        # Reading 1: 180 cm (safe) at t0
        r0 = Reading(node_id=node.id, ts=t0, value=180.0, unit="cm", quality_flag="ok")
        db_session.add(r0)
        db_session.commit()

        # Reading 2: 240 cm (normally advisory) at t1 -> rate of rise = 60 cm/h!
        r1 = Reading(node_id=node.id, ts=t1, value=240.0, unit="cm", quality_flag="ok")
        db_session.add(r1)
        db_session.commit()

        alert = evaluate_reading_alert(db_session, r1, node)
        assert alert is not None
        # Raw value 240 cm is advisory, but rate of rise 60 cm/h escalates it to WARNING!
        assert alert.severity == "warning"

    def test_flood_scenario_sequence_and_no_duplicates(self, db_session, test_setup):
        """
        Key Test Requirement:
        Asserts the full alert sequence: advisory -> warning -> danger,
        and verifies cooldown prevents duplicate alerts for the same severity.
        """
        node = test_setup["water_node"]
        t_base = datetime.now(timezone.utc) - timedelta(hours=6)

        # Global thresholds: advisory=225cm, warning=300cm, danger=400cm

        # Step 1: Normal level (150 cm) -> NO alert
        r1 = Reading(node_id=node.id, ts=t_base, value=150.0, unit="cm", quality_flag="ok")
        db_session.add(r1)
        db_session.commit()
        a1 = evaluate_reading_alert(db_session, r1, node)
        assert a1 is None
        assert db_session.query(Alert).filter(Alert.status == "active").count() == 0

        # Step 2: Gentle rise to ADVISORY (240 cm over 6 hours = 15 cm/h < 20 cm/h) -> Alert: ADVISORY
        t_step2 = t_base + timedelta(hours=6)
        r2 = Reading(node_id=node.id, ts=t_step2, value=240.0, unit="cm", quality_flag="ok")
        db_session.add(r2)
        db_session.commit()
        a2 = evaluate_reading_alert(db_session, r2, node)
        assert a2 is not None
        assert a2.severity == "advisory"
        assert db_session.query(Alert).filter(Alert.status == "active").count() == 1

        # Step 3: Rises to WARNING (320 cm over 5 hours = 16 cm/h < 20 cm/h) -> Alert: WARNING
        t_step3 = t_step2 + timedelta(hours=5)
        r3 = Reading(node_id=node.id, ts=t_step3, value=320.0, unit="cm", quality_flag="ok")
        db_session.add(r3)
        db_session.commit()
        a3 = evaluate_reading_alert(db_session, r3, node)
        assert a3 is not None
        assert a3.severity == "warning"
        # Only 1 active alert for this village/hazard (previous advisory superseded)
        active_alerts = db_session.query(Alert).filter(Alert.status == "active").all()
        assert len(active_alerts) == 1
        assert active_alerts[0].severity == "warning"

        # Step 4: Rises to DANGER (420 cm over 6 hours = 16.6 cm/h < 20 cm/h) -> Alert: DANGER
        t_step4 = t_step3 + timedelta(hours=6)
        r4 = Reading(node_id=node.id, ts=t_step4, value=420.0, unit="cm", quality_flag="ok")
        db_session.add(r4)
        db_session.commit()
        a4 = evaluate_reading_alert(db_session, r4, node)
        assert a4 is not None
        assert a4.severity == "danger"
        active_alerts = db_session.query(Alert).filter(Alert.status == "active").all()
        assert len(active_alerts) == 1
        assert active_alerts[0].severity == "danger"

        # Step 5: DUPLICATE PREVENTION / COOLDOWN TEST:
        # Another reading arrives 5 minutes later still in DANGER (425 cm).
        # Must NOT fire a duplicate alert!
        t_step5 = t_step4 + timedelta(minutes=5)
        r5 = Reading(node_id=node.id, ts=t_step5, value=425.0, unit="cm", quality_flag="ok")
        db_session.add(r5)
        db_session.commit()
        a5 = evaluate_reading_alert(db_session, r5, node)
        assert a5 is None, "Expected NO duplicate alert within cooldown period!"

        # Total alerts created should remain exactly 3 (advisory, warning, danger)
        total_alerts = db_session.query(Alert).count()
        assert total_alerts == 3

    def test_hysteresis_prevents_flapping(self, db_session, test_setup):
        """Hysteresis buffer prevents de-escalation when dipping slightly below danger mark."""
        node = test_setup["water_node"]
        now = datetime.now(timezone.utc)

        # 1. Trigger danger alert at 410 cm (danger=400)
        r1 = Reading(node_id=node.id, ts=now - timedelta(minutes=20), value=410.0, unit="cm", quality_flag="ok")
        db_session.add(r1)
        db_session.commit()
        a1 = evaluate_reading_alert(db_session, r1, node)
        assert a1.severity == "danger"

        # 2. Water dips to 395 cm (danger is 400 cm; 5% hysteresis boundary is 380 cm).
        # Since 395 cm > 380 cm, hysteresis holds the danger state and rejects flapping down!
        r2 = Reading(node_id=node.id, ts=now, value=395.0, unit="cm", quality_flag="ok")
        db_session.add(r2)
        db_session.commit()
        a2 = evaluate_reading_alert(db_session, r2, node)
        assert a2 is None, "Hysteresis should prevent flapping when within 5% boundary"


# ═══════════════════════════════════════════════════════
# WebSocket Live Streaming
# ═══════════════════════════════════════════════════════
class TestWebSocketLiveStream:
    def test_websocket_connect_and_ping(self, client):
        with client.websocket_connect("/ws/live") as websocket:
            # First message on connect
            init_msg = websocket.receive_json()
            assert init_msg["type"] == "connection_established"

            # Ping-pong test
            websocket.send_text("ping")
            pong = websocket.receive_text()
            assert pong == "pong"
