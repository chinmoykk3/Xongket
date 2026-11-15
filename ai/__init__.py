"""AI package — forecasting, anomaly detection, and geotechnical risk for Xongket."""

from ai.anomaly.detector import AnomalyDetectionResult, SensorAnomalyDetector, default_anomaly_detector
from ai.forecasting.models import FloodForecaster, MultiHorizonForecast, PersistenceBaseline
from ai.landslide.risk import LandslideRiskAssessment, compute_landslide_risk

__all__ = [
    "FloodForecaster",
    "PersistenceBaseline",
    "MultiHorizonForecast",
    "SensorAnomalyDetector",
    "AnomalyDetectionResult",
    "default_anomaly_detector",
    "compute_landslide_risk",
    "LandslideRiskAssessment",
]
