"""Unit and regression tests for flood forecasting models in /ai."""

from __future__ import annotations

import numpy as np
import pytest

from ai.forecasting.models import (
    FEATURE_NAMES,
    HORIZONS,
    FloodForecaster,
    PersistenceBaseline,
    extract_features,
)
from ai.forecasting.synthetic_data import generate_synthetic_river_dataset


class TestSyntheticDataGenerator:
    def test_generate_synthetic_dataset_properties(self):
        df = generate_synthetic_river_dataset(days=30, seed=123)
        assert len(df) == 30 * 24
        assert "water_level_cm" in df.columns
        assert "rainfall_mm" in df.columns
        assert "upstream_level_cm" in df.columns
        assert "is_synthetic" in df.columns
        assert df["is_synthetic"].all()
        assert df["data_disclaimer"].str.contains("SYNTHETIC").all()
        # Verify physical boundaries
        assert (df["water_level_cm"] >= 100.0).all()
        assert (df["rainfall_mm"] >= 0.0).all()

    def test_feature_extraction(self):
        df = generate_synthetic_river_dataset(days=10, seed=42)
        feat_df, targets = extract_features(df)
        for col in FEATURE_NAMES:
            assert col in feat_df.columns
        for h in HORIZONS:
            assert h in targets
            assert len(targets[h]) == len(df)


class TestFloodForecaster:
    @pytest.fixture(scope="class")
    def trained_forecaster(self):
        # Generate 60 days of synthetic data for quick unit test training
        df = generate_synthetic_river_dataset(days=60, seed=99)
        forecaster = FloodForecaster(random_state=42)
        forecaster.train(df)
        return forecaster

    def test_model_training_and_structure(self, trained_forecaster):
        assert trained_forecaster.is_trained
        for h in HORIZONS:
            assert h in trained_forecaster.models_point
            assert h in trained_forecaster.models_lower
            assert h in trained_forecaster.models_upper

    def test_multi_horizon_prediction_with_uncertainty(self, trained_forecaster):
        features = {
            "water_level_current": 380.0,
            "water_level_lag1": 372.0,
            "water_level_lag3": 355.0,
            "water_level_lag6": 330.0,
            "rate_of_rise_1h": 8.0,
            "rate_of_rise_3h": 25.0,
            "rainfall_1h": 12.0,
            "rainfall_3h_sum": 35.0,
            "rainfall_6h_sum": 70.0,
            "rainfall_24h_sum": 110.0,
            "upstream_level_current": 410.0,
            "upstream_delta_3h": 22.0,
            "catchment_saturation": 88.0,
            "hour_sin": 0.5,
            "hour_cos": 0.86,
            "doy_sin": 0.95,
            "doy_cos": -0.3,
        }

        result = trained_forecaster.predict_single(
            features_dict=features,
            station_id="STATION_TEST",
            danger_threshold_cm=450.0,
            warning_threshold_cm=400.0,
        )

        assert result.station_id == "STATION_TEST"
        assert result.is_synthetic_model is True

        for h in HORIZONS:
            hz = result.forecasts[h]
            assert hz.horizon_hours == h
            # Verify quantile ordering: p10 <= p50 <= p90
            assert hz.lower_bound <= hz.predicted_value
            assert hz.predicted_value <= hz.upper_bound
            # Check explainability
            assert len(hz.contributing_features) > 0
            assert isinstance(hz.explanation, str)
            assert len(hz.explanation) > 10

    def test_persistence_baseline(self):
        pers = PersistenceBaseline()
        curr = np.array([210.0, 340.5, 412.0])
        for h in HORIZONS:
            pred = pers.predict(curr, h)
            np.testing.assert_array_equal(pred, curr)
