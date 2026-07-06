from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Optional


class MemberType(str, Enum):
    adult = "adulto"
    child = "crianca"


class AppetiteLevel(str, Enum):
    low = "pouco"
    moderate = "moderado"
    high = "muito"


class FamilyMember(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    type: MemberType
    appetite: AppetiteLevel
    restrictions: List[str] = []
    objectives: List[str] = []


class FamilyProfileCreate(BaseModel):
    members: List[FamilyMember] = Field(..., min_length=1, max_length=10)


class FamilyProfileResponse(FamilyProfileCreate):
    id: str
    user_id: str
