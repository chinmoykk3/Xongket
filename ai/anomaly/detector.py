"""Sensor Anomaly Detection using Rolling Z-Score and Isolation Forest.

Detects:
1. Stuck values: Sensor reporting invariant readings across multiple samples.
2. Spikes: Sudden physical impossibilities or extreme statistical jumps (|z| > 3.5).
3. Drift / Outliers: Slow uncalibrated sensor drift identified via Isolation Forest.

NOTE: All anomalous readings must be flagged and excluded from downstream alert evaluations.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


@dataclass
class AnomalyDetectionResult:
    is_anomaly: bool
    anomaly_type: Optional[str] = None  # "stuck_value", "spike", "drift", "isolation_forest_outlier"
    anomaly_score: float = 0.0  # Lower indicates higher anomaly in IsolationForest convention
    details: str = ""


class SensorAnomalyDetector:
    """Multivariate sensor anomaly detector combining statistical heuristics and Isolation Forest."""

    def __init__(
        self,
        window_size: int = 15,
        z_threshold: float = 3.5,
        stuck_consecutive_limit: int = 5,
        contamination: float = 0.03,
        random_state: int = 42,
    ):
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.stuck_consecutive_limit = stuck_consecutive_limit
        self.contamination = contamination
        self.random_state = random_state

        # Pre-trained or dynamically fit Isolation Forest
        self.iso_forest: Optional[IsolationForest] = None
        self._is_fitted: bool = False

    def fit_baseline(self, normal_series: np.ndarray) -> SensorAnomalyDetector:
        """Fit the Isolation Forest on a sequence of normal baseline readings."""
        if len(normal_series) < self.window_size + 5:
            return self

        X = self._extract_features_from_series(normal_series)
        if len(X) > 10:
            self.iso_forest = IsolationForest(
                n_estimators=50,
                contamination=self.contamination,
                random_state=self.random_state,
            )
            self.iso_forest.fit(X)
            self._is_fitted = True
        return self

    def _extract_features_from_series(self, values: np.ndarray) -> np.ndarray:
        """Extract [value, delta, rolling_mean, rolling_std, z_score] features."""
        n = len(values)
        rows = []
        for i in range(self.window_size, n):
            window = values[i - self.window_size : i]
            val = values[i]
            prev = values[i - 1]
            delta = val - prev
            mean = float(np.mean(window))
            std = float(np.std(window))
            z = (val - mean) / (std + 1e-4)
            rows.append([val, delta, mean, std, z])
        return np.array(rows) if rows else np.empty((0, 5))

    def evaluate_reading(
        self,
        current_value: float,
        recent_history: List[float],
        sensor_type: str = "water_level",
    ) -> AnomalyDetectionResult:
        """Evaluate a single reading against its recent historical window."""
        # 1. Check for Stuck Values
        if len(recent_history) >= self.stuck_consecutive_limit - 1:
            recent_tail = recent_history[-(self.stuck_consecutive_limit - 1) :]
            all_identical = all(abs(x - current_value) < 1e-5 for x in recent_tail)
            if all_identical:
                return AnomalyDetectionResult(
                    is_anomaly=True,
                    anomaly_type="stuck_value",
                    anomaly_score=-1.0,
                    details=f"Sensor value stuck at {current_value} for {self.stuck_consecutive_limit} consecutive readings.",
                )

        if len(recent_history) < 3:
            # Not enough history to judge statistical spikes or drift
            return AnomalyDetectionResult(is_anomaly=False, details="Insufficient history for anomaly checks.")

        history_arr = np.array(recent_history[-self.window_size :])
        mean = float(np.mean(history_arr))
        std = float(np.std(history_arr))
        delta = current_value - history_arr[-1]
        z_score = abs(current_value - mean) / (std + 1e-4)

        # Physical limits by sensor type
        max_physical_delta = {
            "water_level": 35.0,  # >35 cm instantaneous jump between consecutive readings is physically suspect
            "soil_moisture": 30.0,
            "temperature": 15.0,
            "humidity": 30.0,
            "rain_gauge": 80.0,
        }.get(sensor_type, 40.0)

        # 2. Check for Spikes
        if z_score > self.z_threshold and abs(delta) > max_physical_delta:
            return AnomalyDetectionResult(
                is_anomaly=True,
                anomaly_type="spike",
                anomaly_score=float(-z_score),
                details=f"Sudden spike detected: value={current_value}, delta={delta:.1f}, z-score={z_score:.2f}.",
            )

        # 3. Check for Drift / Outlier via Isolation Forest
        if self._is_fitted and self.iso_forest is not None:
            feat_vec = np.array([[current_value, delta, mean, std, (current_value - mean) / (std + 1e-4)]])
            pred = self.iso_forest.predict(feat_vec)[0]  # -1 is anomaly, 1 is normal
            score = float(self.iso_forest.decision_function(feat_vec)[0])
            if pred == -1:
                return AnomalyDetectionResult(
                    is_anomaly=True,
                    anomaly_type="drift",
                    anomaly_score=round(score, 3),
                    details=f"Isolation Forest flagged reading as statistical drift (decision score={score:.3f}).",
                )

        return AnomalyDetectionResult(
            is_anomaly=False,
            anomaly_score=0.0,
            details="Reading passed all anomaly filters.",
        )


# Global singleton instance for easy import across backend services
default_anomaly_detector = SensorAnomalyDetector()
