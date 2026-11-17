import os
import sys
from datetime import date, datetime
from types import SimpleNamespace

# Service modules import each other as top-level modules (`import schemas`).
SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

# database.py raises at import without DATABASE_URL; engine creation does not connect.
# Explicit +psycopg2: SQLAlchemy 2.1 maps bare postgresql:// to psycopg3 (see test_database.py).
os.environ["DATABASE_URL"] = "postgresql+psycopg2://u:p@localhost:5432/x"

WEEK = date(2026, 11, 16)


def row(**kw):
    return SimpleNamespace(_mapping=kw)


def supply(ing="ing-1", farmer="f-1", price=10000.0, min_order=5.0, stock=0.0, name="Tomat"):
    return row(
        ingredientId=ing,
        ingredient_name=name,
        current_stock_kg=stock,
        farmerId=farmer,
        farmer_name=f"Farmer {farmer}",
        farmer_region="Bandung",
        minOrderKg=min_order,
        pricePerKg=price,
    )


def hist(week, users, actual, predicted):
    return row(weekStartDate=week, activeUserCount=users, actualQtyUsedKg=actual, predictedQtyKg=predicted)


class _Result:
    def __init__(self, rows=None, scalar=None):
        self._rows = rows or []
        self._scalar = scalar
        self.rowcount = 1

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def scalar(self):
        return self._scalar


class FakeDB:
    """Dispatches raw SQL by substring, mimicking SQLAlchemy result objects."""

    def __init__(self, supplies=(), baseline=None, active_users=0, history=None, menu=None, target_menu=0):
        self.supplies = list(supplies)
        self.baseline = baseline or {}  # ingredientId -> qty
        self.active_users = active_users
        self.history = history or {}  # ingredientId -> [hist rows]
        self.menu = menu or {}  # ingredientId -> [rows weekStartDate/menu_count]
        self.target_menu = target_menu
        self.queries = []

    def execute(self, query, params=None):
        q = str(query)
        self.queries.append((q, params))
        params = params or {}
        if "FarmerSupplyItem" in q:
            return _Result(self.supplies)
        if "MealSelection" in q:
            return _Result([row(ingredientId=k, baseline_qty=v) for k, v in self.baseline.items()])
        if 'FROM "Subscription"' in q:
            return _Result(scalar=self.active_users)
        if "DemandForecastLog" in q:
            return _Result(self.history.get(params.get("ingredient_id"), []))
        if "WeeklyMenu" in q:
            if "GROUP BY" in q:
                return _Result(self.menu.get(params.get("ingredient_id"), []))
            return _Result(scalar=self.target_menu)
        return _Result()

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def weeks(n, start=datetime(2026, 9, 7)):
    from datetime import timedelta
    return [start + timedelta(weeks=i) for i in range(n)]
