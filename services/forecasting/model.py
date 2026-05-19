import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from sqlalchemy import text
from datetime import datetime

def generate_forecast(db, week_start_date: datetime):
    # 1. Active farmers and supplies
    supplies_query = text("""
        SELECT 
            fs."ingredientId", i."name" as ingredient_name,
            fs."farmerId", f."name" as farmer_name, f."region" as farmer_region,
            fs."minOrderKg",
            CASE WHEN fs."pricePerKg" > 0 THEN fs."pricePerKg" ELSE i."pricePerKg" END as "pricePerKg"
        FROM "FarmerSupplyItem" fs
        JOIN "Farmer" f ON fs."farmerId" = f."id"
        JOIN "Ingredient" i ON fs."ingredientId" = i."id"
        WHERE f."isActive" = true
    """)
    supplies = db.execute(supplies_query).fetchall()

    # 2. Baseline Layer 1
    baseline_query = text("""
        SELECT 
            ri."ingredientId", 
            COALESCE(SUM(ri."quantityInKg" * ms."serving"), 0) as baseline_qty
        FROM "MealSelection" ms
        JOIN "WeeklyBox" wb ON ms."weeklyBoxId" = wb."id"
        JOIN "RecipeIngredient" ri ON ms."recipeId" = ri."recipeId"
        WHERE wb."status" = 'LOCKED' 
          AND wb."weekStartDate" = :week_start_date
        GROUP BY ri."ingredientId"
    """)
    baseline_rows = db.execute(baseline_query, {"week_start_date": week_start_date}).fetchall()
    baseline_map = {row._mapping["ingredientId"]: float(row._mapping["baseline_qty"] or 0) for row in baseline_rows}

    # 3. Target active user count
    active_users_query = text("""
        SELECT COUNT(id) FROM "Subscription" WHERE status = 'ACTIVE'
    """)
    active_user_count = db.execute(active_users_query).scalar() or 0

    forecasts = []

    for supply in supplies:
        ing_id = supply._mapping["ingredientId"]
        
        hist_query = text("""
            SELECT 
                dfl."weekStartDate", 
                dfl."activeUserCount", 
                dfl."actualQtyUsedKg",
                dfl."predictedQtyKg"
            FROM "DemandForecastLog" dfl
            WHERE dfl."ingredientId" = :ingredient_id
              AND dfl."actualQtyUsedKg" IS NOT NULL
            ORDER BY dfl."weekStartDate" ASC
        """)
        hist_rows = db.execute(hist_query, {"ingredient_id": ing_id}).fetchall()
        hist_df = pd.DataFrame([dict(row._mapping) for row in hist_rows]) if hist_rows else pd.DataFrame(columns=["weekStartDate", "activeUserCount", "actualQtyUsedKg", "predictedQtyKg"])

        baseline = baseline_map.get(ing_id, 0.0)
        
        if len(hist_df) < 4:
            ridge_prediction = 0.0
            confidence_score = 0.6
        else:
            # Menu counts history
            menu_query = text("""
                SELECT 
                    wm."weekStartDate", 
                    COUNT(wm."recipeId") as menu_count
                FROM "WeeklyMenu" wm
                JOIN "RecipeIngredient" ri ON wm."recipeId" = ri."recipeId"
                WHERE ri."ingredientId" = :ingredient_id
                GROUP BY wm."weekStartDate"
            """)
            menu_rows = db.execute(menu_query, {"ingredient_id": ing_id}).fetchall()
            menu_df = pd.DataFrame([dict(row._mapping) for row in menu_rows]) if menu_rows else pd.DataFrame(columns=["weekStartDate", "menu_count"])
            
            hist_df['weekStartDate'] = pd.to_datetime(hist_df['weekStartDate'])
            if not menu_df.empty:
                menu_df['weekStartDate'] = pd.to_datetime(menu_df['weekStartDate'])
                hist_df = pd.merge(hist_df, menu_df, on='weekStartDate', how='left')
            
            if 'menu_count' not in hist_df.columns:
                hist_df['menu_count'] = 0
            else:
                hist_df['menu_count'] = hist_df['menu_count'].fillna(0)
            
            hist_df['week_number'] = hist_df['weekStartDate'].dt.isocalendar().week
            hist_df['is_popular'] = 1 
            
            X_train = hist_df[['activeUserCount', 'menu_count', 'is_popular', 'week_number']]
            y_train = hist_df['actualQtyUsedKg']
            
            model = Ridge(alpha=1.0)
            model.fit(X_train, y_train)

            # Target week input features
            target_week_number = pd.to_datetime(week_start_date).isocalendar().week
            
            target_menu_query = text("""
                SELECT COUNT(wm."recipeId")
                FROM "WeeklyMenu" wm
                JOIN "RecipeIngredient" ri ON wm."recipeId" = ri."recipeId"
                WHERE ri."ingredientId" = :ingredient_id
                  AND wm."weekStartDate" = :week_start_date
            """)
            target_menu_count = db.execute(target_menu_query, {"ingredient_id": ing_id, "week_start_date": week_start_date}).scalar() or 0

            X_target = pd.DataFrame([{
                'activeUserCount': active_user_count,
                'menu_count': target_menu_count,
                'is_popular': 1,
                'week_number': target_week_number
            }])
            
            ridge_prediction = model.predict(X_target)[0]
            if ridge_prediction < 0:
                ridge_prediction = 0
                
            # MAPE confidence score
            hist_df['mape'] = np.abs((hist_df['actualQtyUsedKg'] - hist_df['predictedQtyKg']) / hist_df['actualQtyUsedKg'])
            hist_df.replace([np.inf, -np.inf], np.nan, inplace=True)
            avg_mape = hist_df['mape'].mean()
            if pd.isna(avg_mape):
                avg_mape = 0.4
            confidence_score = max(0.0, 1.0 - avg_mape)

        final_prediction = max(baseline, ridge_prediction) * 1.10
        
        forecasts.append({
            "ingredient_id": ing_id,
            "ingredient_name": supply._mapping["ingredient_name"],
            "farmer_id": supply._mapping["farmerId"],
            "farmer_name": supply._mapping["farmer_name"],
            "farmer_region": supply._mapping["farmer_region"],
            "predicted_qty_kg": round(float(final_prediction), 2),
            "confidence_score": round(float(confidence_score), 2),
            "min_order_kg": float(supply._mapping["minOrderKg"]),
            "price_per_kg": float(supply._mapping["pricePerKg"]),
            "total_price": round(float(final_prediction) * float(supply._mapping["pricePerKg"]), 2)
        })

    return {
        "active_user_count": active_user_count,
        "forecasts": forecasts
    }
