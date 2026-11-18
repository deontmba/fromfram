import pytest
from fastapi.testclient import TestClient

from conftest import FakeDB
from database import get_db
from main import app

KEY = "test-secret-key"
ENDPOINTS = [
    ("post", "/forecast", {"week_start_date": "2026-11-16"}),
    ("post", "/forecast/save", {"week_start_date": "2026-11-16", "active_user_count": 0,
                                "generated_at": "2026-11-10T00:00:00", "forecasts": []}),
    ("patch", "/forecast/actual", {"week_start_date": "2026-11-16", "ingredient_id": "ing-1", "actual_qty_kg": 3}),
]


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("FORECAST_INTERNAL_KEY", KEY)
    app.dependency_overrides[get_db] = lambda: FakeDB()
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def call(client, method, path, body, headers=None):
    return getattr(client, method)(path, json=body, headers=headers or {})


def test_health_open(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


@pytest.mark.parametrize("method,path,body", ENDPOINTS)
def test_missing_header_401(client, method, path, body):
    assert call(client, method, path, body).status_code == 401


@pytest.mark.parametrize("method,path,body", ENDPOINTS)
def test_wrong_header_401(client, method, path, body):
    assert call(client, method, path, body, {"X-Internal-Key": "nope"}).status_code == 401


@pytest.mark.parametrize("method,path,body", ENDPOINTS)
def test_correct_header_200(client, method, path, body):
    assert call(client, method, path, body, {"X-Internal-Key": KEY}).status_code == 200


def test_forecast_correct_header_body(client):
    r = call(client, *ENDPOINTS[0], {"X-Internal-Key": KEY})
    assert r.json()["forecasts"] == [] and r.json()["active_user_count"] == 0


@pytest.mark.parametrize("header", ["", "anything", KEY])
@pytest.mark.parametrize("method,path,body", ENDPOINTS)
def test_env_unset_always_401(client, monkeypatch, method, path, body, header):
    monkeypatch.delenv("FORECAST_INTERNAL_KEY")
    assert call(client, method, path, body, {"X-Internal-Key": header}).status_code == 401


def test_env_empty_string_401(client, monkeypatch):
    monkeypatch.setenv("FORECAST_INTERNAL_KEY", "")
    assert call(client, *ENDPOINTS[0], {"X-Internal-Key": ""}).status_code == 401


def test_prefix_of_key_401(client):
    assert call(client, *ENDPOINTS[0], {"X-Internal-Key": KEY[:-1]}).status_code == 401


# Regression: compare_digest raised TypeError on non-ASCII str input -> 500.
def test_non_ascii_header_401(client):
    assert call(client, *ENDPOINTS[0], {"X-Internal-Key": b"\xe9t\xe9"}).status_code == 401
