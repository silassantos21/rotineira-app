# Arquitetura do Sistema — Rotineira — App de Planejamento de Marmitas com IA

## Visão Geral

O Rotineira segue uma arquitetura mobile-first com backend API dedicado. O app React Native/Expo se comunica exclusivamente via REST API com o backend FastAPI hospedado no Railway. A autenticação e o banco de dados são gerenciados pelo Supabase, que também fornece tokens JWT validados pelo backend. Quando o usuário solicita a geração de um cardápio, o backend enfileira um job assíncrono no Celery (com broker Redis/Upstash), evitando timeout na API enquanto a IA processa. O worker Celery chama a API da OpenAI com o prompt montado pelo LangChain, recebe o JSON estruturado, valida com Pydantic, persiste no PostgreSQL via Supabase e notifica o app via Supabase Realtime ou Push Notification (Expo Notifications). O resultado é exibido em tempo real ao usuário. Cardápios gerados ficam cacheados no Redis por 7 dias para evitar re-geração custosa.

## Diagrama de Arquitetura

```
MOBILE APP (React Native/Expo) → [REST HTTPS] → FASTAPI BACKEND (Railway/Docker): recebe requisição autenticada com JWT do Supabase. FASTAPI → [valida JWT] → SUPABASE AUTH. FASTAPI → [enfileira job] → REDIS/UPSTASH (fila Celery). CELERY WORKER (Railway) → [consome job da fila] → OPENAI GPT-4o mini API: gera cardápio JSON. CELERY WORKER → [valida JSON com Pydantic] → SUPABASE POSTGRESQL: persiste WeeklyPlan. CELERY WORKER → [notifica] → SUPABASE REALTIME → MOBILE APP (exibe resultado). MOBILE APP → [consulta dados] → SUPABASE diretamente via SDK (para leitura de perfil familiar, histórico). SENTRY monitora MOBILE APP + FASTAPI + CELERY WORKER de forma unificada.
```

## Componentes Principais

| Camada | Tecnologia Principal | Complementos |
|--------|---------------------|-------------|
| Frontend | `React Native com Expo (TypeScript)` | `NativeWind (Tailwind para RN)`, `React Navigation`, `Zustand (estado global)`, `React Query (TanStack)` |
| Backend | `FastAPI (Python 3.12)` | `SQLAlchemy 2.0`, `Pydantic v2`, `Celery + Redis (tarefas assíncronas de IA)`, `Alembic (migrations)` |
| Banco de Dados | `Supabase (PostgreSQL gerenciado)` | `Supabase Auth`, `Supabase Storage`, `Supabase Realtime` |
| Autenticação | `Supabase Auth` | `JWT (tokens de sessão)`, `OAuth2 Google`, `Apple Sign-In (obrigatório para iOS App Store)` |
| Cache | `Redis (Upstash — serverless)` | `React Query (cache client-side)`, `Supabase Realtime` |
| Infraestrutura | `Railway (backend FastAPI) + Supabase (banco) + Expo EAS (builds mobile)` | `GitHub Actions CI/CD`, `Docker (containerização do backend)`, `EAS Build (Expo Application Services)` |
| Monitoramento | `Sentry (erros mobile + backend)` | `Expo Analytics`, `PostHog (analytics de produto — eventos de uso)` |
| IA / ML | `OpenAI GPT-4o mini API` | `LangChain (orquestração de prompts)`, `Gemini 1.5 Flash (fallback)` |

## Decisões Arquiteturais

As decisões foram baseadas no briefing do projeto e nas referências fornecidas.
Consulte [02_TECH_STACK.md](02_TECH_STACK.md) para justificativas detalhadas de cada escolha.

## Padrões de Projeto Recomendados

- **Frontend:** Component-driven development com Server Components (Next.js App Router)
- **Backend:** Clean Architecture (Domain → Application → Infrastructure)
- **API:** REST com versionamento (`/api/v1/`) ou tRPC para type-safety full-stack
- **Estado:** Zustand (client state) + React Query / TanStack Query (server state)
- **Testes:** Vitest (unit) + Playwright (E2E)
