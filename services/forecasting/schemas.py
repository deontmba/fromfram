from pydantic import BaseModel
from typing import List
from datetime import date, datetime

class ForecastRequest(BaseModel):
    week_start_date: date

class IngredientForecast(BaseModel):
    ingredient_id: str
    ingredient_name: str
    farmer_id: str
    farmer_name: str
    farmer_region: str
    predicted_qty_kg: float
    confidence_score: float
    min_order_kg: float
    price_per_kg: float
    total_price: float

class ForecastResponse(BaseModel):
    week_start_date: date
    active_user_count: int
    generated_at: datetime
    forecasts: List[IngredientForecast]

class ActualUpdateRequest(BaseModel):
    week_start_date: date
    ingredient_id: str
    actual_qty_kg: float
