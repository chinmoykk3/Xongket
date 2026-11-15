"""Integration tests for AI endpoints, scheduler, and AI-driven early-warning alerts."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models.alert import Alert
from app.models.district import District
from app.models.forecast import Forecast
from app.models.node import Node
from app.models.reading import Reading
from app.models.threshold import Threshold
from app.models.user import User, UserRole
from app.models.village import Village
from app.services.auth import create_access_token
from app.services.forecast_service import run_all_node_forecasts, run_forecast_for_node


@pytest.fixture()
def ai_test_setup(db_session):
    """Seed test hierarchy with river station, rainfall gauge, and thresholds."""
    district = District(name="Majuli_AITest", state="Assam")
    db_session.add(district)
    db_session.flush()

    village = Village(
        district_id=district.id,
        name="Garamur_AI",
        lat=26.96,
        lng=94.22,
        population=12000,
        language="assamese",
    )
    db_session.add(village)
    db_session.flush()

    # Thresholds: warning at 400cm, danger at 450cm
    thresh = Threshold(
        village_id=village.id,
        node_type="water_level",
        warning_level=400.0,
        danger_level=450.0,
    )
    db_session.add(thresh)

    wl_node = Node(
        village_id=village.id,
        type="water_level",
        lat=26.96,
        lng=94.22,
        status="active",
        api_key="ai-wl-key",
        device_type="esp8266",
        source="device",
    )
    db_session.add(wl_node)

    rain_node = Node(
        village_id=village.id,
        type="rain_gauge",
        lat=26.96,
        lng=94.22,
        status="active",
        api_key="ai-rain-key",
        device_type="esp8266",
        source="device",
    )
    db_session.add(rain_node)

    sm_node = Node(
        village_id=village.id,
        type="soil_moisture",
        lat=26.96,
        lng=94.22,
        status="active",
        api_key="ai-sm-key",
        device_type="esp8266",
        source="device",
    )
    db_session.add(sm_node)

    # Admin user
    admin_user = User(
        username="ai_admin",
        email="ai_admin@xongket.gov.in",
        hashed_password="hashed_pw_dummy",
        role=UserRole.admin.value,
        is_active=True,
    )
    db_session.add(admin_user)
    db_session.commit()

    return {
        "district": district,
        "village": village,
        "wl_node": wl_node,
        "rain_node": rain_node,
        "sm_node": sm_node,
        "admin_user": admin_user,
    }


class TestAIForecastEndpoints:
    def test_get_node_forecasts(self, client, db_session, ai_test_setup):
        wl_node = ai_test_setup["wl_node"]
        resp = client.get(f"/nodes/{wl_node.id}/forecasts")
        assert resp.status_code == 200
        forecasts = resp.json()
        assert len(forecasts) >= 3  # 1h, 3h, 6h horizons
        horizons = [f["horizon_hours"] for f in forecasts]
        assert 1 in horizons
        assert 3 in horizons
        assert 6 in horizons

        for f in forecasts:
            assert f["predicted_value"] > 0
            assert f["lower_bound"] <= f["predicted_value"]
            assert f["predicted_value"] <= f["upper_bound"]
            assert f["unit"] == "cm"
            assert "explanation" in f

    def test_get_village_landslide_risk_endpoint(self, client, db_session, ai_test_setup):
        village = ai_test_setup["village"]
        sm_node = ai_test_setup["sm_node"]
        rain_node = ai_test_setup["rain_node"]

        # Insert saturated soil and rain readings
        now = datetime.now(timezone.utc)
        db_session.add(
            Reading(node_id=sm_node.id, ts=now, value=88.0, unit="%", quality_flag="ok")
        )
        db_session.add(
            Reading(node_id=rain_node.id, ts=now, value=65.0, unit="mm", quality_flag="ok")
        )
        db_session.commit()

        resp = client.get(f"/villages/{village.id}/landslide-risk?slope=steep")
        assert resp.status_code == 200
        data = resp.json()
        assert data["village_id"] == village.id
        assert data["severity"] in ["warning", "danger"]
        assert data["risk_score"] >= 50.0
        assert data["slope_class"] == "steep"
        assert len(data["explanation"]) > 0

    def test_trigger_forecast_cycle_rbac(self, client, db_session, ai_test_setup):
        admin = ai_test_setup["admin_user"]
        token = create_access_token({"sub": admin.username, "role": admin.role})
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.post("/forecasts/trigger", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["forecasts_count"] >= 3


class TestAIEarlyWarningAlertGeneration:
    def test_ai_alert_raised_with_lead_time_and_explanation(self, db_session, ai_test_setup):
        wl_node = ai_test_setup["wl_node"]
        rain_node = ai_test_setup["rain_node"]
        village = ai_test_setup["village"]

        # Simulate surge in river and heavy rain leading to forecasted flood
        now = datetime.now(timezone.utc)
        # Sequence of rapid rising water levels
        db_session.add(
            Reading(node_id=wl_node.id, ts=now - timedelta(hours=3), value=360.0, unit="cm", quality_flag="ok")
        )
        db_session.add(
            Reading(node_id=wl_node.id, ts=now - timedelta(hours=1), value=395.0, unit="cm", quality_flag="ok")
        )
        db_session.add(
            Reading(node_id=wl_node.id, ts=now, value=425.0, unit="cm", quality_flag="ok")
        )

        # Heavy recent rainfall
        for h_ago in [1, 2, 4]:
            db_session.add(
                Reading(
                    node_id=rain_node.id,
                    ts=now - timedelta(hours=h_ago),
                    value=40.0,
                    unit="mm",
                    quality_flag="ok",
                )
            )
        db_session.commit()

        # Run forecast
        forecasts = run_forecast_for_node(db_session, wl_node)
        assert len(forecasts) == 3

        # Verify an AI alert was created in DB
        ai_alert = (
            db_session.query(Alert)
            .filter(
                Alert.village_id == village.id,
                Alert.source == "ai",
                Alert.hazard == "flood",
            )
            .first()
        )
        assert ai_alert is not None, "AI forecast crossing threshold must raise source=ai alert!"
        assert ai_alert.source == "ai"
        assert ai_alert.severity in ["warning", "danger"]
        # Verify message has lead time and explanation
        assert "AI" in ai_alert.message
        assert ("ঘণ্টা" in ai_alert.message or "hour" in ai_alert.message)  # Lead time indicator
        assert "কাৰণ" in ai_alert.message or "Reason" in ai_alert.message  # Plain-language explanation indicator
