import json
import time
from pydantic import ValidationError
from app.agents.cardapio_generator import (
    _TRANSIENT_CODES,
    CardapioResult,
    _build_schema_example,
    _GeminiProvider,
    _OpenAIProvider,
    _MockProvider,
)

_ADAPT_PROMPT = (
    "Você é um nutricionista brasileiro especializado em Meal Prep (preparo de marmitas semanais para famílias).\n\n"
    "Um usuário gerou o cardápio abaixo e enviou feedback pedindo ajustes. "
    "Adapte SOMENTE o que o feedback indica — não altere o que não foi mencionado.\n\n"
    "Cardápio atual:\n{cardapio_json}\n\n"
    "Perfil familiar:\n{perfil_json}\n\n"
    "Feedback do usuário: \"{feedback}\"\n\n"
    "REGRAS:\n"
    "1) Modifique apenas as refeições/itens mencionados no feedback. Preserve tudo que não foi citado.\n"
    "2) Mantenha as mesmas porções por membro (protein_g, carb_g, vegetable_g, total_g) nos dias não alterados.\n"
    "3) Para dias alterados, recalcule porções respeitando os níveis de apetite do perfil familiar:\n"
    "   - low (Pouco) = 50%% · moderate (Moderado) = 75%% · high (Muito) = 100%% da porção base adulta.\n"
    "   Porção base adulta: proteína 200g, carboidrato 200g, vegetal 150g.\n"
    "   Para crianças: 60%% das porções do adulto antes do multiplicador de apetite.\n"
    "4) Atualize a lista de compras completa considerando TODAS as refeições (alteradas e não alteradas).\n"
    "5) Respeite absolutamente todas as restrições alimentares de cada membro.\n"
    "6) Varie proteínas: não repita a mesma proteína mais de 2 dias seguidos.\n"
    "7) Retorne EXCLUSIVAMENTE JSON válido no schema abaixo, sem nenhum texto adicional.\n\n"
    "Schema obrigatório: {schema_json}"
)


def _build_adapt_prompt(current_plan: dict, family_profile: dict, feedback: str) -> str:
    cardapio = {
        "meals": current_plan.get("meals", []),
        "shopping_list": current_plan.get("shopping_list", []),
    }
    return _ADAPT_PROMPT.format(
        cardapio_json=json.dumps(cardapio, ensure_ascii=False),
        perfil_json=json.dumps(family_profile, ensure_ascii=False),
        feedback=feedback,
        schema_json=_build_schema_example(include_breakfast=True, include_dinner=True, include_dessert=True),
    )


def _parse(raw: str) -> CardapioResult:
    data = json.loads(raw)
    return CardapioResult.model_validate(data)


class CardapioAdaptacaoAgent:
    """Adapta um cardápio existente com base em feedback em linguagem natural do usuário."""

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

    def adapt(self, current_plan: dict, family_profile: dict, feedback: str) -> CardapioResult:
        prompt = _build_adapt_prompt(current_plan, family_profile, feedback)
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
                        time.sleep(8 * (attempt + 1))
                        continue
                    break

        raise ValueError(f"Falha na adaptação do cardápio: {last_error}")
