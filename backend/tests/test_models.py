"""Tests for all ORM models — CRUD basics, relationships, constraints."""

from datetime import datetime, timezone, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import (
    District,
    Village,
    Shelter,
    Node,
    Reading,
    Threshold,
    Alert,
    AlertDelivery,
    Contact,
)
from app.models.village import Language
from app.models.node import NodeType, NodeStatus
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
        battery_pct=95.0,
        last_seen=datetime.now(timezone.utc),
    )
    defaults.update(kw)
    n = Node(**defaults)
    session.add(n)
    session.flush()
    return n


# ── District Tests ───────────────────────────────────────
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


# ── Shelter Tests ────────────────────────────────────────
class TestShelter:
    def test_create(self, db_session):
        s = _make_shelter(db_session)
        assert s.id is not None
        assert s.capacity == 200

    def test_repr(self, db_session):
        s = _make_shelter(db_session, name="Relief Camp")
        assert "Relief Camp" in repr(s)


# ── Village Tests ────────────────────────────────────────
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
            v = _make_village(
                db_session, d,
                name=f"Village_{lang.value}",
                language=lang.value,
            )
            assert v.language == lang.value

    def test_fk_constraint(self, db_session):
        """Village must reference an existing district."""
        v = Village(
            district_id=9999,
            name="Ghost",
            lat=0, lng=0,
            population=0,
            language="assamese",
        )
        db_session.add(v)
        with pytest.raises(IntegrityError):
            db_session.flush()


# ── Node Tests ───────────────────────────────────────────
class TestNode:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        assert n.id is not None
        assert n.type == NodeType.water_level.value

    def test_all_types(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for nt in NodeType:
            n = _make_node(db_session, v, type=nt.value)
            assert n.type == nt.value

    def test_village_relationship(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        db_session.commit()
        db_session.refresh(n)
        assert n.village.name == "Jonai"

    def test_battery_default(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = Node(
            village_id=v.id,
            type="water_level",
            lat=v.lat, lng=v.lng,
            last_seen=datetime.now(timezone.utc),
        )
        db_session.add(n)
        db_session.flush()
        assert n.battery_pct == 100.0


# ── Reading Tests ────────────────────────────────────────
class TestReading:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        r = Reading(
            node_id=n.id,
            ts=datetime.now(timezone.utc),
            value=5.67,
            unit="m",
            quality_flag="ok",
        )
        db_session.add(r)
        db_session.flush()
        assert r.id is not None

    def test_multiple_readings_per_node(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        now = datetime.now(timezone.utc)
        for i in range(10):
            r = Reading(
                node_id=n.id,
                ts=now - timedelta(minutes=i * 15),
                value=3.0 + i * 0.1,
                unit="m",
                quality_flag="ok",
            )
            db_session.add(r)
        db_session.flush()
        assert len(n.readings) == 10

    def test_node_cascade_delete(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        r = Reading(
            node_id=n.id,
            ts=datetime.now(timezone.utc),
            value=1.0,
            unit="m",
        )
        db_session.add(r)
        db_session.commit()
        db_session.delete(n)
        db_session.commit()
        assert db_session.query(Reading).count() == 0


# ── Threshold Tests ──────────────────────────────────────
class TestThreshold:
    def test_global_threshold(self, db_session):
        t = Threshold(
            node_type="water_level",
            village_id=None,
            warning_level=6.0,
            danger_level=8.5,
        )
        db_session.add(t)
        db_session.flush()
        assert t.id is not None
        assert t.village_id is None

    def test_village_specific_threshold(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        t = Threshold(
            node_type="rain_gauge",
            village_id=v.id,
            warning_level=40.0,
            danger_level=80.0,
        )
        db_session.add(t)
        db_session.flush()
        assert t.village_id == v.id


# ── Alert Tests ──────────────────────────────────────────
class TestAlert:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(
            village_id=v.id,
            severity=Severity.warning.value,
            hazard=Hazard.flood.value,
            message="Water level critical",
            source=AlertSource.rule.value,
        )
        db_session.add(a)
        db_session.flush()
        assert a.id is not None
        assert a.status == AlertStatus.active.value

    def test_alert_village_relationship(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(
            village_id=v.id,
            severity="danger",
            hazard="landslide",
            message="Evacuate!",
            source="ai",
        )
        db_session.add(a)
        db_session.commit()
        db_session.refresh(a)
        assert a.village.name == "Jonai"

    def test_all_severities(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for sev in Severity:
            a = Alert(
                village_id=v.id,
                severity=sev.value,
                hazard="flood",
                message=f"Test {sev.value}",
                source="manual",
            )
            db_session.add(a)
        db_session.flush()
        assert db_session.query(Alert).count() == 3


# ── AlertDelivery Tests ──────────────────────────────────
class TestAlertDelivery:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(
            village_id=v.id, severity="warning", hazard="flood",
            message="Test", source="rule",
        )
        db_session.add(a)
        db_session.flush()
        ad = AlertDelivery(
            alert_id=a.id,
            channel=DeliveryChannel.sms.value,
            status=DeliveryStatus.sent.value,
            sent_at=datetime.now(timezone.utc),
        )
        db_session.add(ad)
        db_session.flush()
        assert ad.id is not None

    def test_all_channels(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(
            village_id=v.id, severity="danger", hazard="flood",
            message="Test", source="rule",
        )
        db_session.add(a)
        db_session.flush()
        for ch in DeliveryChannel:
            ad = AlertDelivery(
                alert_id=a.id,
                channel=ch.value,
            )
            db_session.add(ad)
        db_session.flush()
        assert len(a.deliveries) == len(DeliveryChannel)

    def test_cascade_from_alert(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        a = Alert(
            village_id=v.id, severity="advisory", hazard="flood",
            message="Low risk", source="ai",
        )
        db_session.add(a)
        db_session.flush()
        ad = AlertDelivery(alert_id=a.id, channel="sms")
        db_session.add(ad)
        db_session.commit()
        db_session.delete(a)
        db_session.commit()
        assert db_session.query(AlertDelivery).count() == 0


# ── Contact Tests ────────────────────────────────────────
class TestContact:
    def test_create(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        c = Contact(
            village_id=v.id,
            name="Ranjit Bora",
            phone="+919876543210",
            role=ContactRole.volunteer.value,
        )
        db_session.add(c)
        db_session.flush()
        assert c.id is not None

    def test_all_roles(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        for role in ContactRole:
            c = Contact(
                village_id=v.id,
                name=f"Test {role.value}",
                phone="+919000000000",
                role=role.value,
            )
            db_session.add(c)
        db_session.flush()
        assert db_session.query(Contact).count() == len(ContactRole)

    def test_village_relationship(self, db_session):
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        c = Contact(
            village_id=v.id,
            name="Nilakshi Hazarika",
            phone="+919876500000",
            role="gram_panchayat",
        )
        db_session.add(c)
        db_session.commit()
        db_session.refresh(c)
        assert c.village.name == "Jonai"


# ── Cross-model relationship tests ──────────────────────
class TestRelationships:
    def test_district_villages_cascade(self, db_session):
        """Deleting a district cascades to its villages."""
        d = _make_district(db_session)
        _make_village(db_session, d, name="V1")
        _make_village(db_session, d, name="V2")
        db_session.commit()
        assert db_session.query(Village).count() == 2
        db_session.delete(d)
        db_session.commit()
        assert db_session.query(Village).count() == 0

    def test_full_chain(self, db_session):
        """District → Village → Node → Reading full chain."""
        d = _make_district(db_session)
        v = _make_village(db_session, d)
        n = _make_node(db_session, v)
        r = Reading(node_id=n.id, ts=datetime.now(timezone.utc), value=5.0, unit="m")
        db_session.add(r)
        db_session.commit()

        # Walk the chain
        db_session.refresh(r)
        assert r.node.village.district.name == "Dhemaji"

