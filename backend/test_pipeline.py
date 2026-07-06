import sys
from app.core.config import settings
from supabase import create_client

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

users = sb.table("user_profiles").select("id").limit(1).execute()
if not users.data:
    print("ERRO: nenhum usuário encontrado")
    sys.exit(1)

user_id = users.data[0]["id"]
print(f"user_id: {user_id}")

profile = sb.table("family_profiles").select("id").eq("user_id", user_id).maybe_single().execute()
if not profile.data:
    print("ERRO: perfil familiar não encontrado")
    sys.exit(1)
print(f"family_profile_id: {profile.data['id']}")

plan_res = sb.table("weekly_plans").insert({
    "user_id": user_id,
    "family_profile_id": profile.data["id"],
    "week_start": "2026-07-06",
    "status": "pending",
}).execute()
plan_id = plan_res.data[0]["id"]
print(f"plan_id criado: {plan_id}")

from app.workers.tasks import generate_weekly_plan
generate_weekly_plan(plan_id, user_id)

result = sb.table("weekly_plans").select("status,meals,shopping_list,error_message").eq("id", plan_id).maybe_single().execute()
d = result.data
print(f"status: {d['status']}")
if d.get("meals"):
    import json
    meals = d["meals"] if isinstance(d["meals"], list) else json.loads(d["meals"])
    print(f"meals: {len(meals)} dias")
    print(f"  primeiro: {meals[0].get('day')} - {meals[0].get('lunch')}")
if d.get("shopping_list"):
    sl = d["shopping_list"] if isinstance(d["shopping_list"], list) else json.loads(d["shopping_list"])
    print(f"shopping_list: {len(sl)} itens")
if d.get("error_message"):
    print(f"ERRO: {d['error_message']}")
