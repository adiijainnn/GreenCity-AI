def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_user_registration_and_login(client):
    # Register
    reg_data = {
        "email": "testuser@greencity.ai",
        "password": "TestPassword123!",
        "full_name": "Test Citizen",
        "role": "CITIZEN"
    }
    res = client.post("/api/v1/auth/register", json=reg_data)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testuser@greencity.ai"
    assert data["user"]["role"] == "CITIZEN"

    # Login
    login_data = {
        "email": "testuser@greencity.ai",
        "password": "TestPassword123!"
    }
    res_login = client.post("/api/v1/auth/login", json=login_data)
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]

    # Access /me with Token
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "testuser@greencity.ai"
