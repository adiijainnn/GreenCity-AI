"""
Unit and integration tests for GreenCity AI Best Time to Visit a Park feature.
Tests deterministic environmental scoring, CPCB NAQI integration, safety caps,
activity-specific suitability criteria, and the FastAPI endpoint.
"""

import pytest
from apps.api.services.park_visit_time_service import park_visit_time_service


class TestParkVisitScoring:
    """Tests the deterministic mathematical scoring engine and safety overrides."""

    def test_ideal_conditions_produce_excellent_score(self):
        """Ideal temperature (22°C), clean air (AQI 35), calm wind (10 km/h) -> Excellent (>= 80)."""
        hour_data = {
            "time": "2026-10-15T06:00",
            "hour_int": 6,
            "formatted_time": "6:00 AM",
            "temperature_c": 22.0,
            "apparent_temperature_c": 22.0,
            "humidity_pct": 55,
            "precip_prob_pct": 0,
            "precip_mm": 0.0,
            "weather_code": 0, # Clear sky
            "wind_speed_kmh": 9.0,
            "pm2_5": 18.0,
            "pm10": 35.0
        }
        res = park_visit_time_service.evaluate_hour(hour_data, canopy_percentage=50.0)
        assert res["suitability_score"] >= 80
        assert res["suitability_category"] in ("Excellent", "Good")
        assert res["indian_aqi"] <= 50 # Good CPCB category
        assert res["activities"]["walking"]["suitable"] is True
        assert res["activities"]["jogging"]["suitable"] is True

    def test_poor_air_quality_safety_override(self):
        """
        CRITICAL SAFETY RULE:
        Pleasant weather must NEVER hide poor air quality.
        When AQI > 200 (Poor), overall score MUST be capped at <= 35.
        """
        hour_data = {
            "time": "2026-10-15T07:00",
            "hour_int": 7,
            "formatted_time": "7:00 AM",
            "temperature_c": 22.0, # Pleasant cool temperature
            "apparent_temperature_c": 22.0,
            "humidity_pct": 50,
            "precip_prob_pct": 0,
            "precip_mm": 0.0,
            "weather_code": 0,
            "wind_speed_kmh": 8.0,
            "pm2_5": 95.0, # High particulate concentration -> CPCB AQI > 200 (Poor)
            "pm10": 210.0
        }
        res = park_visit_time_service.evaluate_hour(hour_data, canopy_percentage=40.0)
        assert res["indian_aqi"] > 200
        # Score must be strictly capped
        assert res["suitability_score"] <= 35
        assert res["suitability_category"] in ("Poor", "Unfavorable")
        # Jogging and intensive exercise must be flagged not recommended
        assert res["activities"]["jogging"]["suitable"] is False
        assert res["activities"]["intensive_exercise"]["suitable"] is False
        # Limiting factor must explicitly mention poor air quality
        assert any("air quality" in lim.lower() or "aqi" in lim.lower() for lim in res["limiting_factors"])

    def test_severe_air_quality_forces_zero(self):
        """When AQI > 400 (Severe), score must be 0."""
        hour_data = {
            "time": "2026-10-15T08:00",
            "hour_int": 8,
            "formatted_time": "8:00 AM",
            "temperature_c": 24.0,
            "apparent_temperature_c": 24.0,
            "humidity_pct": 50,
            "precip_prob_pct": 0,
            "precip_mm": 0.0,
            "weather_code": 0,
            "wind_speed_kmh": 6.0,
            "pm2_5": 300.0, # Severe pollution
            "pm10": 450.0
        }
        res = park_visit_time_service.evaluate_hour(hour_data)
        assert res["suitability_score"] == 0
        assert res["suitability_category"] == "Unfavorable"

    def test_extreme_midday_heat_penalty(self):
        """High heat (>= 37°C) triggers heat exhaustion penalties."""
        hour_data = {
            "time": "2026-10-15T14:00",
            "hour_int": 14,
            "formatted_time": "2:00 PM",
            "temperature_c": 38.0,
            "apparent_temperature_c": 41.0,
            "humidity_pct": 35,
            "precip_prob_pct": 0,
            "precip_mm": 0.0,
            "weather_code": 0,
            "wind_speed_kmh": 12.0,
            "pm2_5": 25.0,
            "pm10": 50.0
        }
        res = park_visit_time_service.evaluate_hour(hour_data)
        assert res["suitability_score"] <= 25
        assert any("heat" in lim.lower() or "temperature" in lim.lower() for lim in res["limiting_factors"])

    def test_activity_divergence(self):
        """Moderate conditions (29°C, AQI 115) should permit casual walking but restrict strenuous exercise."""
        hour_data = {
            "time": "2026-10-15T10:00",
            "hour_int": 10,
            "formatted_time": "10:00 AM",
            "temperature_c": 29.0,
            "apparent_temperature_c": 30.5,
            "humidity_pct": 50,
            "precip_prob_pct": 5,
            "precip_mm": 0.0,
            "weather_code": 1,
            "wind_speed_kmh": 11.0,
            "pm2_5": 65.0, # Moderate CPCB (AQI ~116)
            "pm10": 110.0
        }
        res = park_visit_time_service.evaluate_hour(hour_data)
        walk = res["activities"]["walking"]
        exercise = res["activities"]["intensive_exercise"]
        # Walking score should be substantially higher than intensive exercise score
        assert walk["score"] > exercise["score"]


class TestParkResolutionAndAPI:
    """Tests park entity resolution and the FastAPI HTTP endpoint."""

    def test_resolve_canonical_park(self, db_session):
        park = park_visit_time_service.resolve_park("landmark-siddheshwar-lake", None, None, db=db_session)
        assert "Siddheshwar" in park["name"]
        assert abs(park["latitude"] - 17.6710) < 0.005

    def test_resolve_custom_coordinates(self, db_session):
        park = park_visit_time_service.resolve_park(None, 17.6500, 75.9000, db=db_session)
        assert park["latitude"] == 17.6500
        assert park["longitude"] == 75.9000
        assert park["source"] == "custom_coordinates"

    def test_api_endpoint_default(self, client):
        """GET /api/v1/environment/park-visit-times returns 200 with full schema."""
        resp = client.get("/api/v1/environment/park-visit-times")
        assert resp.status_code == 200
        data = resp.json()

        assert data["status"] == "success"
        assert "park" in data
        assert "current_conditions" in data
        assert "best_time_recommendation" in data
        assert "astronomy" in data
        assert "sunrise" in data["astronomy"]
        assert "sunset" in data["astronomy"]
        assert "hourly_forecast" in data
        assert len(data["hourly_forecast"]) > 0
        assert "activity_suitability" in data
        assert "walking" in data["activity_suitability"]
        assert "jogging" in data["activity_suitability"]
        assert "intensive_exercise" in data["activity_suitability"]
        assert "family_outing" in data["activity_suitability"]
        assert "general_visit" in data["activity_suitability"]
        assert "provenance" in data
        assert "disclaimer" in data

    def test_api_endpoint_with_canonical_id(self, client):
        resp = client.get("/api/v1/environment/park-visit-times?park_id=landmark-kambar-talav")
        assert resp.status_code == 200
        data = resp.json()
        assert "Sambhaji Lake" in data["park"]["name"] or "Kambar" in data["park"]["name"]
        assert data["best_time_recommendation"]["average_score"] > 0
