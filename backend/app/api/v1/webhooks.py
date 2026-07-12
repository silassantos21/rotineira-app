from fastapi import APIRouter, Request, HTTPException
from app.core.config import settings

router = APIRouter()

_PREMIUM_EVENTS = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION"}
_FREE_EVENTS = {"CANCELLATION", "EXPIRATION", "BILLING_ISSUE_DETECTED"}


@router.post("/revenuecat")
async def revenuecat_webhook(request: Request):
    if settings.REVENUECAT_WEBHOOK_SECRET:
        auth = request.headers.get("Authorization", "")
        if auth != f"Bearer {settings.REVENUECAT_WEBHOOK_SECRET}":
            raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    event = body.get("event", {})
    event_type = event.get("type", "")
    app_user_id = event.get("app_user_id", "")

    if not app_user_id or event_type not in (_PREMIUM_EVENTS | _FREE_EVENTS):
        return {"ok": True}

    new_plan = "premium" if event_type in _PREMIUM_EVENTS else "free"

    from supabase import create_client
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    sb.table("user_profiles").update({"plan": new_plan}).eq("id", app_user_id).execute()

    return {"ok": True}
