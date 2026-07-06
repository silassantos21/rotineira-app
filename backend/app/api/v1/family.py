from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.family import FamilyProfileCreate, FamilyProfileResponse

router = APIRouter()

# Implementação completa na Fase 2


@router.get("/profile", response_model=FamilyProfileResponse)
async def get_family_profile(current_user: dict = Depends(get_current_user)):
    raise NotImplementedError("Implementado na Fase 2")


@router.post("/profile", response_model=FamilyProfileResponse, status_code=201)
async def create_family_profile(
    body: FamilyProfileCreate,
    current_user: dict = Depends(get_current_user),
):
    raise NotImplementedError("Implementado na Fase 2")


@router.put("/profile", response_model=FamilyProfileResponse)
async def update_family_profile(
    body: FamilyProfileCreate,
    current_user: dict = Depends(get_current_user),
):
    raise NotImplementedError("Implementado na Fase 2")
