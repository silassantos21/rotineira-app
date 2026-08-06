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


def run_generate_weekly_plan(
    plan_id: str,
    user_id: str,
    include_breakfast: bool = False,
    include_dinner: bool = False,
    include_dessert: bool = False,
) -> None:
    sb = _get_supabase()

    try:
        sb.table("weekly_plans").update({"status": "processing"}).eq("id", plan_id).execute()

        profile_res = sb.table("family_profiles").select("*").eq("user_id", user_id).maybe_single().execute()
        if not profile_res.data:
            raise ValueError("Perfil familiar não encontrado para o usuário")

        plan_res = sb.table("weekly_plans").select("period").eq("id", plan_id).maybe_single().execute()
        period = (plan_res.data or {}).get("period", "weekly")

        from app.agents.cardapio_generator import CardapioGeneratorAgent, estimate_plan_cost
        agent = CardapioGeneratorAgent(
            gemini_api_key=settings.GEMINI_API_KEY,
            openai_api_key=settings.OPENAI_API_KEY,
            mock=settings.MOCK_AI,
        )
        result = agent.generate(
            profile_res.data,
            period=period,
            include_breakfast=include_breakfast,
            include_dinner=include_dinner,
            include_dessert=include_dessert,
        )

        # Validação de orçamento pós-geração: 3 tentativas LLM + enforcement hard garantido
        budget = profile_res.data.get("weekly_budget_brl")
        if budget and not settings.MOCK_AI:
            multiplier = {"weekly": 1, "biweekly": 2, "monthly": 4}.get(period, 1)
            budget_total = budget * multiplier
            from app.agents.cardapio_generator import enforce_budget_hard
            from app.agents.cardapio_adaptacao import CardapioAdaptacaoAgent
            adapt_agent = CardapioAdaptacaoAgent(
                gemini_api_key=settings.GEMINI_API_KEY,
                openai_api_key=settings.OPENAI_API_KEY,
                mock=False,
            )
            for attempt in range(3):
                total_cost = estimate_plan_cost(result.shopping_list)
                if total_cost <= budget_total:
                    break
                feedback = (
                    f"ATENÇÃO: o plano está R$ {total_cost - budget_total:.2f} ACIMA do orçamento. "
                    f"Total atual: R$ {total_cost:.2f}. Limite máximo: R$ {budget_total:.2f}. "
                    "É OBRIGATÓRIO que a soma de todos os price_estimate_brl fique abaixo de "
                    f"R$ {budget_total:.2f}. "
                    "Ações necessárias: (1) substitua peito de frango por coxa/sobrecoxa, "
                    "salmão por tilápia, cortes nobres por carne moída ou patinho; "
                    "(2) reduza quantidades de todos os itens; "
                    "(3) elimine ingredientes opcionais. "
                    "Some os preços item a item antes de responder e confirme que o total está abaixo do limite."
                )
                current_plan = {
                    "meals": [m.model_dump() for m in result.meals],
                    "shopping_list": [s.model_dump() for s in result.shopping_list],
                }
                result = adapt_agent.adapt(current_plan, profile_res.data, feedback)

            # Enforcement hard: se após 3 tentativas ainda acima, escala preços em código
            result = enforce_budget_hard(result, budget_total)

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
