import json
import time
from pydantic import BaseModel, ValidationError
from typing import List, Dict, Optional

_TRANSIENT_CODES = ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "overloaded")


class MealPortionAI(BaseModel):
    protein_g: float
    carb_g: float
    vegetable_g: float
    total_g: float


class DailyMealAI(BaseModel):
    day: str
    lunch: str
    breakfast: Optional[str] = None
    breakfast_instructions: Optional[List[str]] = None
    breakfast_portions: Optional[Dict[str, MealPortionAI]] = None
    member_lunches: Dict[str, str] = {}
    portions: Dict[str, MealPortionAI]
    dinner: Optional[str] = None
    dinner_portions: Optional[Dict[str, MealPortionAI]] = None
    dessert: Optional[str] = None
    dinner_dessert: Optional[str] = None
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


def _build_schema_example(
    include_breakfast: bool = False,
    include_dinner: bool = False,
    include_dessert: bool = False,
) -> str:
    """Constrói o exemplo de schema JSON enviado ao LLM, ativando campos opcionais conforme flags."""
    meal_fields: List[str] = [
        '      "day": "Segunda-feira"',
        '      "lunch": "Nome do prato principal (para a maioria da família)"',
    ]
    if include_breakfast:
        meal_fields.append('      "breakfast": "Tapioca com queijo e ovo"')
        meal_fields.append('      "breakfast_instructions": ["Passo 1: descrição clara e objetiva", "Passo 2: descrição clara e objetiva"]')
        meal_fields.append('      "breakfast_portions": {"NomeDoMembro": {"protein_g": 80, "carb_g": 60, "vegetable_g": 30, "total_g": 170}}')
    meal_fields += [
        '      "member_lunches": {"NomeDoMembro": "Prato alternativo quando restrição impede o principal"}',
        '      "portions": {"NomeDoMembro": {"protein_g": 200, "carb_g": 150, "vegetable_g": 100, "total_g": 450}}',
    ]
    if include_dinner:
        meal_fields.append('      "dinner": "Sopa de legumes com torrada integral"')
        meal_fields.append(
            '      "dinner_portions": {"NomeDoMembro": {"protein_g": 100, "carb_g": 80, "vegetable_g": 60, "total_g": 240}}'
        )
    if include_dessert:
        meal_fields.append('      "dessert": "Pudim de leite condensado"')
    if include_dinner and include_dessert:
        meal_fields.append('      "dinner_dessert": "Salada de frutas"')
    meal_fields += [
        '      "prep_time_min": 15',
        '      "cook_time_min": 30',
        '      "utensils": ["Panela grande", "Frigideira", "Tábua de corte"]',
        '      "instructions": ["Passo 1: descrição clara e objetiva", "Passo 2: descrição clara e objetiva"]',
    ]

    meal_body = ",\n".join(meal_fields)

    return (
        "{\n"
        '  "meals": [\n'
        "    {\n"
        f"{meal_body}\n"
        "    }\n"
        "  ],\n"
        '  "shopping_list": [\n'
        "    {\n"
        '      "name": "Nome do produto",\n'
        '      "quantity": "500g",\n'
        '      "category": "AÇOUGUE",\n'
        '      "price_estimate_brl": 25.90\n'
        "    }\n"
        "  ]\n"
        "}"
    )


_PERIOD_INSTRUCTIONS = {
    "weekly":   "7 dias (Segunda-feira a Domingo)",
    "biweekly": "14 dias (Semana 1: Seg-1 a Dom-1 e Semana 2: Seg-2 a Dom-2 — use sufixo '-1' e '-2' nos nomes dos dias, ex: 'Segunda-1', 'Segunda-2')",
    "monthly":  "30 dias (4 semanas — use o formato 'Seg-S1', 'Ter-S1' ... 'Dom-S4' para diferenciar as semanas)",
}

_PROMPT_TEMPLATE = (
    "Você é um nutricionista brasileiro especializado em Meal Prep (preparo de marmitas para famílias). "
    "Seu objetivo é criar um plano alimentar prático, saudável e econômico.\n\n"
    "Receba o perfil familiar abaixo e gere um cardápio COMPLETO de {period_instruction} "
    "focado em refeições que possam ser preparadas e congeladas como marmitas.\n\n"
    "Perfil familiar: {perfil_familia_json}\n\n"
    "{budget_rule}"
    "{breakfast_rule}"
    "{dinner_rule}"
    "{dessert_rule}"
    "REGRAS:\n"
    "1) Calcule as porções de cada membro com base no nível de apetite:\n"
    "   - low (Pouco)         = 50%%  da porção base adulta\n"
    "   - moderate (Moderado) = 75%%  da porção base adulta\n"
    "   - high (Muito)        = 100%% da porção base adulta\n"
    "   Porção base adulta: proteína 200g, carboidrato 200g, vegetal 150g.\n"
    "   Para crianças: use 60%% das porções do adulto como base antes do multiplicador de apetite.\n"
    "2) Priorize refeições com 3-5 ingredientes simples, disponíveis em supermercados brasileiros.\n"
    "3) Respeite ABSOLUTAMENTE todas as restrições alimentares e objetivos listados para cada membro. "
    "Quando as restrições de um membro tornarem impossível compartilhar o prato principal com os demais, "
    "atribua um prato alternativo específico para esse membro em 'member_lunches' (mapa nome→prato). "
    "Omita 'member_lunches' (ou deixe vazio) quando todos podem comer o mesmo prato principal.\n"
    "4) Varie as proteínas ao longo da semana (não repita a mesma proteína mais de 2 dias seguidos).\n"
    "5) Para cada refeição, inclua: tempo de preparo (prep_time_min), tempo de cozimento (cook_time_min), "
    "lista de utensílios necessários (utensils) e instruções de preparo passo a passo (instructions) "
    "com linguagem simples e objetiva, voltada para marmitas.\n"
    "6) Na lista de compras: some quantidades do mesmo ingrediente, adicione 10%% de margem, "
    "organize por categoria: AÇOUGUE, HORTIFRUTI, MERCEARIA, LATICÍNIOS, TEMPEROS, "
    "e inclua uma estimativa de preço em reais (BRL) para cada item com base em preços médios "
    "de supermercado brasileiro em 2025.\n"
    "7) Se um membro tiver 'calorie_limit_kcal' definido, dimensione as porções desse membro para que "
    "o total calórico não ultrapasse o limite. Estimativa: proteína=4kcal/g, carboidrato=4kcal/g, "
    "vegetal=1kcal/g. O campo 'calorie_limit_kcal' é a meta diária total "
    "(almoço ~35%%, janta ~25%% das calorias diárias quando aplicável).\n"
    "8) Retorne EXCLUSIVAMENTE JSON válido no schema abaixo, sem nenhum texto adicional.\n\n"
    "Schema obrigatório: {schema_json}"
)


def _build_prompt(
    family_profile: dict,
    period: str = "weekly",
    include_breakfast: bool = False,
    include_dinner: bool = False,
    include_dessert: bool = False,
) -> str:
    budget = family_profile.get("weekly_budget_brl")
    if budget is not None:
        multiplier = {"weekly": 1, "biweekly": 2, "monthly": 4}.get(period, 1)
        budget_total = budget * multiplier
        budget_rule = (
            f"ORÇAMENTO MÁXIMO PARA O PERÍODO: R$ {budget_total:.2f} "
            f"({multiplier}x o orçamento semanal de R$ {budget:.2f}). "
            "Escolha ingredientes e proteínas que mantenham o total estimado da lista de compras "
            "abaixo desse valor. Prefira cortes e produtos mais acessíveis quando necessário.\n\n"
        )
    else:
        budget_rule = ""

    breakfast_rule = (
        "CAFÉ DA MANHÃ (Premium): Para cada dia, inclua os campos 'breakfast' "
        "(sugestão simples e prática de café da manhã brasileiro), 'breakfast_instructions' "
        "(lista de 2 a 4 passos curtos e objetivos de preparo) e 'breakfast_portions' "
        "(mapa nome→porção no mesmo formato de 'portions', usando ~15%% das calorias diárias). "
        "Varie ao longo dos dias e respeite as restrições alimentares de todos os membros. "
        "Exemplos: 'Tapioca com queijo e ovo', 'Aveia com banana e mel', "
        "'Pão integral com pasta de amendoim'.\n\n"
    ) if include_breakfast else ""

    dinner_rule = (
        "JANTA (Premium): Para cada dia, inclua campos 'dinner' (nome do prato da janta) e "
        "'dinner_portions' (mapa nome→porção no mesmo formato de 'portions'). "
        "A janta deve ser mais leve que o almoço — use ~25%% das calorias diárias. "
        "Aplique as mesmas regras de apetite e restrições alimentares dos membros. "
        "Calcule protein_g, carb_g, vegetable_g e total_g por membro para a janta.\n\n"
    ) if include_dinner else ""

    dessert_rule = (
        "SOBREMESA (Premium): Para cada dia, inclua um campo 'dessert' com uma sugestão simples "
        "de sobremesa brasileira para o almoço. "
        + ("Inclua também 'dinner_dessert' com uma sobremesa diferente e leve para a janta. " if include_dinner else "")
        + "Ambas devem ser variadas ao longo dos dias e respeitar as "
        "restrições alimentares de todos os membros. "
        "Exemplos: 'Mousse de maracujá', 'Frutas com mel', 'Pudim de leite condensado', 'Salada de frutas'.\n\n"
    ) if include_dessert else ""

    schema_json = _build_schema_example(include_breakfast, include_dinner, include_dessert)

    return _PROMPT_TEMPLATE.format(
        period_instruction=_PERIOD_INSTRUCTIONS.get(period, _PERIOD_INSTRUCTIONS["weekly"]),
        perfil_familia_json=json.dumps(family_profile, ensure_ascii=False),
        budget_rule=budget_rule,
        breakfast_rule=breakfast_rule,
        dinner_rule=dinner_rule,
        dessert_rule=dessert_rule,
        schema_json=schema_json,
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
        include_breakfast = "'breakfast'" in prompt
        include_dinner = "'dinner'" in prompt
        include_dessert = "'dessert'" in prompt

        meals = []
        for dia, prato in self._MOCK_DAYS:
            meal: dict = {
                "day": dia,
                "lunch": prato,
                "member_lunches": {},
                "portions": {
                    "Membro 1": {"protein_g": 200, "carb_g": 150, "vegetable_g": 100, "total_g": 450}
                },
                "prep_time_min": 15,
                "cook_time_min": 30,
                "utensils": self._MOCK_UTENSILS,
                "instructions": self._MOCK_INSTRUCTIONS,
            }
            if include_breakfast:
                meal["breakfast"] = "Tapioca com queijo e ovo"
                meal["breakfast_instructions"] = [
                    "Umedeça a goma de tapioca na frigideira antiaderente em fogo médio.",
                    "Adicione o queijo ralado por cima e aguarde derreter por 1 min.",
                    "Quebre o ovo no centro e tampe a frigideira por 2 min.",
                ]
                meal["breakfast_portions"] = {
                    "Membro 1": {"protein_g": 80, "carb_g": 60, "vegetable_g": 30, "total_g": 170}
                }
            if include_dinner:
                meal["dinner"] = "Sopa de legumes com torrada"
                meal["dinner_portions"] = {
                    "Membro 1": {"protein_g": 100, "carb_g": 80, "vegetable_g": 60, "total_g": 240}
                }
            if include_dessert:
                meal["dessert"] = "Frutas com mel"
                if include_dinner:
                    meal["dinner_dessert"] = "Salada de frutas"
            meals.append(meal)

        return json.dumps({
            "meals": meals,
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

    def generate(
        self,
        family_profile: dict,
        period: str = "weekly",
        include_breakfast: bool = False,
        include_dinner: bool = False,
        include_dessert: bool = False,
    ) -> CardapioResult:
        prompt = _build_prompt(
            family_profile,
            period,
            include_breakfast=include_breakfast,
            include_dinner=include_dinner,
            include_dessert=include_dessert,
        )
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
