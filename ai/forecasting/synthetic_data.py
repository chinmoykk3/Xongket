"""Synthetic Hydrological Dataset Generator for Assam Flood Forecasting.

================================================================================
DISCLAIMER / LABEL:
THIS IS A SYNTHETIC SIMULATION DATASET GENERATED FOR ALGORITHM RESEARCH,
SYSTEM TESTING, AND DEMONSTRATION OF THE XONGKET EARLY-WARNING PLATFORM.
IT DOES NOT REPRESENT REAL-WORLD MEASURED GAUGE OBSERVATIONS.
DO NOT USE THIS DATA FOR REAL-WORLD FLOOD EMERGENCY DECISIONS WITHOUT
VALIDATING AGAINST OFFICIAL CENTRAL WATER COMMISSION (CWC) OR ASDMA GAUGES.
================================================================================
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd


@dataclass
class SyntheticStationConfig:
    station_id: str
    station_name: str
    base_level_cm: float = 220.0
    danger_level_cm: float = 450.0
    warning_level_cm: float = 400.0
    is_upstream: bool = False
    lag_hours_to_downstream: float = 4.0


def generate_synthetic_river_dataset(
    start_date: str = "2024-01-01",
    days: int = 365 * 2,
    seed: int = 42,
    output_path: Optional[str] = None,
) -> pd.DataFrame:
    """Generate realistic hourly synthetic river gauge and rainfall data.

    Hydrological characteristics simulated:
    1. Monsoon seasonality: Elevated baseflow from May through September,
       peaking in July-August following the Brahmaputra monsoon pattern.
    2. Synoptic weather events: 2-5 day heavy rainfall storms occurring
       predominantly during the monsoon.
    3. Upstream station surge: Upstream river surge propagates downstream
       with a 3-5 hour physical transport lag.
    4. Rainfall-to-runoff response: Local catchment rainfall increases river
       levels following a unit hydrograph (peaking 3-6 hours after rain).
    5. Soil saturation memory: Rainfall late in the monsoon produces sharper
       runoff peaks than identical rainfall on dry pre-monsoon soil.
    """
    rng = np.random.default_rng(seed)
    n_hours = days * 24
    start_dt = datetime.fromisoformat(start_date)
    timestamps = [start_dt + timedelta(hours=i) for i in range(n_hours)]

    # 1. Day of year and hour of day
    doy = np.array([ts.timetuple().tm_yday for ts in timestamps])
    hour = np.array([ts.hour for ts in timestamps])

    # 2. Monsoon seasonal baseflow curve (peaks around day 205 = late July)
    # Elevated baseline during monsoon (days 130 to 280)
    monsoon_envelope = np.exp(-0.5 * ((doy - 205) / 45.0) ** 2)
    base_seasonal_flow = 180.0 + 195.0 * monsoon_envelope

    # Diurnal cycle (small 2-4 cm daily variation from snowmelt/evaporation)
    diurnal_cycle = 3.0 * np.sin(2.0 * np.pi * hour / 24.0)

    # 3. Generate Synoptic Rainfall Events
    # Rain is frequent and intense during monsoon season
    rain_probability = 0.08 + 0.35 * monsoon_envelope
    rain_mask = rng.random(n_hours) < rain_probability

    # Gamma distribution for rainfall intensity
    raw_rain = rng.gamma(shape=1.8, scale=10.0, size=n_hours) * rain_mask
    # Multi-day storm spells (2-4 consecutive wet days during monsoon)
    storm_triggers = rng.random(n_hours) < (0.025 * monsoon_envelope)
    storm_rain = np.zeros(n_hours)
    for i in np.where(storm_triggers)[0]:
        duration = rng.integers(24, 72)
        end_idx = min(n_hours, i + duration)
        storm_rain[i:end_idx] += rng.gamma(shape=2.5, scale=14.0, size=end_idx - i)

    rainfall_mm = np.clip(raw_rain + storm_rain, 0.0, 180.0)

    # 4. Antecedent Soil Moisture / Catchment Saturation
    saturation = np.zeros(n_hours)
    current_sat = 0.3
    for t in range(n_hours):
        current_sat = current_sat * 0.994 + (rainfall_mm[t] / 25.0) * 0.006
        saturation[t] = min(1.0, current_sat)

    # 5. Upstream River Station Level Simulation
    upstream_runoff_kernel = np.array([0.1, 0.25, 0.35, 0.2, 0.1])
    upstream_rain_surge = np.convolve(rainfall_mm, upstream_runoff_kernel, mode="same")
    upstream_noise = rng.normal(0.0, 1.5, size=n_hours)
    upstream_level_cm = (
        base_seasonal_flow * 0.95
        + upstream_rain_surge * (0.8 + 0.7 * saturation)
        + diurnal_cycle
        + upstream_noise
    )
    upstream_level_cm = np.clip(upstream_level_cm, 150.0, 580.0)

    # 6. Target Downstream River Station Level (e.g. Majuli / Brahmaputra Mainstem)
    # Reacts to upstream station with lag ~4 hours, plus local catchment runoff
    lag_upstream = 4
    shifted_upstream = np.roll(upstream_level_cm, lag_upstream)
    shifted_upstream[:lag_upstream] = upstream_level_cm[:lag_upstream]

    downstream_kernel = np.array([0.05, 0.15, 0.25, 0.30, 0.15, 0.10])
    local_rain_surge = np.convolve(rainfall_mm, downstream_kernel, mode="same")
    local_noise = rng.normal(0.0, 1.2, size=n_hours)

    target_water_level_cm = (
        0.65 * shifted_upstream
        + 0.35 * (base_seasonal_flow + local_rain_surge * (1.1 + 0.9 * saturation))
        + diurnal_cycle
        + local_noise
    )
    # Physically realistic bounds
    target_water_level_cm = np.clip(target_water_level_cm, 160.0, 600.0)

    df = pd.DataFrame(
        {
            "timestamp": timestamps,
            "station_id": "STATION_TARGET_MAJULI",
            "upstream_station_id": "STATION_UPSTREAM_DHEMAJI",
            "water_level_cm": np.round(target_water_level_cm, 2),
            "upstream_level_cm": np.round(upstream_level_cm, 2),
            "rainfall_mm": np.round(rainfall_mm, 2),
            "catchment_saturation_pct": np.round(saturation * 100.0, 1),
            "is_synthetic": True,
            "data_disclaimer": "SYNTHETIC_RESEARCH_DATA_NOT_REAL_OBSERVATIONS",
        }
    )

    if output_path:
        df.to_csv(output_path, index=False)

    return df


if __name__ == "__main__":
    import os
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    out_file = os.path.join(data_dir, "synthetic_assam_river_gauges.csv")
    df = generate_synthetic_river_dataset(output_path=out_file)
    print(f"[OK] Generated synthetic dataset with {len(df)} hourly rows saved to: {out_file}")
