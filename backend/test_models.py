import os
from google import genai
from google.genai import types as gtypes

key = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=key)

models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
]

for model in models:
    try:
        response = client.models.generate_content(
            model=model,
            contents="Responda apenas: OK",
            config=gtypes.GenerateContentConfig(temperature=0),
        )
        print(f"SUCESSO com {model}: {response.text}")
        break
    except Exception as e:
        msg = str(e)
        if "429" in msg:
            if "prepayment" in msg:
                print(f"{model}: 429 prepayment depleted")
            elif "limit: 0" in msg or "RESOURCE_EXHAUSTED" in msg:
                print(f"{model}: 429 quota free tier = 0 (sem cota gratuita no BR)")
            else:
                print(f"{model}: 429 outro: {msg[:100]}")
        elif "401" in msg:
            print(f"{model}: 401 auth inválida")
        elif "404" in msg:
            print(f"{model}: 404 modelo não encontrado")
        else:
            print(f"{model}: ERRO {msg[:120]}")
