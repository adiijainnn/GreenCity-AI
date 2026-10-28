def test_city_analytics_endpoint(client):
    response = client.get("/api/v1/analytics/city")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "categories_breakdown" in data
    assert "ward_summaries" in data
