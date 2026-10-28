import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

def test_live_environment_endpoint():
    response = client.get("/api/v1/environment/live?lat=17.6599&lng=75.9064")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "weather" in data
    assert "air_quality" in data
    assert "temperature_c" in data["weather"]
    assert "indian_aqi" in data["air_quality"]
    assert "category" in data["air_quality"]
    assert data["air_quality"]["indian_aqi"] >= 0

def test_environmental_history_and_suitability():
    # History
    resp_hist = client.get("/api/v1/environment/history?lat=17.6599&lng=75.9064")
    assert resp_hist.status_code == 200
    hist_data = resp_hist.json()
    assert "history_trend" in hist_data

    # Suitability
    resp_suit = client.get("/api/v1/environment/suitability?lat=17.6599&lng=75.9064&purpose=walking")
    assert resp_suit.status_code == 200
    suit_data = resp_suit.json()
    assert "overall_rating" in suit_data
    assert "purpose_advice" in suit_data
    assert "air_quality" in suit_data
    assert "weather_comfort" in suit_data

    # Festival
    resp_fest = client.get("/api/v1/environment/festival?lat=17.6599&lng=75.9064")
    assert resp_fest.status_code == 200
    fest_data = resp_fest.json()
    assert "festival_name" in fest_data
    assert "current_observation" in fest_data
    assert "baseline_comparison" in fest_data

def test_routing_directions():
    # Test driving route between Solapur Station and Siddheshwar Lake
    resp = client.get(
        "/api/v1/routing/directions?start_lat=17.6690&start_lng=75.9080&dest_lat=17.6710&dest_lng=75.9080&mode=driving"
    )
    assert resp.status_code == 200
    route_data = resp.json()
    assert route_data["mode"] == "driving"
    assert route_data["distance_km"] > 0
    assert route_data["duration_minutes"] > 0
    assert len(route_data["coordinates"]) >= 2
    assert len(route_data["steps"]) >= 1

    # Test walking route
    resp_walk = client.get(
        "/api/v1/routing/directions?start_lat=17.6690&start_lng=75.9080&dest_lat=17.6710&dest_lng=75.9080&mode=walking"
    )
    assert resp_walk.status_code == 200
    assert resp_walk.json()["mode"] == "walking"

def test_places_search_and_nearby():
    # Search
    resp_search = client.get("/api/v1/places/search?q=Siddheshwar")
    assert resp_search.status_code == 200
    results = resp_search.json()
    assert len(results) > 0
    assert any("siddheshwar" in r["name"].lower() for r in results)

    # Nearby
    resp_nearby = client.get("/api/v1/places/nearby?lat=17.6599&lng=75.9064&radius_km=3.0")
    assert resp_nearby.status_code == 200
    nearby_places = resp_nearby.json()
    assert len(nearby_places) > 0
    assert "straight_line_distance_km" in nearby_places[0]
    assert "walking_distance_km" in nearby_places[0]

    # Compare
    compare_payload = [
        {"id": "p1", "name": "Park A", "latitude": 17.6710, "longitude": 75.9080, "health_score": 85.0},
        {"id": "p2", "name": "Park B", "latitude": 17.6625, "longitude": 75.9015, "health_score": 80.0}
    ]
    resp_comp = client.post("/api/v1/places/compare", json=compare_payload)
    assert resp_comp.status_code == 200
    comp_data = resp_comp.json()
    assert len(comp_data) == 2
    assert "indian_aqi" in comp_data[0]
    assert "temperature_c" in comp_data[0]

def test_voice_assistant_multilingual():
    # English query for AQI
    resp_en = client.post(
        "/api/v1/assistant/chat",
        json={"query": "What is the AQI near Solapur railway station right now?", "language": "en"}
    )
    assert resp_en.status_code == 200
    data_en = resp_en.json()
    assert data_en["intent"] == "environmental_intelligence"
    assert "AQI" in data_en["reply"]
    assert data_en["card_type"] == "environmental_card"

    # Marathi query for nearby parks
    resp_mr = client.post(
        "/api/v1/assistant/chat",
        json={"query": "सिद्धेश्वर तलावाजवळ फिरण्यासाठी कोणती जागा चांगली आहे?", "language": "mr"}
    )
    assert resp_mr.status_code == 200
    data_mr = resp_mr.json()
    assert data_mr["language"] == "mr"
    assert len(data_mr["reply"]) > 0

    # Hindi query for civic complaint
    resp_hi = client.post(
        "/api/v1/assistant/chat",
        json={"query": "पार्क में कचरा फैला हुआ है और सफाई की आवश्यकता है", "language": "hi"}
    )
    assert resp_hi.status_code == 200
    data_hi = resp_hi.json()
    assert data_hi["intent"] == "draft_report"
    assert data_hi["card_type"] == "report_review_card"
    assert "category" in data_hi["card_data"]
