"""Landslide Risk Scoring Engine for Hilly and Slope Areas in Assam.

Computes a multi-factor geotechnical susceptibility score (0 - 100) based on:
1. Soil Moisture (pore water pressure proxy, 0 - 100%)
2. 24-hour antecedent rainfall (triggering intensity, mm)
3. 72-hour antecedent rainfall (catchment saturation memory, mm)
4. Slope class ("low", "moderate", "high", "steep", or degrees)

Outputs:
- risk_score: 0.0 to 100.0
- severity: "normal" | "advisory" | "warning" | "danger"
- contributing_factors: key quantitative weights
- explanation: plain-language reasoning for responders
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Union


@dataclass
class LandslideRiskAssessment:
    risk_score: float  # 0.0 to 100.0
    severity: str  # "normal", "advisory", "warning", "danger"
    soil_moisture_pct: float
    rainfall_24h_mm: float
    rainfall_72h_mm: float
    slope_class: str
    contributing_factors: Dict[str, Any] = field(default_factory=dict)
    explanation: str = ""


def parse_slope_factor(slope: Union[str, float, int]) -> tuple[float, str]:
    """Parse slope into a normalized weight (0.2 to 1.0) and descriptive label."""
    if isinstance(slope, (int, float)):
        angle = float(slope)
        if angle < 15.0:
            return 0.20, "low"
        elif angle < 30.0:
            return 0.60, "moderate"
        elif angle < 45.0:
            return 0.90, "high"
        else:
            return 1.00, "steep"

    norm_str = str(slope).strip().lower()
    mapping = {
        "low": (0.20, "low"),
        "gentle": (0.20, "low"),
        "moderate": (0.60, "moderate"),
        "medium": (0.60, "moderate"),
        "high": (0.90, "high"),
        "steep": (1.00, "steep"),
        "severe": (1.00, "steep"),
    }
    return mapping.get(norm_str, (0.60, "moderate"))


def compute_landslide_risk(
    soil_moisture_pct: float,
    rainfall_24h_mm: float,
    rainfall_72h_mm: float,
    slope: Union[str, float, int] = "moderate",
) -> LandslideRiskAssessment:
    """Calculate landslide risk score and severity from hydrological & geotechnical factors."""
    # 1. Slope Weight
    slope_weight, slope_label = parse_slope_factor(slope)

    # 2. Soil Saturation Factor (0.0 to 1.0)
    # Soil below 35% has safe pore pressure; above 75% enters plastic/liquefaction zone
    sat_factor = max(0.0, min(1.0, (soil_moisture_pct - 35.0) / 55.0))

    # 3. Antecedent Precipitation Factor (0.0 to 1.0)
    rain_24h_factor = max(0.0, min(1.0, rainfall_24h_mm / 80.0))
    rain_72h_factor = max(0.0, min(1.0, rainfall_72h_mm / 160.0))
    rain_factor = 0.55 * rain_24h_factor + 0.45 * rain_72h_factor

    # 4. Interaction Susceptibility Score (0 to 100)
    # Landslides physically require geotechnical slope combined with water triggering
    base_index = (0.42 * sat_factor + 0.38 * rain_factor + 0.20 * slope_weight)
    slope_multiplier = 0.50 + 0.50 * slope_weight
    raw_score = 100.0 * base_index * slope_multiplier
    risk_score = round(max(0.0, min(100.0, raw_score)), 1)

    # 5. Severity Categorization
    if risk_score >= 75.0:
        severity = "danger"
    elif risk_score >= 55.0:
        severity = "warning"
    elif risk_score >= 30.0:
        severity = "advisory"
    else:
        severity = "normal"

    # 6. Plain-Language Explanation
    drivers = []
    if soil_moisture_pct >= 75.0:
        drivers.append(f"critically saturated soil moisture ({soil_moisture_pct:.1f}%)")
    elif soil_moisture_pct >= 60.0:
        drivers.append(f"elevated soil moisture ({soil_moisture_pct:.1f}%)")

    if rainfall_24h_mm >= 50.0:
        drivers.append(f"intense 24h rainfall ({rainfall_24h_mm:.1f} mm)")
    elif rainfall_72h_mm >= 100.0:
        drivers.append(f"sustained 72h rainfall ({rainfall_72h_mm:.1f} mm)")

    if slope_weight >= 0.90:
        drivers.append(f"steep slope topography ({slope_label})")

    if not drivers:
        explanation = f"Landslide risk is normal ({risk_score}/100) with stable soil moisture and minimal antecedent rainfall."
    else:
        joined_drivers = " and ".join(drivers)
        if severity == "danger":
            explanation = (
                f"High imminent landslide hazard ({risk_score}/100 - DANGER). "
                f"Driven by {joined_drivers}. Slope failure likely under continued precipitation."
            )
        elif severity == "warning":
            explanation = (
                f"Elevated landslide risk ({risk_score}/100 - WARNING). "
                f"Conditioned by {joined_drivers}. Heightened vigilance required on vulnerable slopes."
            )
        else:
            explanation = (
                f"Low-to-moderate landslide advisory ({risk_score}/100). "
                f"Factors monitored: {joined_drivers}."
            )

    contributing = {
        "slope_weight": slope_weight,
        "slope_class": slope_label,
        "saturation_factor": round(sat_factor, 3),
        "rain_24h_factor": round(rain_24h_factor, 3),
        "rain_72h_factor": round(rain_72h_factor, 3),
        "rain_combined_factor": round(rain_factor, 3),
    }

    return LandslideRiskAssessment(
        risk_score=risk_score,
        severity=severity,
        soil_moisture_pct=round(soil_moisture_pct, 1),
        rainfall_24h_mm=round(rainfall_24h_mm, 1),
        rainfall_72h_mm=round(rainfall_72h_mm, 1),
        slope_class=slope_label,
        contributing_factors=contributing,
        explanation=explanation,
    )
