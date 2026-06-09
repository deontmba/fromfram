import os
from sqlalchemy import create_engine, text
from datetime import datetime, date

DATABASE_URL = "postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

import urllib.parse
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

parsed = urllib.parse.urlparse(DATABASE_URL)
query_dict = urllib.parse.parse_qs(parsed.query)
for key in ['schema', 'pgbouncer', 'workaround']:
    if key in query_dict:
        del query_dict[key]
new_query = urllib.parse.urlencode(query_dict, doseq=True)
DATABASE_URL = urllib.parse.urlunparse(parsed._replace(query=new_query))

print("Connecting to:", DATABASE_URL)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Connected successfully!")
        
        week_start_date = date(2026, 6, 8)
        
        # Test supplies query
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
        supplies = conn.execute(supplies_query).fetchall()
        
        # Test baseline query
        print("Running baseline query...")
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
        baseline_rows = conn.execute(baseline_query, {"week_start_date": week_start_date}).fetchall()
        print(f"Found {len(baseline_rows)} baseline rows")
        
        # Test hist query
        print("Running hist query...")
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
            hist_rows = conn.execute(hist_query, {"ingredient_id": ing_id}).fetchall()
            
            # Test target menu count query
            target_menu_query = text("""
                SELECT COUNT(wm."recipeId")
                FROM "WeeklyMenu" wm
                JOIN "RecipeIngredient" ri ON wm."recipeId" = ri."recipeId"
                WHERE ri."ingredientId" = :ingredient_id
                  AND wm."weekStartDate" = :week_start_date
            """)
            tm_count = conn.execute(target_menu_query, {"ingredient_id": ing_id, "week_start_date": week_start_date}).scalar()
            
        print("All queries executed successfully without error!")

except Exception as e:
    import traceback
    traceback.print_exc()
