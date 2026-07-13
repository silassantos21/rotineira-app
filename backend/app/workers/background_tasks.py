"""
Funções de background para geração de planos usando FastAPI BackgroundTasks.
Substitui o Celery temporariamente para MVP — a lógica é idêntica às tasks Celery
em tasks.py, facilitando a migração futura: basta trocar o disparo em plans.py.
"""
import httpx
from app.core.config import settings

_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _get_supabase():
    from supabase import create_client
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _send_push(push_token: str, plan_id: str) -> None:
    try:
        httpx.post(
            _EXPO_PUSH_URL,
            json={
                "to": push_token,
                "title": "Cardápio pronto! 🍱",
                "body": "Seu plano semanal foi gerado com sucesso. Abra o app para ver.",
                "sound": "default",
                "data": {"plan_id": plan_id},
            },
            timeout=10.0,
        )
    except Exception:
        pass


def run_generate_weekly_plan(plan_id: str, user_id: str) -> None:
    sb = _get_supabase()

    try:
        sb.table("weekly_plans").update({"status": "processing"}).eq("id", plan_id).execute()

        profile_res = sb.table("family_profiles").select("*").eq("user_id", user_id).maybe_single().execute()
        if not profile_res.data:
            raise ValueError("Perfil familiar não encontrado para o usuário")

        from app.agents.cardapio_generator import CardapioGeneratorAgent
        agent = CardapioGeneratorAgent(
            gemini_api_key=settings.GEMINI_API_KEY,
            openai_api_key=settings.OPENAI_API_KEY,
            mock=settings.MOCK_AI,
        )
        result = agent.generate(profile_res.data)

        sb.table("weekly_plans").update({
            "status": "done",
            "meals": [m.model_dump() for m in result.meals],
            "shopping_list": [s.model_dump() for s in result.shopping_list],
        }).eq("id", plan_id).execute()

        user_res = sb.table("user_profiles").select("expo_push_token").eq("id", user_id).maybe_single().execute()
        push_token = (user_res.data or {}).get("expo_push_token")
        if push_token:
            _send_push(push_token, plan_id)

    except Exception as exc:
        try:
            sb.table("weekly_plans").update({
                "status": "error",
                "error_message": str(exc)[:500],
            }).eq("id", plan_id).execute()
        except Exception:
            pass
        try:
            row = sb.table("user_profiles").select("generation_count_week").eq("id", user_id).maybe_single().execute()
            if row.data:
                restored = max(0, (row.data.get("generation_count_week") or 1) - 1)
                sb.table("user_profiles").update({"generation_count_week": restored}).eq("id", user_id).execute()
        except Exception:
            pass


def run_adapt_weekly_plan(plan_id: str, parent_plan_id: str, user_id: str, feedback: str) -> None:
    sb = _get_supabase()

    try:
        sb.table("weekly_plans").update({"status": "processing"}).eq("id", plan_id).execute()

        original_res = sb.table("weekly_plans").select("*").eq("id", parent_plan_id).maybe_single().execute()
        if not original_res.data:
            raise ValueError("Plano original não encontrado")

        profile_res = sb.table("family_profiles").select("*").eq("user_id", user_id).maybe_single().execute()
        if not profile_res.data:
            raise ValueError("Perfil familiar não encontrado para o usuário")

        from app.agents.cardapio_adaptacao import CardapioAdaptacaoAgent
        agent = CardapioAdaptacaoAgent(
            gemini_api_key=settings.GEMINI_API_KEY,
            openai_api_key=settings.OPENAI_API_KEY,
            mock=settings.MOCK_AI,
        )
        result = agent.adapt(original_res.data, profile_res.data, feedback)

        sb.table("weekly_plans").update({
            "status": "done",
            "meals": [m.model_dump() for m in result.meals],
            "shopping_list": [s.model_dump() for s in result.shopping_list],
        }).eq("id", plan_id).execute()

        user_res = sb.table("user_profiles").select("expo_push_token").eq("id", user_id).maybe_single().execute()
        push_token = (user_res.data or {}).get("expo_push_token")
        if push_token:
            _send_push(push_token, plan_id)

    except Exception as exc:
        try:
            sb.table("weekly_plans").update({
                "status": "error",
                "error_message": str(exc)[:500],
            }).eq("id", plan_id).execute()
        except Exception:
            pass
