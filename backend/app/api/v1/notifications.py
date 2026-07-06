from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import create_client
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()


class PushTokenRequest(BaseModel):
    token: str


@router.post("/token", status_code=204)
async def save_push_token(
    body: PushTokenRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["sub"]
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    sb.table("user_profiles").update({"expo_push_token": body.token}).eq("id", user_id).execute()
