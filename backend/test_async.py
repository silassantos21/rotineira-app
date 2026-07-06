import time
from app.core.config import settings
from supabase import create_client

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

users = sb.table("user_profiles").select("id").limit(1).execute()
user_id = users.data[0]["id"]
profile = sb.table("family_profiles").select("id").eq("user_id", user_id).maybe_single().execute()

plan_res = sb.table("weekly_plans").insert({
    "user_id": user_id,
    "family_profile_id": profile.data["id"],
    "week_start": "2026-07-07",
    "status": "pending",
}).execute()
plan_id = plan_res.data[0]["id"]
print(f"Plano criado: {plan_id}")

# Dispara via broker Celery (assíncrono real)
from app.workers.tasks import generate_weekly_plan
task = generate_weekly_plan.delay(plan_id, user_id)
print(f"Task despachada: {task.id}")

# Aguarda até 15s para o resultado
for i in range(15):
    time.sleep(1)
    result = sb.table("weekly_plans").select("status,error_message").eq("id", plan_id).maybe_single().execute()
    status = result.data.get("status")
    print(f"  [{i+1}s] status: {status}")
    if status in ("done", "error"):
        if status == "error":
            print(f"ERRO: {result.data.get('error_message')}")
        break

if status == "done":
    full = sb.table("weekly_plans").select("meals,shopping_list").eq("id", plan_id).maybe_single().execute()
    d = full.data
    meals = d["meals"] if isinstance(d["meals"], list) else []
    sl = d["shopping_list"] if isinstance(d["shopping_list"], list) else []
    print(f"SUCESSO: {len(meals)} dias, {len(sl)} itens de compra")
