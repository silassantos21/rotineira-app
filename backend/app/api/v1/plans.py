from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client
from app.core.security import get_current_user
from app.core.config import settings
from app.schemas.plans import WeeklyPlanCreate, WeeklyPlanResponse, AdaptPlanRequest

router = APIRouter()

_FREE_WEEKLY_LIMIT = 999  # liberado para período de testes
_WEEK_SECONDS = 7 * 24 * 3600


def _sb():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _plan_response(plan: dict) -> WeeklyPlanResponse:
    return WeeklyPlanResponse.model_validate(plan)


def _check_and_increment_rate_limit(sb, user_id: str) -> None:
    res = sb.table("user_profiles").select(
        "plan, generation_count_week, last_generation_reset"
    ).eq("id", user_id).maybe_single().execute()

    if not res.data:
        return

    if res.data.get("plan", "free") != "free":
        return

    count = res.data.get("generation_count_week", 0) or 0
    last_reset_raw = res.data.get("last_generation_reset")

    if last_reset_raw:
        last_reset = datetime.fromisoformat(last_reset_raw.replace("Z", "+00:00"))
        if (datetime.now(timezone.utc) - last_reset).total_seconds() >= _WEEK_SECONDS:
            sb.table("user_profiles").update({
                "generation_count_week": 0,
                "last_generation_reset": datetime.now(timezone.utc).isoformat(),
            }).eq("id", user_id).execute()
            count = 0

    if count >= _FREE_WEEKLY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=(
                "Limite semanal atingido. O plano gratuito permite 1 geração por semana. "
                "Aguarde até a próxima semana ou faça upgrade para o plano Premium."
            ),
        )

    sb.table("user_profiles").update(
        {"generation_count_week": count + 1}
    ).eq("id", user_id).execute()


@router.post("/generate", response_model=WeeklyPlanResponse, status_code=202)
async def generate_plan(
    body: WeeklyPlanCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["sub"]
    sb = _sb()

    _check_and_increment_rate_limit(sb, user_id)

    result = sb.table("weekly_plans").insert({
        "user_id": user_id,
        "family_profile_id": str(body.family_profile_id),
        "week_start": body.week_start.isoformat(),
        "status": "pending",
    }).execute()

    plan = result.data[0]

    from app.workers.tasks import generate_weekly_plan
    generate_weekly_plan.delay(plan["id"], user_id)

    return _plan_response(plan)


@router.post("/{plan_id}/adapt", response_model=WeeklyPlanResponse, status_code=202)
async def adapt_plan(
    plan_id: str,
    body: AdaptPlanRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["sub"]
    sb = _sb()

    original = (
        sb.table("weekly_plans")
        .select("*")
        .eq("id", plan_id)
        .eq("user_id", user_id)
        .eq("status", "done")
        .maybe_single()
        .execute()
    )
    if not original.data:
        raise HTTPException(status_code=404, detail="Plano não encontrado ou ainda não concluído")

    result = sb.table("weekly_plans").insert({
        "user_id": user_id,
        "family_profile_id": original.data["family_profile_id"],
        "week_start": original.data["week_start"],
        "status": "pending",
        "parent_plan_id": plan_id,
    }).execute()

    new_plan = result.data[0]

    from app.workers.tasks import adapt_weekly_plan
    adapt_weekly_plan.delay(new_plan["id"], plan_id, user_id, body.feedback)

    return _plan_response(new_plan)


@router.get("/{plan_id}", response_model=WeeklyPlanResponse)
async def get_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    sb = _sb()

    result = (
        sb.table("weekly_plans")
        .select("*")
        .eq("id", plan_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    return _plan_response(result.data)


@router.get("", response_model=list[WeeklyPlanResponse])
async def list_plans(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    sb = _sb()

    result = (
        sb.table("weekly_plans")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    return [_plan_response(p) for p in result.data]
