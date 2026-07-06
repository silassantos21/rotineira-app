# Rotineira — App de Planejamento de Marmitas com IA

## Contexto do Projeto

O Rotineira é um aplicativo mobile multiplataforma (Android/iOS) que usa inteligência artificial para resolver a sobrecarga mental de planejar refeições semanais em família. O app gera cardápios personalizados, calcula porções exatas por membro da família conforme apetite e restrições, e produz listas de compras consolidadas e guias de montagem de marmitas com gramagens detalhadas.

**Problema:** Famílias brasileiras, especialmente mães e pais com rotina corrida, perdem horas semanais planejando o que cozinhar, calculando quantidades de ingredientes para diferentes membros e organizando compras — resultando em desperdício de alimentos, gastos desnecessários e estresse. Não existe uma solução acessível que combine planejamento familiar personalizado com inteligência artificial para meal prep de marmitas.

**Público-alvo:** Mães e pais entre 25–45 anos, com filhos em casa, rotina intensa de trabalho e interesse em alimentação saudável e organizada. Pessoas que já fazem ou querem começar a fazer marmitas semanais (meal prep). Público brasileiro, familiarizado com apps mobile e disposto a pagar por conveniência doméstica.

## Stack Tecnológica

- **Frontend:** React Native com Expo (TypeScript)
- **Backend:** FastAPI (Python 3.12)
- **Banco de Dados:** Supabase (PostgreSQL gerenciado)
- **Infraestrutura:** Railway (backend FastAPI) + Supabase (banco) + Expo EAS (builds mobile)

Detalhes completos em [docs/02_TECH_STACK.md](docs/02_TECH_STACK.md).

## Estrutura do Projeto

```
rotineira-app-meal-prep/
├── docs/           # Planejamento e documentação
│   ├── 00_OVERVIEW.md
│   ├── 01_ARCHITECTURE.md
│   ├── 02_TECH_STACK.md
│   ├── 03_AI_AGENTS.md
│   ├── 04_TIMELINE.md
│   └── 05_COST_ANALYSIS.md
├── src/            # Código-fonte (a criar)
└── CLAUDE.md       # Este arquivo
```

## Funcionalidades Principais

- Cadastro de perfil familiar com múltiplos membros (adulto/criança), nível de apetite (pouco/moderado/muito), restrições alimentares e objetivos nutricionais
- Geração de cardápio semanal com IA (GPT-4o mini ou Gemini Flash), focado em refeições que podem ser congeladas como marmitas
- Cálculo automático de porções individuais por membro baseado no perfil de apetite, com gramagens exatas por componente (proteína, carboidrato, vegetal)
- Lista de compras consolidada e inteligente, organizada por categoria (Açougue, Hortifruti, Mercearia), com quantidades totais calculadas para a semana
- Guia de montagem de marmitas com instruções passo a passo: quantidade de marmitas por membro, peso por marmita e composição detalhada
- Histórico de planos semanais anteriores e possibilidade de reutilizar ou adaptar cardápios já gerados

## Agentes de IA Disponíveis

- **CardapioGeneratorAgent** — Gerador de cardápios semanais personalizados e cálculo de porções
- **ListaComprasAgent** — Consolidador e organizador da lista de compras semanal
- **GuiaMarmitasAgent** — Gerador de instruções detalhadas de montagem e porcionamento de marmitas
- **CardapioAdaptacaoAgent** — Adaptador de cardápios existentes com base em feedback do usuário

Prompts completos em [docs/03_AI_AGENTS.md](docs/03_AI_AGENTS.md).

## Estimativa

- **Total:** 74 dias (10.6 semanas)
- **Custo Mensal:** USD 28.00 / BRL 159.60

## Arquitetura

O Rotineira segue uma arquitetura mobile-first com backend API dedicado. O app React Native/Expo se comunica exclusivamente via REST API com o backend FastAPI hospedado no Railway. A autenticação e o banco de dados são gerenciados pelo Supabase, que também fornece tokens JWT validados pelo backend. Quando o usuário solicita a geração de um cardápio, o backend enfileira um job assíncrono no Celery (com broker Redis/Upstash), evitando timeout na API enquanto a IA processa. O worker Celery chama a API da OpenAI com o prompt montado pelo LangChain, recebe o JSON estruturado, valida com Pydantic, persiste no PostgreSQL via Supabase e notifica o app via Supabase Realtime ou Push Notification (Expo Notifications). O resultado é exibido em tempo real ao usuário. Cardápios gerados ficam cacheados no Redis por 7 dias para evitar re-geração custosa.
