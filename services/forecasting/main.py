from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import uuid

import schemas
from database import get_db
from model import generate_forecast
import traceback

app = FastAPI(title="FromFarm AI Demand Forecasting")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/forecast", response_model=schemas.ForecastResponse)
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

@app.post("/forecast/save")
def save_forecast(response: schemas.ForecastResponse, db: Session = Depends(get_db)):
    week_start_date = response.week_start_date
    active_user_count = response.active_user_count
    
    try:
        for f in response.forecasts:
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
                    "status", "confidenceScore", "createdAt"
                ) VALUES (
                    :id, :farmerId, :ingredientId, :weekStartDate,
                    :forecastedQtyKg, :orderedQtyKg, :pricePerKg, :totalPrice,
                    'DRAFT', :confidenceScore, NOW()
                )
                ON CONFLICT ("farmerId", "ingredientId", "weekStartDate") DO UPDATE SET
                    "forecastedQtyKg" = EXCLUDED."forecastedQtyKg",
                    "orderedQtyKg" = EXCLUDED."orderedQtyKg",
                    "pricePerKg" = EXCLUDED."pricePerKg",
                    "totalPrice" = EXCLUDED."totalPrice",
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
                "confidenceScore": f.confidence_score
            })
            
        db.commit()
        return {"status": "success", "message": "Forecast saved successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/forecast/actual")
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
