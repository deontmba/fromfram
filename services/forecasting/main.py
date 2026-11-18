from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import hmac
import os
import uuid

import schemas
from database import get_db
from model import generate_forecast
import traceback

app = FastAPI(title="FromFarm AI Demand Forecasting")


def require_internal_key(x_internal_key: str = Header(default="")):
    # Only the Next.js server may call this service; it sends FORECAST_INTERNAL_KEY.
    expected = os.getenv("FORECAST_INTERNAL_KEY", "")
    # Compare bytes: compare_digest raises TypeError on non-ASCII str input.
    if not expected or not hmac.compare_digest(x_internal_key.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/forecast", response_model=schemas.ForecastResponse, dependencies=[Depends(require_internal_key)])
def get_forecast(request: schemas.ForecastRequest, db: Session = Depends(get_db)):
    try:
        week_start_date = request.week_start_date
        
        # Run prediction logic
        result = generate_forecast(db, week_start_date)
        
        return schemas.ForecastResponse(
            week_start_date=week_start_date,
            active_user_count=result["active_user_count"],
            generated_at=datetime.utcnow(),
            forecasts=result["forecasts"]
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast/save", dependencies=[Depends(require_internal_key)])
def save_forecast(response: schemas.ForecastResponse, db: Session = Depends(get_db)):
    week_start_date = response.week_start_date
    active_user_count = response.active_user_count
    
    try:
        for f in response.forecasts:
            # Ensure farmer exists (in case farmer_id was dynamically mapped from ingredient or default)
            ensure_farmer = text("""
                INSERT INTO "Farmer" ("id", "name", "region", "commodityType", "isActive", "createdAt")
                VALUES (:id, :name, :region, 'Bahan Baku Mitra', true, NOW())
                ON CONFLICT ("id") DO UPDATE SET
                    "name" = EXCLUDED."name",
                    "region" = EXCLUDED."region"
            """)
            db.execute(ensure_farmer, {
                "id": f.farmer_id,
                "name": f.farmer_name,
                "region": f.farmer_region
            })

            # 1. Upsert DemandForecastLog
            check_log = text("""
                SELECT "id" FROM "DemandForecastLog" 
                WHERE "ingredientId" = :ingredientId AND "weekStartDate" = :weekStartDate
            """)
            log_row = db.execute(check_log, {
                "ingredientId": f.ingredient_id,
                "weekStartDate": week_start_date
            }).fetchone()
            
            if log_row:
                db.execute(text("""
                    UPDATE "DemandForecastLog"
                    SET "activeUserCount" = :activeUserCount,
                        "predictedQtyKg" = :predictedQtyKg,
                        "confidenceScore" = :confidenceScore,
                        "modelVersion" = 'linear_v1'
                    WHERE "id" = :id
                """), {
                    "activeUserCount": active_user_count,
                    "predictedQtyKg": f.predicted_qty_kg,
                    "confidenceScore": f.confidence_score,
                    "id": log_row[0]
                })
            else:
                db.execute(text("""
                    INSERT INTO "DemandForecastLog" (
                        "id", "ingredientId", "weekStartDate", "activeUserCount", 
                        "predictedQtyKg", "confidenceScore", "modelVersion", "createdAt"
                    ) VALUES (
                        :id, :ingredientId, :weekStartDate, :activeUserCount,
                        :predictedQtyKg, :confidenceScore, 'linear_v1', NOW()
                    )
                """), {
                    "id": str(uuid.uuid4()),
                    "ingredientId": f.ingredient_id,
                    "weekStartDate": week_start_date,
                    "activeUserCount": active_user_count,
                    "predictedQtyKg": f.predicted_qty_kg,
                    "confidenceScore": f.confidence_score
                })

            # 2. Upsert FarmerPurchaseOrder
            po_upsert = text("""
                INSERT INTO "FarmerPurchaseOrder" (
                    "id", "farmerId", "ingredientId", "weekStartDate", 
                    "forecastedQtyKg", "orderedQtyKg", "pricePerKg", "totalPrice",
                    "grossForecastKg", "currentStockKg",
                    "status", "confidenceScore", "createdAt"
                ) VALUES (
                    :id, :farmerId, :ingredientId, :weekStartDate,
                    :forecastedQtyKg, :orderedQtyKg, :pricePerKg, :totalPrice,
                    :grossForecastKg, :currentStockKg,
                    'DRAFT', :confidenceScore, NOW()
                )
                ON CONFLICT ("farmerId", "ingredientId", "weekStartDate") DO UPDATE SET
                    "forecastedQtyKg" = EXCLUDED."forecastedQtyKg",
                    "orderedQtyKg" = EXCLUDED."orderedQtyKg",
                    "pricePerKg" = EXCLUDED."pricePerKg",
                    "totalPrice" = EXCLUDED."totalPrice",
                    "grossForecastKg" = EXCLUDED."grossForecastKg",
                    "currentStockKg" = EXCLUDED."currentStockKg",
                    "confidenceScore" = EXCLUDED."confidenceScore"
            """)
            
            # According to prompt: "kalkulasi otomatis orderedQtyKg × pricePerKg"
            # And orderedQtyKg is initialised to max(predicted, minOrder)
            # Actually, orderedQtyKg can just be forecastedQtyKg initially.
            # But "orderedQtyKg — bisa diedit admin sebelum dikonfirmasi".
            ordered_qty = f.predicted_qty_kg
            total_price = ordered_qty * f.price_per_kg
            
            db.execute(po_upsert, {
                "id": str(uuid.uuid4()),
                "farmerId": f.farmer_id,
                "ingredientId": f.ingredient_id,
                "weekStartDate": week_start_date,
                "forecastedQtyKg": f.predicted_qty_kg,
                "orderedQtyKg": ordered_qty,
                "pricePerKg": f.price_per_kg,
                "totalPrice": total_price,
                "grossForecastKg": getattr(f, "gross_demand_kg", f.predicted_qty_kg),
                "currentStockKg": getattr(f, "current_stock_kg", 0.0),
                "confidenceScore": f.confidence_score
            })
            
        db.commit()
        return {"status": "success", "message": "Forecast saved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/forecast/actual", dependencies=[Depends(require_internal_key)])
def update_actual(request: schemas.ActualUpdateRequest, db: Session = Depends(get_db)):
    try:
        query = text("""
            UPDATE "DemandForecastLog"
            SET "actualQtyUsedKg" = :actualQtyKg
            WHERE "weekStartDate" = :weekStartDate 
              AND "ingredientId" = :ingredientId
        """)
        result = db.execute(query, {
            "actualQtyKg": request.actual_qty_kg,
            "weekStartDate": request.week_start_date,
            "ingredientId": request.ingredient_id
        })
        db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Forecast log not found")
            
        return {"status": "success", "message": "Actual quantity updated"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
