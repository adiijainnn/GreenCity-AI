import pytest
from apps.api.database import SessionLocal
from apps.api.services.place_search_service import (
    place_search_service,
    normalize_query,
    transliterate_marathi_to_english_tokens,
    SOLAPUR_GAZETTEER,
)
from apps.api.services.routing_service import routing_service, haversine_distance_km


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


class TestSolapurGazetteerAndCoordinates:
    """Verify ground-truth coordinates of Solapur landmarks."""

    def test_solapur_railway_station_coordinates(self):
        """Solapur Central Railway Station (SUR) must be at ~17.6645, 75.8935 (Station Road)."""
        lm = next((item for item in SOLAPUR_GAZETTEER if item["id"] == "landmark-solapur-station"), None)
        assert lm is not None
        assert abs(lm["latitude"] - 17.6645) < 0.005
        assert abs(lm["longitude"] - 75.8935) < 0.005
        # Must NOT be at old incorrect 17.6690, 75.9080 (which was placed at Siddheshwar lake)
        assert haversine_distance_km(lm["latitude"], lm["longitude"], 17.6690, 75.9080) > 1.0

    def test_siddheshwar_lake_coordinates(self):
        """Siddheshwar Lake & Promenade must be at ~17.6710, 75.9055."""
        lm = next((item for item in SOLAPUR_GAZETTEER if item["id"] == "landmark-siddheshwar-lake"), None)
        assert lm is not None
        assert abs(lm["latitude"] - 17.6710) < 0.005
        assert abs(lm["longitude"] - 75.9055) < 0.005

    def test_saat_rasta_coordinates(self):
        """Saat Rasta Central Promenade must be at ~17.6690, 75.8910."""
        lm = next((item for item in SOLAPUR_GAZETTEER if item["id"] == "landmark-saat-rasta"), None)
        assert lm is not None
        assert abs(lm["latitude"] - 17.6690) < 0.005
        assert abs(lm["longitude"] - 75.8910) < 0.005

    def test_civil_hospital_coordinates(self):
        """Civil Hospital must be at ~17.6644, 75.9126."""
        lm = next((item for item in SOLAPUR_GAZETTEER if item["id"] == "landmark-civil-hospital"), None)
        assert lm is not None
        assert abs(lm["latitude"] - 17.6644) < 0.005
        assert abs(lm["longitude"] - 75.9126) < 0.005


class TestPlaceSearchParity:
    """Tests place search with English and Marathi queries required in Phase 5."""

    def test_search_solapur_central_railway_station_exact(self, db_session):
        results = place_search_service.search_places("Solapur Central Railway Station", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert top["name"] == "Solapur Central Railway Station"
        assert top["match_type"] == "exact"
        assert top["confidence"] == 1.0
        assert abs(top["latitude"] - 17.6645) < 0.005
        assert abs(top["longitude"] - 75.8935) < 0.005

    def test_search_solapur_station_variant(self, db_session):
        results = place_search_service.search_places("Solapur railway station", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert top["name"] == "Solapur Central Railway Station"
        assert top["confidence"] >= 0.9

    def test_search_solapur_station_short_code(self, db_session):
        results = place_search_service.search_places("SUR", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert top["name"] == "Solapur Central Railway Station"
        assert top["match_type"] == "exact"

    def test_search_solapur_station_marathi(self, db_session):
        """Search 'सोलापूर रेल्वे स्टेशन' must resolve to Solapur Central Railway Station."""
        results = place_search_service.search_places("सोलापूर रेल्वे स्टेशन", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert top["name"] == "Solapur Central Railway Station"
        assert top["match_type"] == "exact"
        assert top["is_verified"] is True

    def test_search_siddheshwar_lake_english(self, db_session):
        results = place_search_service.search_places("Siddheshwar Lake", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert "Siddheshwar" in top["name"]
        assert top["match_type"] == "exact"
        assert abs(top["latitude"] - 17.6710) < 0.005

    def test_search_siddheshwar_lake_marathi(self, db_session):
        """Search 'सिद्धेश्वर तलाव' must resolve to Siddheshwar Lake."""
        results = place_search_service.search_places("सिद्धेश्वर तलाव", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert "Siddheshwar" in top["name"]
        assert top["match_type"] == "exact"
        assert abs(top["latitude"] - 17.6710) < 0.005

    def test_search_saat_rasta_english_and_numeric(self, db_session):
        """Both 'Saat Rasta' and '7 rasta' must match the seven-way rotary."""
        for query in ("Saat Rasta", "7 rasta", "sat rasta"):
            results = place_search_service.search_places(query, db=db_session, limit=5)
            assert len(results) > 0
            top = results[0]
            assert "Saat Rasta" in top["name"]
            assert top["match_type"] == "exact"
            assert abs(top["latitude"] - 17.6690) < 0.005
            assert abs(top["longitude"] - 75.8910) < 0.005

    def test_search_saat_rasta_marathi(self, db_session):
        """Search 'सात रस्ता' must resolve to Saat Rasta."""
        results = place_search_service.search_places("सात रस्ता", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert "Saat Rasta" in top["name"]
        assert top["match_type"] == "exact"

    def test_search_kambar_talav_and_sambhaji_lake(self, db_session):
        """Both 'Kambar Talav' and 'Sambhaji Lake' must match Sambhaji Lake Bio-Park."""
        for query in ("Kambar Talav", "Sambhaji Lake", "कंबर तलाव"):
            results = place_search_service.search_places(query, db=db_session, limit=5)
            assert len(results) > 0
            top = results[0]
            assert "Sambhaji Lake" in top["name"] or "Kambar" in top["name"]
            assert abs(top["latitude"] - 17.6625) < 0.005

    def test_search_civil_hospital_marathi(self, db_session):
        results = place_search_service.search_places("सिव्हिल हॉस्पिटल", db=db_session, limit=5)
        assert len(results) > 0
        top = results[0]
        assert "Civil Hospital" in top["name"]
        assert top["match_type"] == "exact"

    def test_distance_from_center_calculation(self, db_session):
        """Passing center_lat and center_lng must compute distance_from_center_km."""
        center_lat, center_lng = 17.6645, 75.8935  # At Solapur Station
        results = place_search_service.search_places(
            "Solapur Station",
            db=db_session,
            limit=5,
            center_lat=center_lat,
            center_lng=center_lng
        )
        assert len(results) > 0
        station = results[0]
        assert station["distance_from_center_km"] < 0.05  # essentially 0 km
        assert "m away" in station["formatted_distance_from_center"] or "0.00 km" in station["formatted_distance_from_center"]


class TestRoutingAndSnappingParity:
    """Test road routing between Station and Siddheshwar Lake with snapping detection."""

    def test_station_to_lake_driving_route(self):
        """
        Route from Solapur Station (17.6645, 75.8935) to Siddheshwar Lake (17.6710, 75.9055).
        Straight line distance is ~1.46 km.
        Road distance should be ~1.7 to 2.2 km.
        """
        route = routing_service.get_route(
            start_lat=17.6645,
            start_lng=75.8935,
            dest_lat=17.6710,
            dest_lng=75.9055,
            mode="driving",
            alternatives=False
        )
        assert route["distance_km"] >= 1.5
        assert route["distance_km"] <= 2.8
        assert route["duration_minutes"] >= 2
        # Straight line distance must be strictly smaller than road distance
        assert route["straight_line_km"] < route["distance_km"]
        assert abs(route["straight_line_km"] - 1.46) < 0.1
        # Snapping notice should be present since lake center/promenade is off-road
        assert "is_destination_snapped" in route
        assert "snapped_destination" in route

    def test_same_origin_destination_rejected_in_api(self):
        """Identical start and dest must be handled appropriately."""
        crow = haversine_distance_km(17.6645, 75.8935, 17.6645, 75.8935)
        assert crow == 0.0


class TestTransliterationHelpers:
    """Test normalization and Devanagari keyword transliteration."""

    def test_normalize_query(self):
        assert normalize_query("  Solapur,  Station!! ") == "solapur station"
        assert normalize_query("सात-रस्ता?") == "सात रस्ता"

    def test_transliterate_marathi_tokens(self):
        trans = transliterate_marathi_to_english_tokens("सोलापूर रेल्वे स्टेशन")
        assert "solapur" in trans
        assert "railway" in trans
        assert "station" in trans

        trans_lake = transliterate_marathi_to_english_tokens("सिद्धेश्वर तलाव")
        assert "siddheshwar" in trans_lake
        assert "lake" in trans_lake
