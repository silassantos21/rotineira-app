# Rotineira — App de Planejamento de Marmitas com IA

> O Rotineira é um aplicativo mobile multiplataforma (Android/iOS) que usa inteligência artificial para resolver a sobrecarga mental de planejar refeições semanais em família. O app gera cardápios personalizados, calcula porções exatas por membro da família conforme apetite e restrições, e produz listas de compras consolidadas e guias de montagem de marmitas com gramagens detalhadas.

**Tipo de Projeto:** `mobile_app`
**Gerado em:** 01/07/2026 13:29
**Estimativa Total:** 74 dias (10.6 semanas)
**Custo Mensal Estimado:** USD 28.00 / BRL 159.60

---

## Problema que Resolve

Famílias brasileiras, especialmente mães e pais com rotina corrida, perdem horas semanais planejando o que cozinhar, calculando quantidades de ingredientes para diferentes membros e organizando compras — resultando em desperdício de alimentos, gastos desnecessários e estresse. Não existe uma solução acessível que combine planejamento familiar personalizado com inteligência artificial para meal prep de marmitas.

## Público-Alvo

Mães e pais entre 25–45 anos, com filhos em casa, rotina intensa de trabalho e interesse em alimentação saudável e organizada. Pessoas que já fazem ou querem começar a fazer marmitas semanais (meal prep). Público brasileiro, familiarizado com apps mobile e disposto a pagar por conveniência doméstica.

## Funcionalidades Principais

- Cadastro de perfil familiar com múltiplos membros (adulto/criança), nível de apetite (pouco/moderado/muito), restrições alimentares e objetivos nutricionais
- Geração de cardápio semanal com IA (GPT-4o mini ou Gemini Flash), focado em refeições que podem ser congeladas como marmitas
- Cálculo automático de porções individuais por membro baseado no perfil de apetite, com gramagens exatas por componente (proteína, carboidrato, vegetal)
- Lista de compras consolidada e inteligente, organizada por categoria (Açougue, Hortifruti, Mercearia), com quantidades totais calculadas para a semana
- Guia de montagem de marmitas com instruções passo a passo: quantidade de marmitas por membro, peso por marmita e composição detalhada
- Histórico de planos semanais anteriores e possibilidade de reutilizar ou adaptar cardápios já gerados
- Plano Free (1 geração/semana, até 3 membros) e Premium (gerações ilimitadas, até 10 membros, histórico completo)

## Diferenciais

- Cálculo proporcional de porções por membro da família com base em apetite e perfil — nenhum concorrente direto oferece isso com IA
- Foco 100% em meal prep de marmitas congeláveis, entregando gramagens exatas e não apenas sugestões genéricas de receitas
- Lista de compras consolidada gerada automaticamente, eliminando cálculos manuais e desperdício de ingredientes
- Onboarding familiar progressivo e acessível, desenhado para usuários não-técnicos com linguagem amigável e visual limpo

## Escopo do MVP (Mínimo Produto Viável)

- [ ] Autenticação completa (e-mail/senha + Google) com Supabase Auth
- [ ] Cadastro e gestão de perfil familiar: até 3 membros (Free), com nome, tipo, apetite e restrições
- [ ] Geração de cardápio semanal com IA (GPT-4o mini) para marmitas congeláveis — 1 geração/semana no plano Free
- [ ] Tela de resultado do cardápio com Tab Bar entre Cardápio e Lista de Compras
- [ ] Guia de montagem de marmitas com gramagens calculadas por membro
- [ ] Lista de compras organizada por categoria com checkboxes funcionais e persistência offline
- [ ] Compartilhamento de lista de compras via WhatsApp/apps nativos
- [ ] Push Notification quando o cardápio estiver pronto (processamento assíncrono)
- [ ] Tela de upgrade para Premium com RevenueCat integrado (assinatura mensal/anual)
- [ ] Histórico dos últimos 3 planos semanais

## Funcionalidades Futuras (v2+)

- CardapioAdaptacaoAgent: edição de cardápio gerado por linguagem natural ('troque o frango por atum') sem re-geração completa
- Integração com apps de lista de compras (Bring!, AnyList) via API ou share intent
- Modo 'Geladeira Vazia': usuário informa ingredientes disponíveis e IA gera cardápio com o que tem
- Cálculo de custo estimado da lista de compras com integração a preços regionais
- Receitas detalhadas com modo passo a passo e timer integrado para cada etapa de preparo
- Integração com Apple Health / Google Fit para sincronização de objetivos calóricos
- Plano Família Premium: múltiplas famílias/lares (ex: para nutricionistas que atendem vários clientes)
- Geração de etiquetas para marmitas (nome do membro, data, validade) para impressão via Bluetooth
- Versão web (Next.js) como companion do app mobile para usuários que preferem planejar no desktop
- Comunidade in-app: compartilhar e descobrir cardápios públicos de outros usuários

## Riscos Identificados

- Risco técnico — Latência da API de IA (5–20s): A geração assíncrona com Celery mitiga timeouts de API, mas o usuário pode abandonar o app enquanto aguarda. Mitigação: loading screen animada e engajante com dicas de meal prep, e push notification quando pronto para o usuário fechar o app.
- Risco técnico — Qualidade e consistência do output da IA: O GPT-4o mini pode ocasionalmente retornar JSON malformado ou cardápios nutricionalmente desequilibrados. Mitigação: validação rígida com Pydantic, até 3 retentativas automáticas com prompt refinado, e fallback para Gemini Flash. Monitorar via Sentry a taxa de falhas de parsing.
- Risco de negócio — Aprovação nas lojas de apps: Apple e Google podem rejeitar o app por questões de privacidade (dados de saúde da família) ou monetização. Mitigação: seguir rigorosamente as Human Interface Guidelines da Apple, usar Apple Sign-In, exibir Política de Privacidade clara e não classificar o app como aplicativo médico.
- Risco de negócio — Custo de IA escalando com usuários gratuitos: Se o número de usuários Free crescer muito, o custo de IA pode superar a receita Premium. Mitigação: limite rígido de 1 geração/semana no plano Free (rate limiting no backend), e cache de 7 dias impedindo re-geração do mesmo plano.
- Risco técnico — Responsividade em diferentes tamanhos de tela Android: A fragmentação do Android (400+ tamanhos de tela) pode quebrar o layout do Guia de Marmitas com gramagens detalhadas. Mitigação: testes em pelo menos 5 dispositivos Android reais ou via BrowserStack (Pixel 4, Samsung Galaxy S21, Moto G), e uso de ScrollView com flex consistente.
- Risco de negócio — Concorrência de apps genéricos de receitas (Tasty, Mealime): Usuários podem não perceber o diferencial do cálculo por membro familiar. Mitigação: comunicar claramente o diferencial de 'porção por pessoa' nas screenshots da loja e no onboarding.

## Resumo das Referências Analisadas

As 3 telas de protótipo ASCII fornecidas definiram com precisão a arquitetura de informação do app e as principais decisões de UX. Da Tela 1, extraímos: o padrão de toggle de apetite com 3 estados como componente central da configuração, o modelo de cards expandíveis por membro familiar com CRUD completo, e o CTA primário 'Gerar Cardápio com IA' como ação mais destacada da tela. Da Tela 2, o insight mais valioso foi a estrutura de dados concreta das porções por membro (ex: '6 marmitas × 350g = 150g carne + 120g arroz + 80g cenoura' para adulto, e proporções reduzidas para criança), que revelou a lógica dos multiplicadores de apetite implementada no CardapioGeneratorAgent e GuiaMarmitasAgent. O Tab Bar fixo entre Cardápio e Lista de Compras foi confirmado como padrão de navegação principal. Da Tela 3, a organização por categorias de supermercado (Açougue/Hortifruti/Mercearia) com checkboxes foi incorporada diretamente ao ListaComprasAgent como requisito de output. A paleta de cores do briefing (Verde Oliva + Branco/Cinza + Laranja Suave) e a tipografia Poppins foram incorporadas ao design system. A estética ASCII dos wireframes confirmou preferência por layouts limpos, com muito espaço em branco e hierarquia tipográfica clara — diretriz aplicada no NativeWind/Tailwind design tokens do projeto.
