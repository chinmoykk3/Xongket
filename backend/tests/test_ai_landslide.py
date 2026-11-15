"""Tests for geotechnical landslide risk calculation in /ai/landslide."""

from ai.landslide.risk import compute_landslide_risk, parse_slope_factor


class TestLandslideRiskEngine:
    def test_parse_slope_factor(self):
        w_low, lbl_low = parse_slope_factor("low")
        assert w_low == 0.20
        assert lbl_low == "low"

        w_steep, lbl_steep = parse_slope_factor("steep")
        assert w_steep == 1.00
        assert lbl_steep == "steep"

        # Numerical angle
        w_angle, lbl_angle = parse_slope_factor(35.0)
        assert w_angle == 0.90
        assert lbl_angle == "high"

    def test_normal_risk_conditions(self):
        assessment = compute_landslide_risk(
            soil_moisture_pct=30.0,
            rainfall_24h_mm=5.0,
            rainfall_72h_mm=10.0,
            slope="low",
        )
        assert assessment.severity == "normal"
        assert assessment.risk_score < 30.0
        assert "normal" in assessment.explanation.lower()

    def test_severe_landslide_danger_conditions(self):
        assessment = compute_landslide_risk(
            soil_moisture_pct=92.0,  # Critical saturation
            rainfall_24h_mm=75.0,   # Heavy triggering storm
            rainfall_72h_mm=160.0,  # High cumulative wetness
            slope="steep",
        )
        assert assessment.severity == "danger"
        assert assessment.risk_score >= 75.0
        assert "danger" in assessment.explanation.lower()
        # Verify plain-language explanation includes drivers
        assert "saturated" in assessment.explanation.lower()
        assert "rainfall" in assessment.explanation.lower()

    def test_contributing_factors_presence(self):
        assessment = compute_landslide_risk(
            soil_moisture_pct=65.0,
            rainfall_24h_mm=35.0,
            rainfall_72h_mm=80.0,
            slope="moderate",
        )
        assert "saturation_factor" in assessment.contributing_factors
        assert "rain_combined_factor" in assessment.contributing_factors
        assert "slope_weight" in assessment.contributing_factors
