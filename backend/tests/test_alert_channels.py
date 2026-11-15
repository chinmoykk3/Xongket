"""
Tests for Alert Delivery Layer:
- Pluggable channel adapters (SMS, IVR, WhatsApp, Dashboard, Siren)
- Severity-based recipient and channel routing
- Multilingual template localization
- Retries with backoff on transient errors
- Per-village rate limiting and cooldown
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.models.alert import Alert, AlertStatus, Hazard, Severity
from app.models.contact import Contact
from app.models.village import Village
from app.models.district import District
from app.models.alert_delivery import AlertDelivery
from app.services.alert_dispatcher import AlertDispatcher, alert_dispatcher
from app.services.channels.base import BaseChannelAdapter, DeliveryResult
from app.services.channels.sms import SMSAdapter, MockSMSProvider, TwilioSMSProvider
from app.services.channels.voice import IVRAdapter, MockVoiceProvider
from app.services.channels.whatsapp import WhatsAppAdapter, MockWhatsAppProvider
from app.services.channels.dashboard import DashboardAdapter
from app.services.channels.siren import SirenAdapter
from app.translations.alert_messages import get_alert_message


@pytest.fixture
def test_setup(db_session):
    """Create test district, villages with different languages, and contacts with different roles."""
    district = District(name="Test District", state="Assam")
    db_session.add(district)
    db_session.flush()

    # Village 1: Assamese
    v_as = Village(
        district_id=district.id,
        name="Assamese Village",
        lat=27.1,
        lng=94.5,
        population=1200,
        language="assamese",
        is_char_area=False,
    )
    # Village 2: Bodo
    v_bodo = Village(
        district_id=district.id,
        name="Bodo Village",
        lat=26.5,
        lng=90.5,
        population=800,
        language="bodo",
        is_char_area=False,
    )
    # Village 3: Bengali
    v_bn = Village(
        district_id=district.id,
        name="Bengali Char",
        lat=26.2,
        lng=91.0,
        population=1500,
        language="bengali",
        is_char_area=True,
    )
    # Village 4: Hindi
    v_hi = Village(
        district_id=district.id,
        name="Hindi Basti",
        lat=27.5,
        lng=95.0,
        population=900,
        language="hindi",
        is_char_area=False,
    )
    db_session.add_all([v_as, v_bodo, v_bn, v_hi])
    db_session.flush()

    # Contacts for Village 1
    c_vol = Contact(village_id=v_as.id, name="Bikash Volunteer", phone="+919800000001", role="volunteer")
    c_gp = Contact(village_id=v_as.id, name="Pranab GP President", phone="+919800000002", role="gram_panchayat")
    c_asdma = Contact(village_id=v_as.id, name="Anup ASDMA Field Officer", phone="+919800000003", role="asdma")

    db_session.add_all([c_vol, c_gp, c_asdma])
    db_session.commit()

    return {
        "district": district,
        "v_as": v_as,
        "v_bodo": v_bodo,
        "v_bn": v_bn,
        "v_hi": v_hi,
        "c_vol": c_vol,
        "c_gp": c_gp,
        "c_asdma": c_asdma,
    }


# ==========================================
# 1. Routing Rules by Severity
# ==========================================

def test_routing_advisory_severity(db_session, test_setup):
    """Advisory severity should only route to volunteers (no GP, no ASDMA, no Siren)."""
    v_as = test_setup["v_as"]
    dispatcher = AlertDispatcher(rate_limit_seconds=0)

    alert = Alert(
        village_id=v_as.id,
        severity="advisory",
        hazard="flood",
        message="Water level rising advisory",
        status="active",
        source="rule",
    )
    db_session.add(alert)
    db_session.commit()

    deliveries = dispatcher.dispatch_alert(alert, db_session)
    channels_used = [d.channel for d in deliveries]

    # Advisory channels: dashboard, sms (to volunteer), whatsapp (to volunteer)
    assert "dashboard" in channels_used
    assert "sms" in channels_used
    assert "whatsapp" in channels_used
    assert "ivr" not in channels_used
    assert "siren" not in channels_used

    # Check recipient count: only 1 contact (volunteer) -> 1 SMS + 1 WhatsApp + 1 Dashboard = 3
    assert len(deliveries) == 3
    for d in deliveries:
        assert d.status in ("sent", "delivered")


def test_routing_warning_severity(db_session, test_setup):
    """Warning severity routes to volunteers + gram panchayat, adds IVR, but no Siren."""
    v_as = test_setup["v_as"]
    dispatcher = AlertDispatcher(rate_limit_seconds=0)

    alert = Alert(
        village_id=v_as.id,
        severity="warning",
        hazard="flood",
        message="Water level warning",
        status="active",
        source="rule",
    )
    db_session.add(alert)
    db_session.commit()

    deliveries = dispatcher.dispatch_alert(alert, db_session)
    channels_used = [d.channel for d in deliveries]

    assert "dashboard" in channels_used
    assert "sms" in channels_used
    assert "whatsapp" in channels_used
    assert "ivr" in channels_used
    assert "siren" not in channels_used

    # 2 contacts (volunteer + gram_panchayat) -> each gets SMS, WhatsApp, IVR (6) + 1 Dashboard = 7
    assert len(deliveries) == 7


def test_routing_danger_severity(db_session, test_setup):
    """Danger severity routes to all contacts (vol, GP, ASDMA) + activates Siren."""
    v_as = test_setup["v_as"]
    dispatcher = AlertDispatcher(rate_limit_seconds=0)

    alert = Alert(
        village_id=v_as.id,
        severity="danger",
        hazard="flood",
        message="Critical flood danger level breached!",
        status="active",
        source="rule",
    )
    db_session.add(alert)
    db_session.commit()

    deliveries = dispatcher.dispatch_alert(alert, db_session)
    channels_used = [d.channel for d in deliveries]

    assert "dashboard" in channels_used
    assert "siren" in channels_used
    assert "sms" in channels_used
    assert "whatsapp" in channels_used
    assert "ivr" in channels_used

    # 3 contacts (volunteer, GP, ASDMA) -> 3 * 3 (sms, wa, ivr) = 9 + 1 Dashboard + 1 Siren = 11
    assert len(deliveries) == 11


# ==========================================
# 2. Language Selection
# ==========================================

def test_language_selection_multilingual():
    """Verify translation templates correctly generate localized text for each language."""
    # Assamese
    msg_as = get_alert_message("flood", "danger", "assamese", "Jonai", 152.4, "cm")
    assert "জৰুৰী বিপদ সংকেত" in msg_as
    assert "Jonai" in msg_as
    assert "152.4cm" in msg_as

    # Bodo
    msg_bodo = get_alert_message("flood", "danger", "bodo", "Kokrajhar", 140.0, "cm")
    assert "गिख्रोंथाव खौरां" in msg_bodo
    assert "Kokrajhar" in msg_bodo

    # Bengali
    msg_bn = get_alert_message("flood", "warning", "bengali", "Barpeta Char", 125.0, "cm")
    assert "সতর্কবার্তা" in msg_bn
    assert "Barpeta Char" in msg_bn

    # Hindi
    msg_hi = get_alert_message("landslide", "danger", "hindi", "Pahar Gaon", 85.5, "%")
    assert "खतरे की चेतावनी" in msg_hi
    assert "Pahar Gaon" in msg_hi

    # English fallback
    msg_en = get_alert_message("earthquake", "warning", "english", "Guwahati", 5.2, "Richter")
    assert "Warning: Moderate earthquake tremor" in msg_en


def test_language_assigned_to_alert_during_dispatch(db_session, test_setup):
    """Dispatcher inspects village language and sets alert.language for voice/IVR adapters."""
    v_bodo = test_setup["v_bodo"]
    dispatcher = AlertDispatcher(rate_limit_seconds=0)

    alert = Alert(
        village_id=v_bodo.id,
        severity="danger",
        hazard="flood",
        message="Bodo alert message",
        status="active",
        source="rule",
    )
    db_session.add(alert)
    db_session.commit()

    dispatcher.dispatch_alert(alert, db_session)
    assert getattr(alert, "language", None) == "bodo"


# ==========================================
# 3. Retries with Backoff
# ==========================================

def test_retry_success_after_transient_failure():
    """Adapter retries when transient errors occur and succeeds once failure counter clears."""
    # Mock SMS provider configured to fail twice, then succeed
    mock_provider = MockSMSProvider(fail_count=2)
    sms_adapter = SMSAdapter(provider=mock_provider)

    dispatcher = AlertDispatcher(
        sms_adapter=sms_adapter,
        max_retries=3,
        retry_base_delay=0.01,
    )

    alert = Alert(id=999, village_id=1, severity="advisory", hazard="flood", message="Test retry")
    contact = Contact(id=1, village_id=1, name="Test Contact", phone="+919876543210", role="volunteer")

    result = dispatcher.send_with_retry(sms_adapter, alert=alert, contact=contact)
    assert result.is_success
    assert result.status == "sent"
    assert len(mock_provider.sent_messages) == 1
    assert mock_provider._fail_remaining == 0


def test_retry_exhaustion_marks_failure():
    """When retries exceed max_retries, result is marked failed."""
    # Fails 5 times, but max_retries is only 2
    mock_provider = MockSMSProvider(fail_count=5)
    sms_adapter = SMSAdapter(provider=mock_provider)

    dispatcher = AlertDispatcher(
        sms_adapter=sms_adapter,
        max_retries=2,
        retry_base_delay=0.01,
    )

    alert = Alert(id=999, village_id=1, severity="advisory", hazard="flood", message="Test retry fail")
    contact = Contact(id=1, village_id=1, name="Test Contact", phone="+919876543210", role="volunteer")

    result = dispatcher.send_with_retry(sms_adapter, alert=alert, contact=contact)
    assert not result.is_success
    assert result.status == "failed"
    assert len(mock_provider.sent_messages) == 0


# ==========================================
# 4. Per-Village Rate Limiting
# ==========================================

def test_rate_limiting_suppresses_rapid_duplicate_dispatches(db_session, test_setup):
    """Subsequent dispatches for the same village and severity are suppressed within cooldown."""
    v_as = test_setup["v_as"]
    dispatcher = AlertDispatcher(rate_limit_seconds=600)  # 10 minute cooldown
    dispatcher.clear_rate_limits()

    alert1 = Alert(
        village_id=v_as.id,
        severity="warning",
        hazard="flood",
        message="Warning 1",
        status="active",
        source="rule",
    )
    db_session.add(alert1)
    db_session.commit()

    # First dispatch passes
    d1 = dispatcher.dispatch_alert(alert1, db_session)
    assert len(d1) > 0

    # Second immediate dispatch for same village and warning severity is rate-limited
    alert2 = Alert(
        village_id=v_as.id,
        severity="warning",
        hazard="flood",
        message="Warning 2 duplicate",
        status="active",
        source="rule",
    )
    db_session.add(alert2)
    db_session.commit()

    d2 = dispatcher.dispatch_alert(alert2, db_session)
    assert len(d2) == 0  # Suppressed by rate limit!

    # But escalation to 'danger' BYPASSES rate limiting!
    alert3 = Alert(
        village_id=v_as.id,
        severity="danger",
        hazard="flood",
        message="Danger escalation!",
        status="active",
        source="rule",
    )
    db_session.add(alert3)
    db_session.commit()

    d3 = dispatcher.dispatch_alert(alert3, db_session)
    assert len(d3) > 0  # Passed because danger bypasses rate limiting


def test_bypass_rate_limit_flag(db_session, test_setup):
    """Setting bypass_rate_limit=True forces dispatch through even during cooldown."""
    v_as = test_setup["v_as"]
    dispatcher = AlertDispatcher(rate_limit_seconds=600)
    dispatcher.clear_rate_limits()

    alert = Alert(
        village_id=v_as.id,
        severity="advisory",
        hazard="flood",
        message="Advisory 1",
        status="active",
        source="rule",
    )
    db_session.add(alert)
    db_session.commit()

    d1 = dispatcher.dispatch_alert(alert, db_session)
    assert len(d1) > 0

    # Force through with bypass
    d2 = dispatcher.dispatch_alert(alert, db_session, bypass_rate_limit=True)
    assert len(d2) > 0


# ==========================================
# 5. Pluggable Adapters Direct Interface Test
# ==========================================

def test_channel_adapters_common_interface():
    """Verify all adapters adhere to send(alert, contact) -> DeliveryResult."""
    alert = Alert(id=1, village_id=1, severity="warning", hazard="flood", message="Alert text")
    contact = Contact(id=1, village_id=1, name="Test Contact", phone="+919800000000", role="volunteer")

    adapters = [
        SMSAdapter(provider=MockSMSProvider()),
        IVRAdapter(provider=MockVoiceProvider()),
        WhatsAppAdapter(provider=MockWhatsAppProvider()),
        DashboardAdapter(),
        SirenAdapter(),
    ]

    for adapter in adapters:
        res = adapter.send(alert, contact)
        assert isinstance(res, DeliveryResult)
        assert res.channel == adapter.name
        assert res.status in ("sent", "delivered")
        assert str(res) == res.status
