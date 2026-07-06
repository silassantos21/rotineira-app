# Cronograma do Projeto — Rotineira — App de Planejamento de Marmitas com IA

## Resumo

| # | Fase | Duração |
|---|------|---------|
| 1 | Fase 1 — Fundação e Infraestrutura | 14 dias |
| 2 | Fase 2 — Core Features: Perfil Familiar e Engine de IA | 21 dias |
| 3 | Fase 3 — Telas de Resultado e Interatividade | 18 dias |
| 4 | Fase 4 — Monetização, Polimento e Publicação | 21 dias |
| | **Total** | **74 dias (10.6 semanas)** |

---

## Detalhamento das Fases

### Fase 1: Fase 1 — Fundação e Infraestrutura (14 dias)

#### Tarefas

- [ ] Configuração do repositório GitHub com monorepo (apps/mobile, apps/backend)
- [ ] Setup do projeto Expo com TypeScript, NativeWind e React Navigation
- [ ] Configuração do projeto FastAPI com estrutura de módulos (auth, family, plans, ai)
- [ ] Setup do Supabase: tabelas User, FamilyProfile, WeeklyPlan com RLS policies
- [ ] Configuração do Redis Upstash e Celery para tarefas assíncronas
- [ ] Setup do Sentry para mobile (React Native SDK) e backend (Python SDK)
- [ ] Implementação do fluxo de autenticação completo: cadastro, login Google, Apple Sign-In, logout
- [ ] Deploy inicial do backend no Railway com Docker Compose (FastAPI + Celery worker)
- [ ] Configuração do GitHub Actions para CI/CD com testes automatizados
- [ ] Definição e implementação dos schemas Pydantic para FamilyProfile e WeeklyPlan

#### Entregáveis

- App React Native funcional com fluxo de autenticação (login/cadastro/logout) rodando em dispositivo físico
- Backend FastAPI deployado no Railway com endpoints de health check e autenticação JWT validada
- Banco Supabase configurado com todas as tabelas, RLS policies e migrations versionadas
- Pipeline CI/CD funcional com testes rodando a cada PR

---

### Fase 2: Fase 2 — Core Features: Perfil Familiar e Engine de IA (21 dias)

#### Tarefas

- [ ] Desenvolvimento da Tela 1: CRUD completo de membros da família (criar, editar, deletar)
- [ ] Implementação dos componentes: toggle de apetite 3 estados, checkboxes de restrições, cards de membros
- [ ] Validação de perfil mínimo antes de permitir geração de cardápio
- [ ] Integração com API da OpenAI via LangChain: CardapioGeneratorAgent com prompt template dinâmico
- [ ] Implementação do job assíncrono Celery: enfileiramento → processamento → persistência → notificação
- [ ] Integração com Supabase Realtime para atualização em tempo real do status de geração no app
- [ ] Implementação do ListaComprasAgent: consolidação e organização por categoria
- [ ] Implementação do GuiaMarmitasAgent: cálculo de porções com multiplicadores de apetite
- [ ] Persistência do WeeklyPlan completo no banco de dados (cardápio + lista + guia)
- [ ] Testes unitários dos agentes de IA com fixtures de perfis variados
- [ ] Cache Redis de cardápios gerados (TTL 7 dias) para evitar re-geração desnecessária
- [ ] Tratamento de erros e fallback para Gemini Flash quando OpenAI falha

#### Entregáveis

- Tela de perfil familiar completa e funcional com persistência no Supabase
- Fluxo completo de geração de cardápio com IA: do clique no botão ao resultado exibido no app (< 30s)
- Engine de IA com 3 agentes integrados (Cardápio, Lista de Compras, Guia de Marmitas)
- Loading state com feedback visual enquanto a IA processa (progress indicator + mensagens animadas)

---

### Fase 3: Fase 3 — Telas de Resultado e Interatividade (18 dias)

#### Tarefas

- [ ] Desenvolvimento da Tela 2: Tab Bar Cardápio ↔ Lista de Compras
- [ ] Cards por dia da semana com refeições expandíveis e ícone de marmita 🍱
- [ ] Seção Guia de Montagem com gramagens por membro (layout detalhado conforme wireframe)
- [ ] Botão 'Ver Passo a Passo do Preparo' com modal/sheet de instruções
- [ ] Desenvolvimento da Tela 3: Lista de Compras com checkboxes por item
- [ ] Organização visual por categoria (Açougue/Hortifruti/Mercearia) com headers destacados
- [ ] Persistência local do estado dos checkboxes (AsyncStorage) para uso offline durante compras
- [ ] Histórico de planos semanais anteriores (tela de histórico com listagem e acesso rápido)
- [ ] Funcionalidade de compartilhar lista de compras via WhatsApp/nativo (Share API)
- [ ] Animações de transição entre telas com React Native Animated/Reanimated
- [ ] Implementação da paleta de cores definitiva: Verde Oliva + Branco/Cinza + Laranja Suave
- [ ] Tipografia Poppins integrada via Expo Google Fonts

#### Entregáveis

- Telas 2 e 3 completamente implementadas e funcionais com dados reais da IA
- Lista de compras com checkboxes funcionais e persistência offline
- Funcionalidade de compartilhamento de lista via apps nativos
- App com identidade visual completa (cores, tipografia, ícones) alinhada ao briefing

---

### Fase 4: Fase 4 — Monetização, Polimento e Publicação (21 dias)

#### Tarefas

- [ ] Implementação do sistema de planos: Free (1 geração/semana, 3 membros) e Premium (ilimitado)
- [ ] Integração com RevenueCat para gerenciamento de assinaturas in-app (Google Play + App Store)
- [ ] Tela de upgrade para Premium com comparativo de planos e CTA
- [ ] Rate limiting por plano no backend (middleware FastAPI)
- [ ] Implementação de Expo Push Notifications: notificação quando cardápio estiver pronto
- [ ] Onboarding de 3 telas (slides) para usuários novos explicando o fluxo do app
- [ ] Tela de configurações: editar conta, gerenciar assinatura, logout, política de privacidade
- [ ] Testes end-to-end com Detox em fluxos críticos: cadastro → perfil → geração → lista de compras
- [ ] Otimização de performance: lazy loading, memo, virtualização de listas longas
- [ ] Preparação dos assets para publicação: ícones (1024x1024), splash screen, screenshots das lojas
- [ ] Submissão para Google Play (Internal Testing) e App Store (TestFlight)
- [ ] Configuração do PostHog para rastreamento de eventos de conversão
- [ ] Documentação técnica: README, variáveis de ambiente, guia de deploy

#### Entregáveis

- Sistema de assinatura Premium funcional via RevenueCat com receipts validados no backend
- App publicado no Google Play (Internal Testing) e TestFlight para testes com usuários reais
- Suite de testes E2E cobrindo os 3 fluxos principais do MVP
- Dashboard PostHog com funil de conversão Free → Premium configurado

---

## Premissas

- Time de 1–2 desenvolvedores full-stack com experiência em React Native e Python
- Aprovação na App Store pode levar 3–7 dias adicionais (revisão humana da Apple) — não incluído nos 74 dias
- Conta de desenvolvedor Apple ($99/ano) e Google Play ($25 único) já adquiridas antes do início
- Conteúdo de marketing, copywriting e assets de branding (logo final) fornecidos pelo cliente
- Testes com usuários reais durante Fase 4 podem gerar retrabalho de 10–15% nas telas de resultado
- A API da OpenAI pode ter latência variável (5–20s por geração) — UX de loading deve ser robusta
- RevenueCat tem processo de configuração com Apple/Google que pode levar 2–3 dias adicionais
