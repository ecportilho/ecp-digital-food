# OKRs — FoodFlow

> Produto: **FoodFlow** (ECP Food)
> Fase: **01 — Contexto Estratégico**
> Versão: **2026-04-20**
> Período de validade: **Q2-Q3 2026** (6 meses)
> Skill aplicada: `pm-okr-writer`

---

## Objective

> **Validar que FoodFlow entrega uma experiência de food delivery premium que consumidores preferem sobre incumbentes e que restaurantes artesanais adotam como canal principal em São Paulo.**

**Por que este objetivo:**
O MVP descrito em `product_briefing_spec.md` já implementou a cadeia completa de valor (descoberta → carrinho → checkout multi-método → pedido → assistente IA). O que ainda não foi provado é se **consumidores premium migram** e se **restaurantes artesanais adotam**. O Objective é deliberadamente de validação, não de crescimento — antes de escalar, precisamos evidência de product-market fit em ambos os lados do marketplace.

**Horizonte:** 2 trimestres (Q2-Q3 2026), revisado na Fase 04 do ciclo.

**Foco geográfico:** bairros-alvo de São Paulo (Pinheiros, Vila Madalena, Itaim Bibi, Moema, Vila Mariana — a detalhar em OQ4).

---

## Key Results

Todos os KRs são **outcome-based** (não descrevem solução). Cada um tem baseline, target, método de medição e ligação explícita com a North Star (`north-star.md`) e com a OST (`ost.md`).

### KR1 — Conversão Visitor-to-Order ≥ 8%

> **Atingir e sustentar taxa de conversão (visitor-to-order) ≥ 8% por 4 semanas consecutivas**, provando que a experiência de descoberta e checkout converte visitantes em compradores.

| Campo | Valor |
|-------|-------|
| **Métrica** | `sessões únicas com pelo menos 1 pedido entregue / sessões únicas totais` |
| **Baseline** | **0%** (produto sem tráfego público) |
| **Target** | **≥ 8%** por 4 semanas seguidas |
| **Unidade** | Percentual |
| **Cadência** | Semanal |
| **Método de medição** | Analytics de sessão (a instrumentar na Fase 03/04) cruzado com `orders.status = 'delivered'` |
| **Liga com North Star** | Input metric direto — maior conversão é multiplicador direto do PCSS |
| **Branch da OST** | Outcome-A: *Visitantes concluem um pedido com confiança e sem fricção* |
| **Risco / assunção** | A1 (consumidores migram), A3 (fluxo de pagamento não adiciona fricção), A7 (web responsiva basta) |
| **Leading indicators** | Taxa de adição ao carrinho ≥ 25%; abandono de carrinho < 60%; tempo até 1ª adição < 2 min |

---

### KR2 — Recompra em 30 dias ≥ 25%

> **Alcançar taxa de recompra em 30 dias ≥ 25%**, provando que a experiência forma hábito e que o consumidor volta ao FoodFlow.

| Campo | Valor |
|-------|-------|
| **Métrica** | `consumidores únicos com ≥ 2 pedidos entregues em janela de 30 dias corridos / consumidores únicos com pelo menos 1 pedido entregue na janela` |
| **Baseline** | **0%** |
| **Target** | **≥ 25%** |
| **Unidade** | Percentual |
| **Cadência** | Mensal (com snapshot semanal para acompanhamento) |
| **Método de medição** | Query em `orders` agrupada por `user_id`; cohort D0/D30 sobre a data do primeiro pedido |
| **Liga com North Star** | Recompra é o driver mais barato e sustentável do PCSS — usuário recorrente reduz CAC efetivo |
| **Branch da OST** | Outcome-B: *Consumidores retornam sem precisar redescobrir a plataforma* |
| **Risco / assunção** | A1 (migração do iFood), A4 (percepção premium), A6 (seed convence até chegar dado real) |
| **Leading indicators** | Retorno em 7 dias ≥ 40%; média ≥ 2 restaurantes favoritados por usuário; uso de "Repetir Pedido" ≥ 15% dos pedidos |

---

### KR3 — Ticket Médio ≥ R$ 45

> **Atingir ticket médio ≥ R$ 45 por pedido concluído**, validando que o posicionamento premium e a qualidade percebida dos restaurantes parceiros justificam valor maior que a média do mercado.

| Campo | Valor |
|-------|-------|
| **Métrica** | `Σ orders.total (status = delivered) / count(orders delivered)` em janela semanal |
| **Baseline** | **0** (sem pedidos reais) / **Benchmark de mercado:** ~R$ 35-40 (estimativa ABRASEL) |
| **Target** | **≥ R$ 45** |
| **Unidade** | BRL |
| **Cadência** | Semanal |
| **Método de medição** | SQL direto sobre `orders.total`. Regra de negócio existente: frete grátis ≥ R$ 120 (ver `order.service.mjs`) |
| **Liga com North Star** | Ticket saudável sustenta unit economics e viabiliza margem para manter comissão 15% (85% restaurante) |
| **Branch da OST** | Outcome-C: *Consumidores montam pedidos completos e percebem valor justificando o preço* |
| **Risco / assunção** | A2 (restaurantes aceitam o canal), A4 (premium sem parecer elitista) |
| **Leading indicators** | Itens médios por pedido ≥ 2,5; % pedidos com cupom < 40%; mediana de preço do top-50 itens > R$ 22 |

---

### KR4 — 50+ Restaurantes Artesanais Ativos na Semana

> **Onboardar e manter 50+ restaurantes artesanais ativos (com ≥ 1 pedido entregue nos últimos 7 dias) ao final do 3º mês**, validando product-market fit do lado da oferta.

| Campo | Valor |
|-------|-------|
| **Métrica** | `count(distinct restaurants.id onde existe order_item em orders.status = 'delivered' nos últimos 7 dias)` |
| **Baseline** | **6** (seed atual no banco — Pasta & Fogo, Sushi Wave, Burger Lab, Green Bowl Co., Pizza Club 24h, Brasa & Lenha — sem pedidos reais) |
| **Target** | **≥ 50** ao final do 3º mês, sustentados |
| **Unidade** | restaurantes ativos |
| **Cadência** | Semanal |
| **Método de medição** | Query agregada sobre `restaurants` + `order_items` + `orders` (status delivered) |
| **Liga com North Star** | Mais restaurantes ativos = mais oferta = mais descoberta = mais PCSS |
| **Branch da OST** | Outcome-D: *Restaurantes artesanais adotam o FoodFlow como canal com volume recorrente e condições justas* |
| **Risco / assunção** | A2 (willingness-to-pay de 10-18% comissão), A5 (massa crítica em 3 meses em bairros-alvo) |
| **Leading indicators** | Restaurantes cadastrados (total) ≥ 80 (taxa de ativação esperada ~60%); tempo médio de onboarding < 7 dias; itens no cardápio por restaurante ≥ 15 |

---

### KR5 — NPS do Consumidor ≥ 40

> **Obter NPS ≥ 40 entre consumidores que fizeram ao menos 3 pedidos**, confirmando que a experiência premium é percebida e recomendada.

| Campo | Valor |
|-------|-------|
| **Métrica** | NPS = % Promotores (9-10) − % Detratores (0-6), medido via survey in-app |
| **Baseline** | **Não medido** (sem usuários reais) |
| **Target** | **≥ 40** |
| **Unidade** | Score (−100 a +100) |
| **Cadência** | Mensal; survey disparada após o 3º pedido entregue |
| **Método de medição** | In-app survey (a implementar — **não existe na codebase atual**) |
| **Liga com North Star** | NPS alto correlaciona com recompra orgânica e word-of-mouth — drivers sustentáveis do PCSS |
| **Branch da OST** | Outcome-B (recompra) e Outcome-A (confiança na jornada) |
| **Risco / assunção** | A4 (percepção premium), A1 (valor percebido vs. iFood) |
| **Leading indicators** | Taxa de resposta do survey ≥ 20%; menções positivas em support; absence de reclamações por pedido < 3% |

---

## Mapa KR ↔ North Star ↔ OST

| KR | Driver direto do PCSS | Outcome raiz na OST |
|----|----------------------|---------------------|
| KR1 — Conversão ≥ 8% | Aquisição | Outcome-A |
| KR2 — Recompra ≥ 25% | Retenção | Outcome-B |
| KR3 — Ticket ≥ R$ 45 | Valor por pedido / Unit economics | Outcome-C |
| KR4 — 50+ restaurantes ativos | Oferta disponível | Outcome-D |
| KR5 — NPS ≥ 40 | Satisfação (componente do numerador PCSS) | Outcome-A + Outcome-B |

---

## Regras de Escrita dos KRs Aplicadas

- [x] **Measurable** — todo KR tem métrica, baseline e target numérico.
- [x] **Time-bound** — horizonte Q2-Q3 2026 declarado; cadência de medição explícita.
- [x] **Outcome-based** — nenhum KR diz "lançar X" ou "implementar Y". Descrevem resultado no mundo.
- [x] **Independente de solução** — candidatos para mover cada KR vivem na OST, não aqui.
- [x] **Conectado à North Star** — cada KR é input direto de PCSS.
- [x] **Conectado à OST** — cada KR aponta para pelo menos um outcome raiz (ver `ost.md`).

---

## Assunções Críticas Vinculadas (de `phase-01-output.json`)

| ID | Assunção | Risco | KRs impactados |
|----|----------|-------|----------------|
| A1 | Consumidores 22-40 A/B migram do iFood por UX superior | Alto | KR1, KR2, KR5 |
| A2 | Restaurantes artesanais adotam canal novo por menor comissão + controle | Alto | KR4 |
| A3 | Integração ecp-digital-bank + ECP Pay não adiciona fricção | Médio | KR1 |
| A4 | Midnight Express é percebido como aspiracional, não elitista | Médio | KR1, KR2, KR5 |
| A5 | Massa crítica em 3 meses operando bairros-alvo de SP | Alto | KR1, KR4 |
| A7 | Web responsiva (sem app nativo) compete com iFood em mobile | Médio | KR1, KR2 |

**Cada assunção de risco alto ou médio precisa de plano de validação explícito na Fase 02 (Discovery).**

---

## Perguntas Abertas (bloqueadoras ou moderadoras)

| ID | Pergunta | KRs afetados | Prioridade |
|----|----------|--------------|------------|
| OQ1 | Modelo de comissão definitivo para restaurantes | KR4 | Alta |
| OQ2 | Tamanho da base ecp-digital-bank em SP | KR1 | Alta |
| OQ3 | Meios de pagamento para não-correntistas ecp-digital-bank | KR1 | Alta |
| OQ4 | Bairros-alvo priorizados no lançamento | KR1, KR4 | Média |
| OQ5 | Modelo operacional de entrega no MVP | KR1, KR2 | Alta |
| OQ6 | Budget de aquisição (subsídios, cupons, comissão zero inicial) | KR4 | Média |

Estas questões serão retomadas no HITL #1 e, se não respondidas, viram hipóteses de Discovery na Fase 02.
