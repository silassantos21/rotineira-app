# Análise de Custo-Benefício — Rotineira — App de Planejamento de Marmitas com IA

## Resumo Financeiro

| Categoria | Mensal (USD) | Mensal (BRL) |
|-----------|-------------|-------------|
| Infraestrutura | $10.00 | R$ 57.00 |
| APIs Externas | $18.00 | R$ 102.60 |
| **Total Mensal** | **$28.00** | **R$ 159.60** |
| **Setup Inicial** | **$25.00** | **R$ 142.50** |

✅ **Este projeto pode começar com free tier** das ferramentas listadas.

---

## Infraestrutura & Hosting

| Serviço/Item | Mensal (USD) | Setup (USD) | Free Tier | Observações |
|--------------|-------------|------------|-----------|-------------|
| Supabase (banco de dados PostgreSQL + Auth + Storage + Realtime) | $0.00 | $0.00 | ✅ Sim | Free tier inclui: 500MB banco, 50MB storage, 2GB transferência, 50.000 MAU. Plano Pro ($25/mês) quando ultrapassar esses limites. Para os primeiros 6 meses e até ~5.000 usuários, o free tier é viável. |
| Railway (backend FastAPI + Celery Worker) | $10.00 | $0.00 | ✅ Sim | Plano Hobby ($5/mês por serviço). Com FastAPI + Celery worker = 2 serviços = ~$10/mês. Free tier de $5 créditos/mês disponível para testes. Inclui deploy automático via GitHub. |
| Redis Upstash (cache + fila Celery) | $0.00 | $0.00 | ✅ Sim | Plano Free inclui 10.000 comandos/dia e 256MB de dados — suficiente para fase inicial. Pay-as-you-go a partir de $0.2 por 100K comandos quando escalar. |
| Sentry (monitoramento de erros) | $0.00 | $0.00 | ✅ Sim | Plano Free inclui 5.000 errors/mês e 10.000 performance transactions/mês. Mais que suficiente para o MVP. Plano Team ($26/mês) quando ultrapassar. |
| PostHog (analytics de produto) | $0.00 | $0.00 | ✅ Sim | Plano Free inclui 1M eventos/mês — suficiente para os primeiros 12–18 meses de operação. Sem necessidade de upgrade até escalar significativamente. |

## APIs & Serviços Externos

| Serviço/Item | Mensal (USD) | Setup (USD) | Free Tier | Observações |
|--------------|-------------|------------|-----------|-------------|
| OpenAI GPT-4o mini API (geração de cardápios) | $18.00 | $0.00 | ❌ Não | Preço: $0.15/1M tokens input, $0.60/1M tokens output. Estimativa: cada geração completa (cardápio + lista + guia) usa ~8.000 tokens input + ~4.000 tokens output = ~$0.0036/geração. Com 5.000 gerações/mês (usuários Free + Premium): ~$18/mês. Custo escala linearmente com uso. |
| Google Gemini 1.5 Flash API (fallback de IA) | $0.00 | $0.00 | ✅ Sim | Usado apenas como fallback quando OpenAI falha ou está com latência alta. Free tier: 15 RPM, 1M tokens/mês. Em condições normais, custo é $0. Altamente recomendado para disponibilidade. |
| Expo Push Notifications (notificações) | $0.00 | $0.00 | ✅ Sim | Expo Push Notifications é gratuito sem limite de envios. Usa FCM (Android) e APNs (iOS) por baixo. Sem custos adicionais para o volume esperado no MVP. |

## Ferramentas de Desenvolvimento

| Serviço/Item | Mensal (USD) | Setup (USD) | Free Tier | Observações |
|--------------|-------------|------------|-----------|-------------|
| Expo EAS Build (builds mobile iOS/Android) | $0.00 | $0.00 | ✅ Sim | Plano Free do EAS Build inclui 30 builds/mês — suficiente para desenvolvimento. Plano Production ($99/mês) necessário ao escalar para produção com builds prioritários. |
| Conta Apple Developer (App Store) | $8.25 | $0.00 | ❌ Não | Cobrado anualmente: $99/ano (~R$564/ano). Obrigatório para publicar na App Store e usar TestFlight. Calculado como $8.25/mês. |
| Conta Google Play Developer | $0.00 | $25.00 | ❌ Não | Taxa única de $25 para registro na Google Play Console. Sem custos mensais recorrentes após o pagamento inicial. |
| RevenueCat (gerenciamento de assinaturas in-app) | $0.00 | $0.00 | ✅ Sim | Plano Free até $2.500/mês de receita rastreada — suficiente para o lançamento. Plano Starter ($99/mês) quando escalar além disso. Elimina a necessidade de implementar validação de receipts do zero. |

---

## Análise de ROI

Com precificação sugerida de R$19,90/mês (Premium) ou R$99/ano, o breakeven de infraestrutura (~R$160/mês) é atingido com apenas 9 assinantes Premium mensais ou 2 assinantes anuais. A margem de contribuição por assinante é alta: ~R$19,90 - R$0,02 (custo de IA por usuário ativo médio) = R$19,88 de margem. Com 100 assinantes Premium, receita = R$1.990/mês vs. custo infra escalado ~R$500/mês = ROI de 298%. O custo de IA (OpenAI) é o único que escala com uso, mas representa menos de 1% da receita por usuário. Meta de validação: 50 usuários Premium no primeiro trimestre pós-lançamento. Estratégia de crescimento: lojas de apps orgânico + comunidades de Meal Prep no Instagram/TikTok/Facebook. O app pode ser auto-sustentável a partir de R$500/mês de receita bruta.

---

## Notas sobre Escalabilidade de Custos

- Preços baseados em uso inicial (MVP/early stage)
- Custos aumentam com volume de usuários e dados
- Reavalie a stack se atingir 10k+ usuários ativos
- Considere contratos anuais para economias de 20-40%
