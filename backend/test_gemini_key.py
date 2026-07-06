import os
from google import genai
from google.genai import types as gtypes

key = os.environ.get("GEMINI_API_KEY", "")
mock = os.environ.get("MOCK_AI", "")
print(f"Mock ativo: {mock}")
print(f"Chave (últimos 8): ...{key[-8:]}")

client = genai.Client(api_key=key)
try:
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Responda apenas: OK",
        config=gtypes.GenerateContentConfig(temperature=0),
    )
    print(f"Gemini respondeu: {response.text}")
except Exception as e:
    print(f"ERRO: {e}")
