def test_root_returns_message(client):
    """Testar att root-endpointen returnerar rätt meddelande."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Priskombo API" in data["message"]

def test_health_check_get(client):
    """Testar GET /health."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_health_check_head(client):
    """Testar HEAD /health (används av monitoring)."""
    response = client.head("/health")
    assert response.status_code == 200
