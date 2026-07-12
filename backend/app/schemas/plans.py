from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import date, datetime
from enum import Enum


class PlanStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    error = "error"


class MealPortion(BaseModel):
    protein_g: float
    carb_g: float
    vegetable_g: float
    total_g: float


class DailyMeal(BaseModel):
    day: str
    lunch: str
    portions: Dict[str, MealPortion]
    prep_time_min: int = 0
    cook_time_min: int = 0
    utensils: List[str] = []
    instructions: List[str] = []


class ShoppingItem(BaseModel):
    name: str
    quantity: str
    category: str
    price_estimate_brl: float = 0.0
    checked: bool = False


class WeeklyPlanCreate(BaseModel):
    family_profile_id: str
    week_start: date


class AdaptPlanRequest(BaseModel):
    feedback: str


class WeeklyPlanResponse(BaseModel):
    id: str
    user_id: str
    family_profile_id: str
    week_start: date
    status: PlanStatus
    meals: Optional[List[DailyMeal]] = None
    shopping_list: Optional[List[ShoppingItem]] = None
    assembly_guide: Optional[dict] = None
    error_message: Optional[str] = None
    parent_plan_id: Optional[str] = None
    created_at: Optional[datetime] = None
