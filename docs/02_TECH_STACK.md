# Stack Tecnológica — Rotineira — App de Planejamento de Marmitas com IA

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

---

## Frontend

**Tecnologia Principal:** `React Native com Expo (TypeScript)`

**Complementos:**
- `NativeWind (Tailwind para RN)`
- `React Navigation`
- `Zustand (estado global)`
- `React Query (TanStack)`
- `Expo Notifications`

**Justificativa:** React Native com Expo foi escolhido sobre Flutter por permitir compartilhamento de código com o ecossistema JavaScript/TypeScript do backend Node.js, facilitar onboarding de devs, e ter excelente suporte a publicação nas duas lojas via EAS Build. Expo elimina a necessidade de Xcode/Android Studio para builds iniciais, acelerando o MVP. NativeWind traz a produtividade do Tailwind para o mobile.

## Backend

**Tecnologia Principal:** `FastAPI (Python 3.12)`

**Complementos:**
- `SQLAlchemy 2.0`
- `Pydantic v2`
- `Celery + Redis (tarefas assíncronas de IA)`
- `Alembic (migrations)`

**Justificativa:** FastAPI foi escolhido pela performance assíncrona nativa (essencial para chamadas à API de IA que podem demorar 5–15s), tipagem forte com Pydantic, e excelente suporte a workers assíncronos. Python é a linguagem dominante no ecossistema de IA/ML, facilitando integrações futuras. Celery gerencia as tarefas longas de geração de cardápio sem bloquear a API principal.

## Banco de Dados

**Tecnologia Principal:** `Supabase (PostgreSQL gerenciado)`

**Complementos:**
- `Supabase Auth`
- `Supabase Storage`
- `Supabase Realtime`

**Justificativa:** Supabase foi escolhido por combinar PostgreSQL robusto com Auth, Storage e SDK mobile nativo em uma única plataforma com generoso free tier. Elimina a necessidade de configurar infraestrutura separada de banco de dados e autenticação, reduzindo tempo de MVP. O SDK JavaScript/TypeScript se integra perfeitamente com React Native/Expo.

## Autenticação & Autorização

**Tecnologia Principal:** `Supabase Auth`

**Complementos:**
- `JWT (tokens de sessão)`
- `OAuth2 Google`
- `Apple Sign-In (obrigatório para iOS App Store)`

**Justificativa:** Supabase Auth é integrado ao banco de dados, suporta Row Level Security nativamente e oferece login social (Google, Apple) sem configuração adicional de servidores. Apple Sign-In é obrigatório pela App Store quando há outros provedores OAuth, tornando o suporte nativo do Supabase um diferencial crítico.

## Cache & Sessão

**Tecnologia Principal:** `Redis (Upstash — serverless)`

**Complementos:**
- `React Query (cache client-side)`
- `Supabase Realtime`

**Justificativa:** Upstash Redis serverless é usado para cache de cardápios gerados (evitar re-geração desnecessária e reduzir custos de API), rate limiting de chamadas à IA por usuário/plano, e fila de jobs do Celery. React Query gerencia cache no lado do cliente, evitando refetches desnecessários e melhorando a UX offline.

## Infraestrutura & Deploy

**Tecnologia Principal:** `Railway (backend FastAPI) + Supabase (banco) + Expo EAS (builds mobile)`

**Complementos:**
- `GitHub Actions CI/CD`
- `Docker (containerização do backend)`
- `EAS Build (Expo Application Services)`

**Justificativa:** Railway oferece deploy simples de containers Docker com zero configuração de servidor, ideal para FastAPI + Celery workers. EAS Build da Expo gerencia builds para iOS e Android na nuvem sem necessidade de máquinas locais Mac/Windows. GitHub Actions automatiza testes e deploy contínuo.

## Monitoramento & Observabilidade

**Tecnologia Principal:** `Sentry (erros mobile + backend)`

**Complementos:**
- `Expo Analytics`
- `PostHog (analytics de produto — eventos de uso)`

**Justificativa:** Sentry tem SDK nativo para React Native e Python/FastAPI, capturando crashes mobile e erros de API em um único painel. PostHog rastreia funis de conversão (onboarding → geração de cardápio → upgrade para Premium), essencial para um produto SaaS em fase de crescimento.

## IA / Machine Learning

**Tecnologia Principal:** `OpenAI GPT-4o mini API`

**Complementos:**
- `LangChain (orquestração de prompts)`
- `Gemini 1.5 Flash (fallback)`

**Justificativa:** IA é o coração do produto — responsável pela geração de cardápios, cálculo de porções e listas de compras. GPT-4o mini foi escolhido por oferecer excelente qualidade de saída estruturada (JSON) a custo baixo (~$0.15/1M tokens input), essencial para viabilidade econômica do plano Free. LangChain gerencia o prompt templating, parsing de JSON e retry logic. Gemini Flash é configurado como fallback para alta disponibilidade.

## Comandos de Setup Rápido

```bash
npx create-expo-app@latest . --template blank-typescript
npx expo install nativewind tailwindcss react-native-reanimated
npm install zustand @tanstack/react-query expo-router
```
