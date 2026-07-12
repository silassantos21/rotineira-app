import json
import time
from pydantic import BaseModel, ValidationError
from typing import List, Dict

_TRANSIENT_CODES = ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded")


class MealPortionAI(BaseModel):
    protein_g: float
    carb_g: float
    vegetable_g: float
    total_g: float


class DailyMealAI(BaseModel):
    day: str
    lunch: str
    portions: Dict[str, MealPortionAI]
    prep_time_min: int
    cook_time_min: int
    utensils: List[str]
    instructions: List[str]


class ShoppingItemAI(BaseModel):
    name: str
    quantity: str
    category: str
    price_estimate_brl: float


class CardapioResult(BaseModel):
    meals: List[DailyMealAI]
    shopping_list: List[ShoppingItemAI]


_SCHEMA_EXAMPLE = """{
  "meals": [
    {
      "day": "Segunda-feira",
      "lunch": "Nome do prato",
      "portions": {
        "NomeDoMembro": {
          "protein_g": 200,
          "carb_g": 150,
          "vegetable_g": 100,
          "total_g": 450
        }
      },
      "prep_time_min": 15,
      "cook_time_min": 30,
      "utensils": ["Panela grande", "Frigideira", "Tábua de corte"],
      "instructions": [
        "Passo 1: descrição clara e objetiva",
        "Passo 2: descrição clara e objetiva"
      ]
    }
  ],
  "shopping_list": [
    {
      "name": "Nome do produto",
      "quantity": "500g",
      "category": "AÇOUGUE",
      "price_estimate_brl": 25.90
    }
  ]
}"""

_PROMPT_TEMPLATE = (
    "Você é um nutricionista brasileiro especializado em Meal Prep (preparo de marmitas semanais para famílias). "
    "Seu objetivo é criar um plano alimentar prático, saudável e econômico.\n\n"
    "Receba o perfil familiar abaixo e gere um cardápio semanal COMPLETO (7 dias: Segunda a Domingo) "
    "focado em refeições que possam ser preparadas em um único dia e congeladas como marmitas.\n\n"
    "Perfil familiar: {perfil_familia_json}\n\n"
    "{budget_rule}"
    "REGRAS:\n"
    "1) Calcule as porções de cada membro com base no nível de apetite:\n"
    "   - low (Pouco)         = 50%%  da porção base adulta\n"
    "   - moderate (Moderado) = 75%%  da porção base adulta\n"
    "   - high (Muito)        = 100%% da porção base adulta\n"
    "   Porção base adulta: proteína 200g, carboidrato 200g, vegetal 150g.\n"
    "   Para crianças: use 60%% das porções do adulto como base antes do multiplicador de apetite.\n"
    "2) Priorize refeições com 3-5 ingredientes simples, disponíveis em supermercados brasileiros.\n"
    "3) Respeite ABSOLUTAMENTE todas as restrições alimentares e objetivos listados para cada membro.\n"
    "4) Varie as proteínas ao longo da semana (não repita a mesma proteína mais de 2 dias seguidos).\n"
    "5) Para cada refeição, inclua: tempo de preparo (prep_time_min), tempo de cozimento (cook_time_min), "
    "lista de utensílios necessários (utensils) e instruções de preparo passo a passo (instructions) "
    "com linguagem simples e objetiva, voltada para marmitas.\n"
    "6) Na lista de compras: some quantidades do mesmo ingrediente, adicione 10%% de margem, "
    "organize por categoria: AÇOUGUE, HORTIFRUTI, MERCEARIA, LATICÍNIOS, TEMPEROS, "
    "e inclua uma estimativa de preço em reais (BRL) para cada item com base em preços médios "
    "de supermercado brasileiro em 2025.\n"
    "7) Retorne EXCLUSIVAMENTE JSON válido no schema abaixo, sem nenhum texto adicional.\n\n"
    "Schema obrigatório: {schema_json}"
)


def _build_prompt(family_profile: dict) -> str:
    budget = family_profile.get("weekly_budget_brl")
    if budget is not None:
        budget_rule = (
            f"ORÇAMENTO MÁXIMO SEMANAL: R$ {budget:.2f}. "
            "Escolha ingredientes e proteínas que mantenham o total estimado da lista de compras "
            "abaixo desse valor. Prefira cortes e produtos mais acessíveis quando necessário.\n\n"
        )
    else:
        budget_rule = ""
    return _PROMPT_TEMPLATE.format(
        perfil_familia_json=json.dumps(family_profile, ensure_ascii=False),
        budget_rule=budget_rule,
        schema_json=_SCHEMA_EXAMPLE,
    )


def _parse(raw: str) -> CardapioResult:
    data = json.loads(raw)
    return CardapioResult.model_validate(data)


class _GeminiProvider:
    def __init__(self, api_key: str):
        from google import genai
        from google.genai import types as gtypes
        self._client = genai.Client(api_key=api_key)
        self._types = gtypes

    def call(self, prompt: str) -> str:
        response = self._client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=self._types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        return response.text or ""


class _OpenAIProvider:
    def __init__(self, api_key: str):
        from openai import OpenAI
        self._client = OpenAI(api_key=api_key)

    def call(self, prompt: str) -> str:
        response = self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        return response.choices[0].message.content or ""


class _MockProvider:
    """Retorna um cardápio fictício para testes sem chave de API."""

    _MOCK_INSTRUCTIONS = [
        "Tempere a proteína com sal, alho e limão.",
        "Cozinhe o arroz integral em fogo baixo por 35 min.",
        "Grelhe a proteína em frigideira quente por 6–8 min cada lado.",
        "Refogue o vegetal com azeite e alho por 5 min.",
        "Monte as marmitas: proteína + arroz + vegetal.",
    ]
    _MOCK_UTENSILS = ["Panela", "Frigideira", "Tábua de corte", "Faca"]
    _MOCK_DAYS = [
        ("Segunda-feira", "Frango grelhado com arroz integral e brócolis"),
        ("Terça-feira", "Carne moída com batata-doce e cenoura"),
        ("Quarta-feira", "Tilápia assada com arroz e couve refogada"),
        ("Quinta-feira", "Frango desfiado com macarrão integral e espinafre"),
        ("Sexta-feira", "Bife acebolado com arroz e feijão"),
        ("Sábado", "Frango ao molho com batata e vagem"),
        ("Domingo", "Carne de panela com arroz e salada"),
    ]

    def call(self, prompt: str) -> str:
        return json.dumps({
            "meals": [
                {
                    "day": dia,
                    "lunch": prato,
                    "portions": {
                        "Membro 1": {"protein_g": 200, "carb_g": 150, "vegetable_g": 100, "total_g": 450}
                    },
                    "prep_time_min": 15,
                    "cook_time_min": 30,
                    "utensils": self._MOCK_UTENSILS,
                    "instructions": self._MOCK_INSTRUCTIONS,
                }
                for dia, prato in self._MOCK_DAYS
            ],
            "shopping_list": [
                {"name": "Peito de frango", "quantity": "2kg", "category": "AÇOUGUE", "price_estimate_brl": 32.90},
                {"name": "Carne moída", "quantity": "500g", "category": "AÇOUGUE", "price_estimate_brl": 18.50},
                {"name": "Filé de tilápia", "quantity": "600g", "category": "AÇOUGUE", "price_estimate_brl": 22.80},
                {"name": "Arroz integral", "quantity": "2kg", "category": "MERCEARIA", "price_estimate_brl": 12.90},
                {"name": "Batata-doce", "quantity": "1kg", "category": "HORTIFRUTI", "price_estimate_brl": 7.50},
                {"name": "Brócolis", "quantity": "500g", "category": "HORTIFRUTI", "price_estimate_brl": 6.90},
                {"name": "Cenoura", "quantity": "500g", "category": "HORTIFRUTI", "price_estimate_brl": 4.20},
            ],
        }, ensure_ascii=False)


class CardapioGeneratorAgent:
    """Gera cardápio via Gemini Flash (primário) com fallback para OpenAI."""

    def __init__(self, gemini_api_key: str = "", openai_api_key: str = "", mock: bool = False):
        self._providers = []
        if mock:
            self._providers.append(("Mock", _MockProvider()))
        else:
            if gemini_api_key:
                self._providers.append(("Gemini", _GeminiProvider(gemini_api_key)))
            if openai_api_key:
                self._providers.append(("OpenAI", _OpenAIProvider(openai_api_key)))
            if not self._providers:
                raise ValueError("Nenhuma chave de API configurada (GEMINI_API_KEY ou OPENAI_API_KEY)")

    def generate(self, family_profile: dict) -> CardapioResult:
        prompt = _build_prompt(family_profile)
        last_error: Exception = ValueError("Nenhum provider disponível")

        for provider_name, provider in self._providers:
            for attempt in range(3):
                try:
                    raw = provider.call(prompt)
                    return _parse(raw)
                except (json.JSONDecodeError, ValidationError) as e:
                    last_error = e
                    if attempt == 2:
                        break
                except Exception as e:
                    last_error = Exception(f"{provider_name}: {e}")
                    if any(code in str(e) for code in _TRANSIENT_CODES) and attempt < 2:
                        time.sleep(8 * (attempt + 1))  # 8s, 16s
                        continue
                    break  # erro permanente — tenta próximo provider

        raise ValueError(f"Falha na geração do cardápio: {last_error}")
