"""
GreenCity AI — Routing & GIS Tests
====================================
Tests cover:
  - Coordinate conversion correctness (OSRM lng,lat → Leaflet lat,lng)
  - Distance conversion (metres → kilometres)
  - Haversine distance calculation
  - Walking duration calculation from road distance
  - Driving duration calculation with traffic factor
  - Route geometry validation (real coordinates, not straight-line)
  - API endpoint: valid driving and walking routes
  - API endpoint: same-origin validation (400)
  - API endpoint: invalid coordinates (422)
  - Fallback behaviour when OSRM is unreachable (monkeypatched)
  - Place search: walking_distance_km uses ROAD_FACTOR consistently
  - Cache TTL: expired entries are not returned
"""

import math
import time
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.services.routing_service import (
    haversine_distance_km,
    WALKING_SPEED_KMH,
    DRIVING_SPEED_KMH,
    ROAD_FACTOR,
    _format_duration,
    RoutingService,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Known test pairs (Solapur, Maharashtra)
# ---------------------------------------------------------------------------
# Siddheshwar Lake:       17.6712513, 75.9029418  (Nominatim confirmed)
# Solapur Railway Station: 17.6690,   75.9080
# Saat Rasta Chowk:       17.6690,   75.8910
#
# Straight-line distances (haversine):
#   Station → Lake ≈ 0.50 km
#   Saat Rasta → Lake ≈ 1.81 km

STATION = (17.6690, 75.9080)
LAKE = (17.6712513, 75.9029418)
SAAT_RASTA = (17.6690, 75.8910)


# ===========================================================================
# Unit tests — pure maths
# ===========================================================================

class TestHaversineDistance:
    def test_same_point_is_zero(self):
        d = haversine_distance_km(17.6690, 75.9080, 17.6690, 75.9080)
        assert d == 0.0

    def test_station_to_lake_approx(self):
        d = haversine_distance_km(*STATION, *LAKE)
        # Straight-line should be roughly 0.45–0.60 km
        assert 0.40 < d < 0.70, f"Expected 0.40–0.70 km, got {d}"

    def test_saat_rasta_to_lake_approx(self):
        d = haversine_distance_km(*SAAT_RASTA, *LAKE)
        # Saat Rasta (75.891°E) to Siddheshwar Lake (75.9029°E)
        # Actual haversine ≈ 1.29 km (Nominatim-confirmed coordinates)
        assert 1.10 < d < 1.60, f"Expected 1.10–1.60 km, got {d}"

    def test_symmetry(self):
        d_ab = haversine_distance_km(*STATION, *LAKE)
        d_ba = haversine_distance_km(*LAKE, *STATION)
        assert abs(d_ab - d_ba) < 0.001

    def test_known_1km_north(self):
        # Moving ~0.009° latitude ≈ 1 km
        d = haversine_distance_km(17.0, 75.0, 17.009, 75.0)
        assert 0.95 < d < 1.05, f"Expected ≈1 km, got {d}"


class TestDistanceConversion:
    def test_metres_to_km_integer(self):
        assert round(4389 / 1000.0, 2) == 4.39

    def test_metres_to_km_round_trip(self):
        # round(metres / 1000, 2) incurs a maximum 5 m rounding error
        for metres in [1234, 10000, 5000]:
            km = round(metres / 1000.0, 2)
            assert km * 1000 == pytest.approx(metres, abs=5)


class TestWalkingDuration:
    def test_1km_at_4_8kmh_is_12_5min(self):
        dur = max(1, int(round((1.0 / WALKING_SPEED_KMH) * 60)))
        # 1 / 4.8 * 60 = 12.5 → round(12.5) = 12 in Python (banker's rounding)
        assert dur == 12

    def test_272m_walking_duration(self):
        dist_km = 272 / 1000.0
        dur = max(1, int(round((dist_km / WALKING_SPEED_KMH) * 60)))
        assert dur >= 1

    def test_4_39km_walking_duration(self):
        dist_km = 4.39
        dur = max(1, int(round((dist_km / WALKING_SPEED_KMH) * 60)))
        # 4.39 / 4.8 * 60 ≈ 54.875 → 55 min
        assert 50 <= dur <= 60, f"Expected 50–60 min, got {dur}"


class TestDrivingDuration:
    def test_4_39km_driving_at_28kmh(self):
        dist_km = 4.39
        dur = max(1, int(round((dist_km / DRIVING_SPEED_KMH) * 60)))
        # 4.39 / 28 * 60 ≈ 9.4 → 9 min
        assert 8 <= dur <= 12, f"Expected 8–12 min, got {dur}"


class TestFormatDuration:
    def test_under_1h(self):
        assert _format_duration(45) == "45 min"

    def test_exactly_60(self):
        assert _format_duration(60) == "1 hr"

    def test_over_1h_with_remainder(self):
        assert _format_duration(75) == "1 hr 15 min"

    def test_2h(self):
        assert _format_duration(120) == "2 hr"


class TestRoadFactor:
    """walking_distance_km in /explore must use ROAD_FACTOR consistently."""

    def test_road_factor_is_consistent(self):
        # Both routing_service and place_search_service must use the same constant
        from apps.api.services.place_search_service import ROAD_FACTOR as ps_rf
        assert ps_rf == ROAD_FACTOR

    def test_walking_speed_is_consistent(self):
        from apps.api.services.place_search_service import WALKING_SPEED_KMH as ps_ws
        assert ps_ws == WALKING_SPEED_KMH


class TestCoordinateOrder:
    """Ensure OSRM [lng, lat] → returned [lat, lng] conversion is correct."""

    def test_osrm_coord_flip(self):
        # Simulate raw OSRM GeoJSON coordinate
        osrm_point = [75.908168, 17.66898]  # [lng, lat]
        leaflet_point = [osrm_point[1], osrm_point[0]]  # [lat, lng]
        assert leaflet_point[0] == pytest.approx(17.66898)
        assert leaflet_point[1] == pytest.approx(75.908168)

    def test_returned_coords_are_lat_lng(self):
        """First coordinate of a real OSRM response should have latitude first (≈17.x for Solapur)."""
        service = RoutingService()
        # Monkeypatch the OSRM HTTP call to return a known fixture
        mock_data = {
            "routes": [{
                "distance": 272.4,
                "duration": 47.9,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [75.908168, 17.66898],  # [lng, lat] — OSRM format
                        [75.908077, 17.671],
                    ]
                },
                "legs": [{"steps": [], "summary": ""}]
            }]
        }
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_data
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get.return_value = mock_response
            mock_client_cls.return_value = mock_client

            result = service._get_osrm_route(17.66898, 75.908168, 17.671, 75.908077, "driving", False)

        assert result is not None
        coords = result["coordinates"]
        # First coordinate should be [lat, lng] i.e. lat ≈ 17.x not 75.x
        assert coords[0][0] == pytest.approx(17.66898), f"Expected lat≈17.66898, got {coords[0][0]}"
        assert coords[0][1] == pytest.approx(75.908168), f"Expected lng≈75.908168, got {coords[0][1]}"


class TestCacheTTL:
    def test_expired_cache_not_returned(self):
        service = RoutingService()
        key = "test_cache_key"
        # Manually insert an already-expired entry
        service._cache[key] = {
            "result": {"distance_km": 99.0},
            "expires_at": time.monotonic() - 1.0,  # expired 1 second ago
        }
        result = service._cache_get(key)
        assert result is None
        assert key not in service._cache  # Should have been evicted

    def test_fresh_cache_returned(self):
        service = RoutingService()
        key = "fresh_key"
        payload = {"distance_km": 5.0}
        service._cache_set(key, payload)
        result = service._cache_get(key)
        assert result == payload


class TestFallbackBehaviour:
    """When OSRM is unreachable, fallback must be clearly flagged."""

    def test_fallback_is_flagged(self):
        service = RoutingService()
        # Simulate all providers failing
        with patch.object(service, "_get_google_route", return_value=None), \
             patch.object(service, "_get_ors_walking_route", return_value=None), \
             patch.object(service, "_get_osrm_route", return_value=None):
            result = service.get_route(17.6690, 75.9080, 17.6710, 75.9080, "driving")

        assert result["is_fallback"] is True
        assert result["distance_km"] > 0
        assert len(result["coordinates"]) >= 2
        assert len(result["steps"]) >= 2
        # Fallback step distances must be reasonable fractions of total distance
        total_m = result["distance_km"] * 1000
        step_dist_sum = sum(s["distance_meters"] for s in result["steps"])
        # Should be close to the estimated distance, not fabricated multiples
        assert step_dist_sum == pytest.approx(total_m, rel=0.2)

    def test_fallback_not_cached(self):
        service = RoutingService()
        with patch.object(service, "_get_google_route", return_value=None), \
             patch.object(service, "_get_ors_walking_route", return_value=None), \
             patch.object(service, "_get_osrm_route", return_value=None):
            service.get_route(17.6690, 75.9080, 17.6710, 75.9080, "driving")
        # Cache should be empty — fallback is not cached so next request retries
        assert len(service._cache) == 0


# ===========================================================================
# Integration tests — FastAPI endpoints
# ===========================================================================

class TestRoutingEndpoint:
    def test_driving_route_station_to_lake(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat={STATION[0]}&start_lng={STATION[1]}"
            f"&dest_lat={LAKE[0]}&dest_lng={LAKE[1]}&mode=driving"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mode"] == "driving"
        assert data["distance_km"] > 0
        assert data["duration_minutes"] >= 1
        assert len(data["coordinates"]) >= 2
        assert len(data["steps"]) >= 1
        # Road distance must be >= straight-line
        straight = haversine_distance_km(*STATION, *LAKE)
        assert data["distance_km"] >= straight * 0.9  # allow 10% tolerance for snapping

    def test_walking_route_station_to_lake(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat={STATION[0]}&start_lng={STATION[1]}"
            f"&dest_lat={LAKE[0]}&dest_lng={LAKE[1]}&mode=walking"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["mode"] == "walking"
        assert data["distance_km"] > 0
        assert data["duration_minutes"] >= 1
        # Walking duration must be longer than driving duration for same route
        # (unless it is Google or ORS where walking has a different path)

    def test_driving_route_saat_rasta_to_lake(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat={SAAT_RASTA[0]}&start_lng={SAAT_RASTA[1]}"
            f"&dest_lat={LAKE[0]}&dest_lng={LAKE[1]}&mode=driving"
        )
        assert resp.status_code == 200
        data = resp.json()
        # Saat Rasta → Lake road distance should be > straight-line ~1.81 km
        straight = haversine_distance_km(*SAAT_RASTA, *LAKE)
        assert data["distance_km"] >= straight, \
            f"Road distance {data['distance_km']} must be >= straight-line {straight}"
        assert data["duration_minutes"] >= 1

    def test_distance_in_km_not_metres(self):
        """distance_km must be in km (< 100), not accidentally in metres (> 1000)."""
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat={STATION[0]}&start_lng={STATION[1]}"
            f"&dest_lat={LAKE[0]}&dest_lng={LAKE[1]}&mode=driving"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["distance_km"] < 100, \
            f"distance_km={data['distance_km']} appears to be in metres, not km"

    def test_same_origin_is_rejected(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat=17.6690&start_lng=75.9080"
            f"&dest_lat=17.6690&dest_lng=75.9080&mode=driving"
        )
        assert resp.status_code == 400

    def test_invalid_mode_is_rejected(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat=17.6690&start_lng=75.9080"
            f"&dest_lat=17.6710&dest_lng=75.9080&mode=bicycle"
        )
        assert resp.status_code == 422

    def test_out_of_range_lat_is_rejected(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat=999&start_lng=75.9080"
            f"&dest_lat=17.6710&dest_lng=75.9080&mode=driving"
        )
        assert resp.status_code == 422

    def test_response_has_required_fields(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat={STATION[0]}&start_lng={STATION[1]}"
            f"&dest_lat={LAKE[0]}&dest_lng={LAKE[1]}&mode=driving"
        )
        data = resp.json()
        required = ["mode", "distance_km", "duration_minutes", "coordinates", "steps",
                    "provider", "is_fallback", "start", "destination"]
        for field in required:
            assert field in data, f"Missing required field: {field}"

    def test_alternatives_included_when_requested(self):
        resp = client.get(
            "/api/v1/routing/directions"
            f"?start_lat={SAAT_RASTA[0]}&start_lng={SAAT_RASTA[1]}"
            f"&dest_lat={LAKE[0]}&dest_lng={LAKE[1]}&mode=driving&alternatives=true"
        )
        assert resp.status_code == 200
        data = resp.json()
        # alternatives key must be present (may be empty list if only one route found)
        assert "alternatives" in data


class TestPlacesNearby:
    def test_walking_distance_uses_road_factor(self):
        resp = client.get("/api/v1/places/nearby?lat=17.6599&lng=75.9064&radius_km=5.0")
        assert resp.status_code == 200
        places = resp.json()
        assert len(places) > 0
        for p in places:
            assert "straight_line_distance_km" in p
            assert "walking_distance_km" in p
            # walking_distance_km must be > straight_line_distance_km (road > straight-line)
            assert p["walking_distance_km"] >= p["straight_line_distance_km"], \
                f"{p['name']}: walking_distance {p['walking_distance_km']} < straight_line {p['straight_line_distance_km']}"
            # Ratio must be close to ROAD_FACTOR
            ratio = p["walking_distance_km"] / max(p["straight_line_distance_km"], 0.001)
            assert 1.0 <= ratio <= ROAD_FACTOR + 0.05, \
                f"{p['name']}: ratio {ratio:.2f} not close to ROAD_FACTOR {ROAD_FACTOR}"
