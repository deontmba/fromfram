import importlib

import pytest


@pytest.mark.parametrize("url", [
    "postgresql://u:p@localhost:5432/x",
    "postgres://u:p@localhost:5432/x",
    "postgresql://u:p@localhost:6543/x?pgbouncer=true",
])
def test_plain_postgres_urls_use_installed_psycopg2_driver(monkeypatch, url):
    # Regression: SQLAlchemy 2.1 maps postgresql:// to psycopg v3 (not installed), so import crashed.
    monkeypatch.setenv("DATABASE_URL", url)
    import database
    database = importlib.reload(database)
    assert database.engine.url.drivername == "postgresql+psycopg2"
    assert "pgbouncer" not in str(database.engine.url)
