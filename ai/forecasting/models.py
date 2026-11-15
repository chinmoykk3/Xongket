"""Flood Forecasting Models for River Stations in Assam.

Models:
1. Persistence Baseline: y_hat(t+h) = y(t)
2. Gradient Boosting Regressor with Quantile Regression for Uncertainty (p10, p50, p90)
3. Multi-horizon forecasting: 1, 3, and 6 hours ahead.
4. Explainability: Ranks top contributing features for each prediction.

NOTE: All models are calibrated on synthetic hydrological simulations.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor


HORIZONS = [1, 3, 6]  # 1h, 3h, 6h ahead


FEATURE_NAMES = [
    "water_level_current",
    "water_level_lag1",
    "water_level_lag3",
    "water_level_lag6",
    "rate_of_rise_1h",
    "rate_of_rise_3h",
    "rainfall_1h",
    "rainfall_3h_sum",
    "rainfall_6h_sum",
    "rainfall_24h_sum",
    "upstream_level_current",
    "upstream_delta_3h",
    "catchment_saturation",
    "hour_sin",
    "hour_cos",
    "doy_sin",
    "doy_cos",
]

# Friendly descriptions for explanation generation
FEATURE_DESCRIPTIONS = {
    "water_level_current": "Current river water level",
    "water_level_lag1": "Water level 1 hour ago",
    "water_level_lag3": "Water level 3 hours ago",
    "water_level_lag6": "Water level 6 hours ago",
    "rate_of_rise_1h": "Current rate of rise (1-hour)",
    "rate_of_rise_3h": "3-hour cumulative rate of rise",
    "rainfall_1h": "Recent 1-hour rainfall",
    "rainfall_3h_sum": "Cumulative 3-hour rainfall",
    "rainfall_6h_sum": "Cumulative 6-hour rainfall",
    "rainfall_24h_sum": "Antecedent 24-hour rainfall",
    "upstream_level_current": "Upstream gauge level",
    "upstream_delta_3h": "Upstream 3-hour surge",
    "catchment_saturation": "Catchment soil saturation",
    "hour_sin": "Diurnal cycle phase",
    "hour_cos": "Diurnal cycle phase",
    "doy_sin": "Monsoon seasonality phase",
    "doy_cos": "Monsoon seasonality phase",
}


@dataclass
class ForecastHorizonResult:
    horizon_hours: int
    predicted_value: float
    lower_bound: float  # 10th percentile
    upper_bound: float  # 90th percentile
    unit: str = "cm"
    contributing_features: List[Dict[str, Any]] = field(default_factory=list)
    explanation: str = ""


@dataclass
class MultiHorizonForecast:
    node_id: Optional[int]
    station_id: str
    generated_at_ts: str
    forecasts: Dict[int, ForecastHorizonResult]
    model_name: str = "HistGradientBoosting-Quantile"
    is_synthetic_model: bool = True


def extract_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[int, pd.Series]]:
    """Transform raw hourly time-series into feature matrix and multi-horizon targets."""
    df = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["timestamp"] = pd.to_datetime(df["timestamp"])

    df = df.sort_values("timestamp").reset_index(drop=True)

    # Cyclical features
    doy = df["timestamp"].dt.day_of_year
    hour = df["timestamp"].dt.hour
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24.0)

    # Lags and differences
    df["water_level_current"] = df["water_level_cm"]
    df["water_level_lag1"] = df["water_level_cm"].shift(1)
    df["water_level_lag3"] = df["water_level_cm"].shift(3)
    df["water_level_lag6"] = df["water_level_cm"].shift(6)
    df["rate_of_rise_1h"] = df["water_level_cm"] - df["water_level_lag1"]
    df["rate_of_rise_3h"] = df["water_level_cm"] - df["water_level_lag3"]

    # Rainfall aggregations
    df["rainfall_1h"] = df["rainfall_mm"]
    df["rainfall_3h_sum"] = df["rainfall_mm"].rolling(3, min_periods=1).sum()
    df["rainfall_6h_sum"] = df["rainfall_mm"].rolling(6, min_periods=1).sum()
    df["rainfall_24h_sum"] = df["rainfall_mm"].rolling(24, min_periods=1).sum()

    # Upstream influence
    df["upstream_level_current"] = df["upstream_level_cm"]
    df["upstream_delta_3h"] = df["upstream_level_cm"] - df["upstream_level_cm"].shift(3)

    if "catchment_saturation_pct" in df.columns:
        df["catchment_saturation"] = df["catchment_saturation_pct"]
    else:
        df["catchment_saturation"] = 50.0

    # Targets for 1h, 3h, 6h ahead
    targets = {}
    for h in HORIZONS:
        targets[h] = df["water_level_cm"].shift(-h)

    return df, targets


class PersistenceBaseline:
    """Baseline: Forecast at t+h is simply the current value y(t)."""

    def __init__(self, horizons: List[int] = HORIZONS):
        self.horizons = horizons

    def predict(self, current_levels: np.ndarray, horizon: int) -> np.ndarray:
        return np.asarray(current_levels, dtype=float)


class FloodForecaster:
    """Multi-horizon Gradient Boosting regressor with Quantile Regression for uncertainty."""

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.models_point: Dict[int, HistGradientBoostingRegressor] = {}
        self.models_lower: Dict[int, HistGradientBoostingRegressor] = {}
        self.models_upper: Dict[int, HistGradientBoostingRegressor] = {}
        self.feature_means: Dict[str, float] = {}
        self.feature_stds: Dict[str, float] = {}
        self.is_trained: bool = False

    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train models for 1h, 3h, and 6h horizons using point and quantile regression."""
        feat_df, targets = extract_features(df)

        # Drop initial rows with NaNs from lags and trailing rows without targets
        valid_mask = feat_df[FEATURE_NAMES].notna().all(axis=1)
        for h in HORIZONS:
            valid_mask = valid_mask & targets[h].notna()

        X = feat_df.loc[valid_mask, FEATURE_NAMES].values
        valid_df = feat_df.loc[valid_mask]

        # Compute baseline feature stats for explanations
        for col in FEATURE_NAMES:
            self.feature_means[col] = float(valid_df[col].mean())
            self.feature_stds[col] = float(max(valid_df[col].std(), 1e-4))

        metrics = {}

        for h in HORIZONS:
            y = targets[h].loc[valid_mask].values

            # Split: 80% train, 20% validation
            split_idx = int(0.8 * len(X))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]

            # 1. Point prediction (mean / least squares)
            point_reg = HistGradientBoostingRegressor(
                loss="squared_error",
                max_iter=120,
                max_depth=5,
                min_samples_leaf=10,
                learning_rate=0.08,
                random_state=self.random_state,
            )
            point_reg.fit(X_train, y_train)
            self.models_point[h] = point_reg

            # 2. Lower bound (p10 quantile)
            lower_reg = HistGradientBoostingRegressor(
                loss="quantile",
                quantile=0.10,
                max_iter=120,
                max_depth=5,
                min_samples_leaf=10,
                learning_rate=0.08,
                random_state=self.random_state,
            )
            lower_reg.fit(X_train, y_train)
            self.models_lower[h] = lower_reg

            # 3. Upper bound (p90 quantile)
            upper_reg = HistGradientBoostingRegressor(
                loss="quantile",
                quantile=0.90,
                max_iter=120,
                max_depth=5,
                min_samples_leaf=10,
                learning_rate=0.08,
                random_state=self.random_state,
            )
            upper_reg.fit(X_train, y_train)
            self.models_upper[h] = upper_reg

            # Validation metrics
            preds = point_reg.predict(X_val)
            mae = float(np.mean(np.abs(y_val - preds)))
            rmse = float(np.sqrt(np.mean((y_val - preds) ** 2)))
            metrics[h] = {"mae": round(mae, 2), "rmse": round(rmse, 2)}

        self.is_trained = True
        return metrics

    def predict_single(
        self,
        features_dict: Dict[str, float],
        station_id: str = "STATION_TARGET",
        node_id: Optional[int] = None,
        danger_threshold_cm: float = 450.0,
        warning_threshold_cm: float = 400.0,
    ) -> MultiHorizonForecast:
        """Produce 1h, 3h, 6h predictions with uncertainty and explanations from a feature map."""
        if not self.is_trained:
            # Fallback simple heuristic if model not yet trained
            current = float(features_dict.get("water_level_current", 250.0))
            rain6 = float(features_dict.get("rainfall_6h_sum", 0.0))
            rise = float(features_dict.get("rate_of_rise_1h", 0.0))
            forecasts = {}
            for h in HORIZONS:
                predicted = round(current + rise * h + rain6 * 0.25 * h, 1)
                forecasts[h] = ForecastHorizonResult(
                    horizon_hours=h,
                    predicted_value=predicted,
                    lower_bound=round(predicted - 10.0 * np.sqrt(h), 1),
                    upper_bound=round(predicted + 15.0 * np.sqrt(h), 1),
                    contributing_features=[],
                    explanation="Heuristic fallback (model not yet trained on synthetic dataset).",
                )
            return MultiHorizonForecast(
                node_id=node_id,
                station_id=station_id,
                generated_at_ts=features_dict.get("timestamp_str", ""),
                forecasts=forecasts,
            )

        X_vec = np.array([[float(features_dict.get(col, 0.0)) for col in FEATURE_NAMES]])

        results: Dict[int, ForecastHorizonResult] = {}
        for h in HORIZONS:
            p_val = float(self.models_point[h].predict(X_vec)[0])
            l_val = float(self.models_lower[h].predict(X_vec)[0])
            u_val = float(self.models_upper[h].predict(X_vec)[0])

            # Ensure logical quantile ordering (p10 <= p50 <= p90)
            l_bound = min(l_val, p_val)
            u_bound = max(u_val, p_val)

            # Explainability: Determine top drivers
            top_factors, explanation = self._explain_prediction(
                features_dict, h, p_val, danger_threshold_cm, warning_threshold_cm
            )

            results[h] = ForecastHorizonResult(
                horizon_hours=h,
                predicted_value=round(p_val, 1),
                lower_bound=round(l_bound, 1),
                upper_bound=round(u_bound, 1),
                contributing_features=top_factors,
                explanation=explanation,
            )

        return MultiHorizonForecast(
            node_id=node_id,
            station_id=station_id,
            generated_at_ts=str(features_dict.get("timestamp_str", "")),
            forecasts=results,
            model_name="HistGradientBoosting-Quantile",
        )

    def _explain_prediction(
        self,
        features: Dict[str, float],
        horizon: int,
        predicted_level: float,
        danger_threshold: float,
        warning_threshold: float,
    ) -> Tuple[List[Dict[str, Any]], str]:
        """Generate human-readable explanation highlighting key drivers."""
        influences = []
        for feat in [
            "rainfall_6h_sum",
            "rainfall_24h_sum",
            "upstream_delta_3h",
            "rate_of_rise_1h",
            "catchment_saturation",
            "upstream_level_current",
        ]:
            val = float(features.get(feat, 0.0))
            mean = self.feature_means.get(feat, val)
            std = self.feature_stds.get(feat, 1.0)
            z = (val - mean) / std
            influences.append(
                {
                    "feature": feat,
                    "label": FEATURE_DESCRIPTIONS.get(feat, feat),
                    "value": round(val, 2),
                    "deviation_z": round(z, 2),
                }
            )

        # Sort features by absolute deviation from typical baseline
        influences.sort(key=lambda item: abs(item["deviation_z"]), reverse=True)
        top_two = influences[:2]

        # Plain language construction
        reasons = []
        for factor in top_two:
            feat = factor["feature"]
            val = factor["value"]
            if "rainfall" in feat and val > 15.0:
                reasons.append(f"heavy cumulative rainfall ({val} mm)")
            elif "upstream_delta" in feat and val > 10.0:
                reasons.append(f"upstream river surge (+{val} cm)")
            elif "rate_of_rise" in feat and val > 5.0:
                reasons.append(f"rapid localized rise (+{val} cm/h)")
            elif "saturation" in feat and val > 75.0:
                reasons.append(f"high catchment soil saturation ({val}%)")
            elif "upstream_level" in feat and val > 380.0:
                reasons.append(f"elevated upstream river level ({val} cm)")

        if not reasons:
            explanation = (
                f"{horizon}h forecast of {predicted_level:.1f} cm reflects baseline seasonal monsoon flow."
            )
        else:
            joined = " and ".join(reasons)
            if predicted_level >= danger_threshold:
                explanation = (
                    f"Forecasted to exceed danger level ({predicted_level:.1f} cm) in {horizon}h, "
                    f"driven primarily by {joined}."
                )
            elif predicted_level >= warning_threshold:
                explanation = (
                    f"Approaching warning level ({predicted_level:.1f} cm) in {horizon}h, "
                    f"influenced by {joined}."
                )
            else:
                explanation = (
                    f"{horizon}h forecast: {predicted_level:.1f} cm. Factors monitored: {joined}."
                )

        return top_two, explanation
