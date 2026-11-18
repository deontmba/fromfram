import pytest

from conftest import WEEK, FakeDB, hist, row, supply, weeks
from model import generate_forecast


def run(**kw):
    return generate_forecast(FakeDB(**kw), WEEK)


def by_farmer(result):
    return {f["farmer_id"]: f for f in result["forecasts"]}


def test_single_farmer_deficit_with_safety_stock():
    r = run(supplies=[supply(price=10000, min_order=5)], baseline={"ing-1": 10.0}, active_users=7)
    f = r["forecasts"][0]
    assert r["active_user_count"] == 7
    assert f["gross_demand_kg"] == 10.0
    assert f["safety_stock_kg"] == 1.0
    assert f["predicted_qty_kg"] == 11.0
    assert f["total_price"] == 110000.0
    assert f["confidence_score"] == 0.6


def test_safety_stock_is_ten_percent_above_ten_kg():
    f = run(supplies=[supply(min_order=1)], baseline={"ing-1": 50.0})["forecasts"][0]
    assert f["safety_stock_kg"] == 5.0
    assert f["predicted_qty_kg"] == 55.0


def test_safety_stock_minimum_one_kg():
    f = run(supplies=[supply(min_order=0)], baseline={"ing-1": 2.0})["forecasts"][0]
    assert f["safety_stock_kg"] == 1.0
    assert f["predicted_qty_kg"] == 3.0


def test_min_order_applied_when_deficit_smaller():
    f = run(supplies=[supply(min_order=5)], baseline={"ing-1": 2.0})["forecasts"][0]
    assert f["predicted_qty_kg"] == 5.0
    assert f["total_price"] == 50000.0


def test_stock_covers_demand_orders_nothing():
    f = run(supplies=[supply(stock=20.0, min_order=5)], baseline={"ing-1": 10.0})["forecasts"][0]
    assert f["current_stock_kg"] == 20.0
    assert f["predicted_qty_kg"] == 0.0
    assert f["total_price"] == 0.0


def test_stock_exactly_equal_to_need_orders_nothing():
    f = run(supplies=[supply(stock=11.0, min_order=5)], baseline={"ing-1": 10.0})["forecasts"][0]
    assert f["predicted_qty_kg"] == 0.0


def test_no_demand_no_safety_stock_no_order():
    f = run(supplies=[supply(min_order=5)])["forecasts"][0]
    assert f["gross_demand_kg"] == 0.0
    assert f["safety_stock_kg"] == 0.0
    assert f["predicted_qty_kg"] == 0.0


def test_no_supplies_returns_empty():
    assert run(baseline={"ing-1": 10.0}) == {"active_user_count": 0, "forecasts": []}


@pytest.mark.parametrize("prices,cheapest", [
    ((12000, 9000), "f-2"),
    ((9000, 12000), "f-1"),
    ((15000, 8000, 11000), "f-2"),
    ((11000, 15000, 8000), "f-3"),
])
def test_only_cheapest_farmer_gets_order(prices, cheapest):
    sups = [supply(farmer=f"f-{i + 1}", price=p, min_order=5) for i, p in enumerate(prices)]
    single = run(supplies=[supply(min_order=5)], baseline={"ing-1": 30.0})["forecasts"][0]["predicted_qty_kg"]
    fs = by_farmer(run(supplies=sups, baseline={"ing-1": 30.0}))
    assert len(fs) == len(prices)
    for fid, f in fs.items():
        if fid == cheapest:
            assert f["predicted_qty_kg"] == single == 33.0
        else:
            assert f["predicted_qty_kg"] == 0.0
            assert f["total_price"] == 0.0
    assert sum(f["predicted_qty_kg"] for f in fs.values()) == single


def test_price_tie_exactly_one_farmer_ordered():
    sups = [supply(farmer="f-1", price=10000), supply(farmer="f-2", price=10000), supply(farmer="f-3", price=10000)]
    fs = run(supplies=sups, baseline={"ing-1": 30.0})["forecasts"]
    ordered = [f for f in fs if f["predicted_qty_kg"] > 0]
    assert len(ordered) == 1
    assert ordered[0]["predicted_qty_kg"] == 33.0


def test_multi_farmer_deficit_nonpositive_all_zero():
    sups = [supply(farmer="f-1", price=12000, stock=50), supply(farmer="f-2", price=9000, stock=50)]
    fs = run(supplies=sups, baseline={"ing-1": 10.0})["forecasts"]
    assert [f["predicted_qty_kg"] for f in fs] == [0.0, 0.0]


def test_cheapest_choice_is_per_ingredient():
    sups = [
        supply(ing="a", farmer="f-1", price=5000),
        supply(ing="a", farmer="f-2", price=7000),
        supply(ing="b", farmer="f-1", price=9000),
        supply(ing="b", farmer="f-2", price=6000),
    ]
    fs = run(supplies=sups, baseline={"a": 10.0, "b": 10.0})["forecasts"]
    got = {(f["ingredient_id"], f["farmer_id"]): f["predicted_qty_kg"] for f in fs}
    assert got == {("a", "f-1"): 11.0, ("a", "f-2"): 0.0, ("b", "f-1"): 0.0, ("b", "f-2"): 11.0}


def test_min_order_of_cheapest_farmer_used():
    sups = [supply(farmer="f-1", price=12000, min_order=1), supply(farmer="f-2", price=9000, min_order=20)]
    fs = by_farmer(run(supplies=sups, baseline={"ing-1": 2.0}))
    assert fs["f-2"]["predicted_qty_kg"] == 20.0
    assert fs["f-1"]["predicted_qty_kg"] == 0.0


def test_history_under_four_rows_confidence_point_six():
    h = [hist(w, 10, 10.0, 10.0) for w in weeks(3)]
    db = FakeDB(supplies=[supply()], baseline={"ing-1": 10.0}, history={"ing-1": h})
    f = generate_forecast(db, WEEK)["forecasts"][0]
    assert f["confidence_score"] == 0.6
    assert not any("WeeklyMenu" in q for q, _ in db.queries)  # Ridge path skipped


def test_ridge_path_runs_with_four_rows_and_uses_mape():
    h = [hist(w, 10 * (i + 1), 10.0 * (i + 1), 5.0 * (i + 1)) for i, w in enumerate(weeks(4))]
    menu = [row(weekStartDate=w, menu_count=2) for w in weeks(4)]
    db = FakeDB(supplies=[supply(min_order=0)], active_users=50, history={"ing-1": h}, menu={"ing-1": menu}, target_menu=2)
    f = generate_forecast(db, WEEK)["forecasts"][0]
    assert any("WeeklyMenu" in q for q, _ in db.queries)
    assert f["confidence_score"] == 0.5  # MAPE 0.5 on every row
    assert f["gross_demand_kg"] > 0
    assert f["predicted_qty_kg"] >= f["gross_demand_kg"]


def test_ridge_prediction_clamped_non_negative():
    # Usage drops as users grow; extrapolating to many users would go negative.
    h = [hist(w, u, q, q) for w, u, q in zip(weeks(4), [10, 20, 30, 40], [40.0, 30.0, 20.0, 10.0])]
    f = run(supplies=[supply(min_order=0)], active_users=1000, history={"ing-1": h})["forecasts"][0]
    assert f["gross_demand_kg"] == 0.0
    assert f["predicted_qty_kg"] == 0.0
    assert f["confidence_score"] == 1.0


def test_ridge_vs_baseline_takes_max():
    h = [hist(w, u, q, q) for w, u, q in zip(weeks(4), [10, 20, 30, 40], [40.0, 30.0, 20.0, 10.0])]
    f = run(supplies=[supply(min_order=0)], baseline={"ing-1": 8.0}, active_users=1000, history={"ing-1": h})["forecasts"][0]
    assert f["gross_demand_kg"] == 8.0
    assert f["predicted_qty_kg"] == 9.0


def test_ridge_zero_actuals_fall_back_confidence():
    # actual 0 -> MAPE inf/nan -> fallback avg_mape 0.4
    h = [hist(w, 10, 0.0, 0.0) for w in weeks(4)]
    f = run(supplies=[supply()], history={"ing-1": h})["forecasts"][0]
    assert f["confidence_score"] == 0.6
    assert f["predicted_qty_kg"] >= 0
