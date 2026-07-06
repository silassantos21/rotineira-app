from app.core.config import settings
from supabase import create_client
import json

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

result = sb.table("weekly_plans").select("meals,status").eq("status", "done").order("created_at", desc=True).limit(1).execute()
if not result.data:
    print("Nenhum plano encontrado")
    exit()

meals = result.data[0]["meals"]
if isinstance(meals, str):
    meals = json.loads(meals)

meal = meals[0]
print(f"Dia: {meal['day']}")
print(f"Prato: {meal['lunch']}")
print(f"Preparo: {meal.get('prep_time_min', 'N/A')} min | Cozimento: {meal.get('cook_time_min', 'N/A')} min")
print(f"Utensílios: {meal.get('utensils', [])}")
print(f"Instruções ({len(meal.get('instructions', []))} passos):")
for i, step in enumerate(meal.get("instructions", []), 1):
    print(f"  {i}. {step}")
