"""Tests for sensor anomaly detection (Rolling Z-score + Isolation Forest) and exclusion from alerts."""

from datetime import datetime, timezone

import numpy as np
import pytest

from ai.anomaly.detector import SensorAnomalyDetector
from app.models.alert import Alert
from app.models.district import District
from app.models.node import Node
from app.models.threshold import Threshold
from app.models.village import Village


class TestAnomalyDetectorUnit:
    def test_normal_readings_not_flagged(self):
        detector = SensorAnomalyDetector(window_size=10, z_threshold=3.5)
        # Sequence of realistic noisy water levels around 220 cm
        rng = np.random.default_rng(42)
        history = list(220.0 + rng.normal(0, 1.5, size=20))

        result = detector.evaluate_reading(
            current_value=221.2,
            recent_history=history,
            sensor_type="water_level",
        )
        assert result.is_anomaly is False
        assert result.anomaly_type is None

    def test_stuck_value_flagged(self):
        detector = SensorAnomalyDetector(stuck_consecutive_limit=5)
        # Flat history
        history = [215.0, 215.0, 215.0, 215.0]
        result = detector.evaluate_reading(
            current_value=215.0,
            recent_history=history,
            sensor_type="water_level",
        )
        assert result.is_anomaly is True
        assert result.anomaly_type == "stuck_value"

    def test_spike_flagged(self):
        detector = SensorAnomalyDetector(window_size=10, z_threshold=3.5)
        # Stable baseline around 200 cm
        history = [200.0, 201.0, 199.5, 200.5, 200.2, 199.8, 200.1, 200.4, 200.0, 199.9]
        # Massive sudden spike to 380 cm
        result = detector.evaluate_reading(
            current_value=380.0,
            recent_history=history,
            sensor_type="water_level",
        )
        assert result.is_anomaly is True
        assert result.anomaly_type == "spike"

    def test_isolation_forest_drift(self):
        detector = SensorAnomalyDetector(window_size=10, contamination=0.05)
        # Train baseline on typical 200-220 cm range
        baseline = np.linspace(200.0, 220.0, 100) + np.random.normal(0, 0.5, 100)
        detector.fit_baseline(baseline)

        # Subtle out-of-distribution drift
        history = [215.0 + i * 2.5 for i in range(10)]
        result = detector.evaluate_reading(
            current_value=280.0,
            recent_history=history,
            sensor_type="water_level",
        )
        # Should be flagged either as drift or statistical anomaly
        assert result.is_anomaly is True


class TestAnomalyIngestAndAlertExclusion:
    def test_anomalous_spike_is_flagged_and_excluded_from_alert_engine(self, client, db_session):
        # 1. Setup district, village, threshold (danger = 450 cm), and node
        dist = District(name="Dhemaji_AnomalyTest", state="Assam")
        db_session.add(dist)
        db_session.flush()

        vil = Village(
            district_id=dist.id,
            name="Gogamukh",
            lat=27.5,
            lng=94.5,
            population=8000,
            language="assamese",
        )
        db_session.add(vil)
        db_session.flush()

        thresh = Threshold(
            village_id=vil.id,
            node_type="water_level",
            warning_level=400.0,
            danger_level=450.0,
        )
        db_session.add(thresh)

        node = Node(
            village_id=vil.id,
            type="water_level",
            lat=27.5,
            lng=94.5,
            status="active",
            api_key="anom-key-1",
            device_type="esp8266",
            source="device",
        )
        db_session.add(node)
        db_session.commit()

        # Ingest 12 normal readings around 200 cm
        headers = {"X-API-Key": node.api_key}
        for i in range(12):
            resp = client.post(
                "/ingest",
                json={
                    "node_id": node.id,
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "value": 200.0 + (i % 3) * 0.5,
                    "unit": "cm",
                },
                headers=headers,
            )
            assert resp.status_code == 201

        # Now send an unphysical single spike directly to 490 cm (> danger threshold 450 cm)
        spike_resp = client.post(
            "/ingest",
            json={
                "node_id": node.id,
                "ts": datetime.now(timezone.utc).isoformat(),
                "value": 490.0,
                "unit": "cm",
            },
            headers=headers,
        )
        assert spike_resp.status_code == 201
        data = spike_resp.json()["readings"][0]
        # Must be flagged as anomaly
        assert data["quality_flag"] == "anomaly"

        # Assert no alerts were raised in the database for this village!
        alerts_in_db = db_session.query(Alert).filter(Alert.village_id == vil.id).all()
        assert len(alerts_in_db) == 0, "Anomalous reading must be excluded from alert decisions!"
