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
    breakfast: Optional[str] = None
    breakfast_instructions: Optional[List[str]] = None
    breakfast_portions: Optional[Dict[str, MealPortion]] = None
    member_lunches: Optional[Dict[str, str]] = None
    portions: Dict[str, MealPortion]
    dinner: Optional[str] = None
    dinner_portions: Optional[Dict[str, MealPortion]] = None
    dessert: Optional[str] = None
    dinner_dessert: Optional[str] = None
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


class PlanPeriod(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class WeeklyPlanCreate(BaseModel):
    family_profile_id: str
    week_start: date
    period: PlanPeriod = PlanPeriod.weekly
    include_breakfast: bool = False
    include_dinner: bool = False
    include_dessert: bool = False


class AdaptPlanRequest(BaseModel):
    feedback: str


class WeeklyPlanResponse(BaseModel):
    id: str
    user_id: str
    family_profile_id: str
    week_start: date
    status: PlanStatus
    period: str = "weekly"
    meals: Optional[List[DailyMeal]] = None
    shopping_list: Optional[List[ShoppingItem]] = None
    assembly_guide: Optional[dict] = None
    error_message: Optional[str] = None
    parent_plan_id: Optional[str] = None
    created_at: Optional[datetime] = None
