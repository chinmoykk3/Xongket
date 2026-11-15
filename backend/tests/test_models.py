"""Tests for all ORM models — CRUD basics, relationships, constraints,
calibration fields, and the rainfall service."""

from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import (
    District, Village, Shelter, Node, Reading,
    Threshold, Alert, AlertDelivery, Contact,
)
from app.models.village import Language
from app.models.node import NodeType, NodeStatus, DeviceType, NodeSource
from app.models.alert import Severity, Hazard, AlertStatus, AlertSource
from app.models.alert_delivery import DeliveryChannel, DeliveryStatus
from app.models.contact import ContactRole


# ── Helpers ──────────────────────────────────────────────
def _make_district(session, name="Dhemaji"):
    d = District(name=name, state="Assam")
    session.add(d)
    session.flush()
    return d


def _make_shelter(session, name="Test Shelter"):
    s = Shelter(name=name, lat=27.0, lng=94.0, capacity=200)
    session.add(s)
    session.flush()
    return s


def _make_village(session, district, shelter=None, **kw):
    defaults = dict(
        district_id=district.id,
        name="Jonai",
        lat=27.83,
        lng=95.22,
        population=12500,
        language=Language.assamese.value,
        is_char_area=False,
        nearest_shelter_id=shelter.id if shelter else None,
    )
    defaults.update(kw)
    v = Village(**defaults)
    session.add(v)
    session.flush()
    return v


def _make_node(session, village, **kw):
    defaults = dict(
        village_id=village.id,
        type=NodeType.water_level.value,
        lat=village.lat,
        lng=village.lng,
        status=NodeStatus.active.value,
        battery_pct=None,
        device_type=DeviceType.esp8266.value,
        source=NodeSource.device.value,
        last_seen=datetime.now(timezone.utc),
    )
    defaults.update(kw)
    n = Node(**defaults)
    session.add(n)
    session.flush()
    return n


# ═══════════════════════════════════════════════════════
#  District
# ═══════════════════════════════════════════════════════
class TestDistrict:
    def test_create(self, db_session):
        d = _make_district(db_session)
        assert d.id is not None
        assert d.state == "Assam"

    def test_unique_name(self, db_session):
        _make_district(db_session, name="Majuli")
        db_session.commit()
        with pytest.raises(IntegrityError):
            _make_district(db_session, name="Majuli")
            db_session.commit()

    def test_repr(self, db_session):
        d = _make_district(db_session)
        assert "Dhemaji" in repr(d)


# ═══════════════════════════════════════════════════════
#  Shelter
# ═══════════════════════════════════════════════════════
class TestShelter:
    def test_create(self, db_session):
        s = _make_shelter(db_session)
        assert s.id is not None
        assert s.capacity == 200

    def test_repr(self, db_session):
        s = _make_shelter(db_session, name="Relief Camp")
        assert "Relief Camp" in repr(s)


# ═══════════════════════════════════════════════════════
#  Village
# ═══════════════════════════════════════════════════════
class TestVillage:
    def test_create_with_shelter(self, db_session):
        d = _make_district(db_session)
        s = _make_shelter(db_session)
        v = _make_village(db_session, d, shelter=s)
        assert v.id is not None
        assert v.nearest_shelter_id == s.id

    def test_char_area_flag(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d, is_char_area=True, name="Simen Chapori")
        assert v.is_char_area is True

    def test_district_relationship(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        db_session.commit()
        db_session.refresh(v)
        assert v.district.name == "Dhemaji"

    def test_language_values(self, db_session):
        d = _make_district(db_session)
        for lang in Language:
            v = _make_village(db_session, d, name=f"Village_{lang.value}", language=lang.value)
            assert v.language == lang.value

    def test_fk_constraint(self, db_session):
        v = Village(district_id=9999, name="Ghost", lat=0, lng=0, population=0, language="assamese")
        db_session.add(v)
        with pytest.raises(IntegrityError):
            db_session.flush()


# ═══════════════════════════════════════════════════════
#  Node — base + new hardware fields
# ═══════════════════════════════════════════════════════
class TestNode:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        assert n.id is not None
        assert n.type == NodeType.water_level.value
        assert n.api_key is not None
        assert len(n.api_key) >= 16

    def test_api_key_custom(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, api_key="secret-key-12345")
        assert n.api_key == "secret-key-12345"

    def test_all_types_including_new(self, db_session):
        """All 6 node types: water_level, rain_gauge, soil_moisture, seismic, temperature, humidity."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for nt in NodeType:
            n = _make_node(db_session, v, type=nt.value)
            assert n.type == nt.value
        assert len(NodeType) == 6

    def test_device_type_field(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for dt in DeviceType:
            n = _make_node(db_session, v, device_type=dt.value)
            assert n.device_type == dt.value

    def test_source_field(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for src in NodeSource:
            n = _make_node(db_session, v, source=src.value)
            assert n.source == src.value

    def test_mount_height_cm_water_level(self, db_session):
        """Water-level nodes store mount_height_cm for HC-SR04 conversion."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="water_level", mount_height_cm=450.0)
        assert n.mount_height_cm == 450.0

    def test_mount_height_null_for_other_types(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="temperature")
        assert n.mount_height_cm is None

    def test_soil_moisture_calibration(self, db_session):
        """Soil-moisture nodes store raw_dry / raw_wet ADC calibration."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="soil_moisture", raw_dry=820, raw_wet=380)
        assert n.raw_dry == 820
        assert n.raw_wet == 380

    def test_calibration_null_for_other_types(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="water_level")
        assert n.raw_dry is None
        assert n.raw_wet is None

    def test_battery_pct_nullable(self, db_session):
        """ESP8266 boards have no battery monitoring — battery_pct is None."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, battery_pct=None)
        assert n.battery_pct is None

    def test_virtual_rain_node(self, db_session):
        """Virtual rain_gauge nodes are source=api, device_type=virtual."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(
            db_session, v,
            type="rain_gauge",
            source="api",
            device_type="virtual",
        )
        assert n.source == "api"
        assert n.device_type == "virtual"

    def test_village_relationship(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        db_session.commit()
        db_session.refresh(n)
        assert n.village.name == "Jonai"

    def test_repr_includes_device(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        assert "esp8266" in repr(n)


# ═══════════════════════════════════════════════════════
#  Reading
# ═══════════════════════════════════════════════════════
class TestReading:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=5.67, unit="cm", quality_flag="ok")
        db_session.add(r)
        db_session.flush()
        assert r.id is not None

    def test_water_level_cm_reading(self, db_session):
        """Store water level in cm derived from mount_height - distance."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="water_level", mount_height_cm=450.0)
        distance_cm = 120.0
        water_level = n.mount_height_cm - distance_cm
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=water_level, unit="cm")
        db_session.add(r)
        db_session.flush()
        assert r.value == 330.0
        assert r.unit == "cm"

    def test_soil_moisture_pct_reading(self, db_session):
        """Raw ADC → percentage via calibration."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="soil_moisture", raw_dry=800, raw_wet=400)
        raw_adc = 600
        pct = (n.raw_dry - raw_adc) / (n.raw_dry - n.raw_wet) * 100
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=round(pct, 1), unit="%")
        db_session.add(r)
        db_session.flush()
        assert r.value == 50.0

    def test_dht11_temperature_reading(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="temperature")
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=28.0, unit="°C")
        db_session.add(r)
        db_session.flush()
        assert r.value == 28.0

    def test_dht11_humidity_reading(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="humidity")
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=72.0, unit="%")
        db_session.add(r)
        db_session.flush()
        assert r.value == 72.0

    def test_failed_dht11_read(self, db_session):
        """DHT11 errors are stored with quality_flag='error'."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="temperature")
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=0.0, unit="°C", quality_flag="error")
        db_session.add(r)
        db_session.flush()
        assert r.quality_flag == "error"

    def test_multiple_readings_per_node(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        now = datetime.now(timezone.utc)
        for i in range(10):
            db_session.add(Reading(
                node_id=n.id, ts=now - timedelta(minutes=i * 15),
                value=100.0 + i, unit="cm",
            ))
        db_session.flush()
        assert len(n.readings) == 10

    def test_node_cascade_delete(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        db_session.add(Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=1.0, unit="cm"))
        db_session.commit()
        db_session.delete(n)
        db_session.commit()
        assert db_session.query(Reading).count() == 0


# ═══════════════════════════════════════════════════════
#  Threshold
# ═══════════════════════════════════════════════════════
class TestThreshold:
    def test_global_threshold(self, db_session):
        t = Threshold(node_type="water_level", village_id=None, warning_level=600.0, danger_level=850.0)
        db_session.add(t)
        db_session.flush()
        assert t.id is not None
        assert t.village_id is None

    def test_village_specific_threshold(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        t = Threshold(node_type="rain_gauge", village_id=v.id, warning_level=40.0, danger_level=80.0)
        db_session.add(t)
        db_session.flush()
        assert t.village_id == v.id

    def test_temperature_threshold(self, db_session):
        t = Threshold(node_type="temperature", village_id=None, warning_level=40.0, danger_level=45.0)
        db_session.add(t)
        db_session.flush()
        assert t.node_type == "temperature"

    def test_humidity_threshold(self, db_session):
        t = Threshold(node_type="humidity", village_id=None, warning_level=90.0, danger_level=98.0)
        db_session.add(t)
        db_session.flush()
        assert t.node_type == "humidity"


# ═══════════════════════════════════════════════════════
#  Alert
# ═══════════════════════════════════════════════════════
class TestAlert:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(
            village_id=v.id, severity=Severity.warning.value, hazard=Hazard.flood.value,
            message="Water level critical", source=AlertSource.rule.value,
        )
        db_session.add(a)
        db_session.flush()
        assert a.id is not None
        assert a.status == AlertStatus.active.value

    def test_alert_village_relationship(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(village_id=v.id, severity="danger", hazard="landslide", message="Evacuate!", source="ai")
        db_session.add(a)
        db_session.commit()
        db_session.refresh(a)
        assert a.village.name == "Jonai"

    def test_all_severities(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for sev in Severity:
            db_session.add(Alert(
                village_id=v.id, severity=sev.value, hazard="flood",
                message=f"Test {sev.value}", source="manual",
            ))
        db_session.flush()
        assert db_session.query(Alert).count() == 3


# ═══════════════════════════════════════════════════════
#  AlertDelivery
# ═══════════════════════════════════════════════════════
class TestAlertDelivery:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(village_id=v.id, severity="warning", hazard="flood", message="T", source="rule")
        db_session.add(a)
        db_session.flush()
        ad = AlertDelivery(
            alert_id=a.id, channel=DeliveryChannel.sms.value,
            status=DeliveryStatus.sent.value, sent_at=datetime.now(timezone.utc),
        )
        db_session.add(ad)
        db_session.flush()
        assert ad.id is not None

    def test_all_channels(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(village_id=v.id, severity="danger", hazard="flood", message="T", source="rule")
        db_session.add(a)
        db_session.flush()
        for ch in DeliveryChannel:
            db_session.add(AlertDelivery(alert_id=a.id, channel=ch.value))
        db_session.flush()
        assert len(a.deliveries) == len(DeliveryChannel)

    def test_cascade_from_alert(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(village_id=v.id, severity="advisory", hazard="flood", message="Low risk", source="ai")
        db_session.add(a)
        db_session.flush()
        db_session.add(AlertDelivery(alert_id=a.id, channel="sms"))
        db_session.commit()
        db_session.delete(a)
        db_session.commit()
        assert db_session.query(AlertDelivery).count() == 0


# ═══════════════════════════════════════════════════════
#  Contact
# ═══════════════════════════════════════════════════════
class TestContact:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        c = Contact(village_id=v.id, name="Ranjit Bora", phone="+919876543210", role=ContactRole.volunteer.value)
        db_session.add(c)
        db_session.flush()
        assert c.id is not None

    def test_all_roles(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for role in ContactRole:
            db_session.add(Contact(village_id=v.id, name=f"T {role.value}", phone="+919000000000", role=role.value))
        db_session.flush()
        assert db_session.query(Contact).count() == len(ContactRole)

    def test_village_relationship(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        c = Contact(village_id=v.id, name="Nilakshi Hazarika", phone="+919876500000", role="gram_panchayat")
        db_session.add(c)
        db_session.commit()
        db_session.refresh(c)
        assert c.village.name == "Jonai"


# ═══════════════════════════════════════════════════════
#  Rainfall service
# ═══════════════════════════════════════════════════════
class TestRainfallService:
    def test_get_or_create_virtual_rain_node(self, db_session):
        from app.services.rainfall import _get_or_create_virtual_rain_node
        d = _make_district(db_session)
        v = _make_village(db_session, d)

        node = _get_or_create_virtual_rain_node(db_session, v)
        assert node.type == "rain_gauge"
        assert node.source == "api"
        assert node.device_type == "virtual"

        # Calling again returns the same node
        node2 = _get_or_create_virtual_rain_node(db_session, v)
        assert node2.id == node.id

    def test_last_stored_rainfall_empty(self, db_session):
        from app.services.rainfall import _last_stored_rainfall, _get_or_create_virtual_rain_node
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        node = _get_or_create_virtual_rain_node(db_session, v)
        assert _last_stored_rainfall(db_session, node) == 0.0

    def test_last_stored_rainfall_with_data(self, db_session):
        from app.services.rainfall import _last_stored_rainfall, _get_or_create_virtual_rain_node
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        node = _get_or_create_virtual_rain_node(db_session, v)
        now = datetime.now(timezone.utc)
        db_session.add(Reading(node_id=node.id, ts=now - timedelta(hours=2), value=5.0, unit="mm"))
        db_session.add(Reading(node_id=node.id, ts=now - timedelta(hours=1), value=12.3, unit="mm"))
        db_session.flush()
        assert _last_stored_rainfall(db_session, node) == 12.3

    @patch("app.services.rainfall._fetch_current_rainfall", return_value=7.5)
    def test_fetch_rainfall_online(self, mock_fetch, db_session):
        from app.services.rainfall import fetch_rainfall_for_all_villages
        d = _make_district(db_session)
        _make_village(db_session, d)
        db_session.commit()

        results = fetch_rainfall_for_all_villages(db_session)
        assert results["Jonai"] == 7.5
        # Reading was stored
        node = db_session.query(Node).filter(Node.source == "api").first()
        reading = db_session.query(Reading).filter(Reading.node_id == node.id).first()
        assert reading.value == 7.5

    @patch("app.services.rainfall._fetch_current_rainfall", return_value=None)
    def test_fetch_rainfall_offline_fallback(self, mock_fetch, db_session):
        from app.services.rainfall import fetch_rainfall_for_all_villages, _get_or_create_virtual_rain_node
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        db_session.commit()

        # Pre-seed a reading to fall back to
        node = _get_or_create_virtual_rain_node(db_session, v)
        db_session.add(Reading(
            node_id=node.id, ts=datetime.now(timezone.utc) - timedelta(hours=1),
            value=3.2, unit="mm",
        ))
        db_session.commit()

        results = fetch_rainfall_for_all_villages(db_session)
        assert results["Jonai"] == 3.2


# ═══════════════════════════════════════════════════════
#  Cross-model relationships
# ═══════════════════════════════════════════════════════
class TestRelationships:
    def test_district_villages_cascade(self, db_session):
        d = _make_district(db_session)
        _make_village(db_session, d, name="V1")
        _make_village(db_session, d, name="V2")
        db_session.commit()
        assert db_session.query(Village).count() == 2
        db_session.delete(d)
        db_session.commit()
        assert db_session.query(Village).count() == 0

    def test_full_chain(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v, type="water_level", mount_height_cm=400.0)
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=280.0, unit="cm")
        db_session.add(r)
        db_session.commit()
        db_session.refresh(r)
        assert r.node.village.district.name == "Dhemaji"
        assert r.node.mount_height_cm == 400.0
        assert r.node.device_type == "esp8266"
