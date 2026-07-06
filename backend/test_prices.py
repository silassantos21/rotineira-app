from app.core.config import settings
from supabase import create_client

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

result = sb.table("weekly_plans").select("shopping_list,status").eq("status", "done").order("created_at", desc=True).limit(1).execute()
if not result.data:
    print("Nenhum plano encontrado")
    exit()

d = result.data[0]
sl = d["shopping_list"]
if isinstance(sl, str):
    import json
    sl = json.loads(sl)

total = sum(item.get("price_estimate_brl", 0) for item in sl)
print(f"Total de itens: {len(sl)}")
for item in sl:
    price = item.get("price_estimate_brl", 0)
    print(f"  {item['name']:30s} {item['quantity']:8s} R$ {price:.2f}")
print(f"\nTotal estimado: R$ {total:.2f}")
