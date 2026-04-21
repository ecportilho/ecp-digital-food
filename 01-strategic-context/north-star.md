# North Star Metric — FoodFlow

> Produto: **FoodFlow** (ECP Food) — Marketplace de delivery premium
> Fase: **01 — Contexto Estratégico**
> Versão: **2026-04-20**
> Skill aplicada: `pm-north-star-definer`

---

## 1. Definição

**Nome da North Star:** **Pedidos Completados com Satisfação por Semana (PCSS)**

**Definição curta:** Número de pedidos entregues com sucesso, sem cancelamento e sem reclamação aberta nas 48h seguintes à entrega, contabilizados por semana ativa.

**Por que esta métrica:**
A North Star captura simultaneamente os quatro vetores que definem a tese de valor do FoodFlow:
- **Aquisição** (pedidos novos entrando no funil),
- **Retenção** (pedidos recorrentes de consumidores ativos),
- **Qualidade operacional** (ausência de cancelamento — checkout, pagamento e logística funcionaram),
- **Satisfação** (ausência de reclamação aberta — o consumidor ficou bem servido).

Um PCSS só é contabilizado quando **toda a cadeia de valor funciona**: descoberta → checkout → pagamento (ECP Pay ou ecp-digital-bank) → preparo → entrega. Se qualquer elo falhar, o pedido não entra no numerador — o que mantém a métrica honesta.

---

## 2. Fórmula

```
PCSS(semana) = Σ pedidos com:
                orders.status = 'delivered'
                AND NOT EXISTS(reclamacao_aberta WHERE ticket.created_at <= pedido.delivered_at + 48h)
                AND pedido.delivered_at ∈ [início_semana, fim_semana]
```

**Unidade:** pedidos/semana (inteiro).

**Janela temporal:** semana ISO (segunda a domingo, horário America/Sao_Paulo).

**Exclusões explícitas:**
- Status `pending_payment`, `payment_failed`, `confirmed`, `preparing`, `out_for_delivery`, `cancelled` **não** contam (apenas `delivered`).
- Pedidos com chargeback ou estorno processado **não** contam.
- Pedidos de contas de teste/QA (flag `is_test_account`) **não** contam.

---

## 3. Baseline

| Situação | Valor |
|----------|-------|
| Baseline hoje (pré-lançamento, MVP sem tráfego público) | **0 pedidos/semana** |
| Seed de dados atual | 6 restaurantes, 47 menu items, 11 consumidores seed — sem tráfego real |

A baseline é zero porque o produto ainda não possui usuários em produção; a seed serve apenas para demonstração e QA, não gera pedidos reais que devam compor a série histórica.

---

## 4. Targets

| Horizonte | Meta PCSS | Equivalente diário | Premissa de funil |
|-----------|-----------|--------------------|-------------------|
| **MVP (0-3 meses)** | **≥ 630 / semana** | ~90 pedidos/dia | Conversão ≥ 8%, ticket ≥ R$ 45, 50 restaurantes ativos |
| **Ano 1 (12 meses)** | **≥ 6.300 / semana** | ~900 pedidos/dia | Retomada ≥ 25%, restaurantes ativos ≥ 200, GMV ≥ R$ 1,2 M/mês |
| **Visão 3-5 anos** | Referência em delivery premium em SP e capitais (não quantificada aqui) | — | — |

A meta MVP de 90/dia representa o ponto a partir do qual a unit economics começa a se validar, dado comissão de 15% e ticket ≥ R$ 45.

---

## 5. Cadência de Medição

| Dimensão | Cadência |
|----------|----------|
| Coleta do dado bruto | Tempo real (via `orders.updated_at` + webhook confirmando `delivered`) |
| Agregação semanal (PCSS) | **Toda segunda-feira às 09:00 (BRT)** — fecha a semana ISO anterior |
| Revisão de tendência | **Semanal** — ritual de produto com PM + Operations + stakeholders |
| Re-calibração da meta | **Trimestral** — revisão no fim de cada fase |

---

## 6. Input Metrics (métricas que movem a North Star)

As métricas abaixo são os *drivers* diretos da North Star — cada uma está mapeada a um ou mais KRs na seção de OKRs (`okrs.md`).

| Input Metric | Relação com a North Star | Target MVP | Frequência |
|--------------|--------------------------|------------|------------|
| **Taxa de Conversão (Visitor-to-Order)** | Mais conversões → mais pedidos completados | ≥ 8% | Semanal |
| **Ticket Médio por Pedido** | Ticket saudável indica valor percebido | ≥ R$ 45 | Semanal |
| **Taxa de Recompra em 30 dias** | Recompra é o principal driver sustentável do PCSS | ≥ 25% | Mensal |
| **Tempo até Primeiro Pedido** | Menor fricção → maior conversão de novos | ≤ 5 min | Semanal |
| **Restaurantes Ativos com Pedidos na Semana** | Mais oferta → mais descoberta → mais pedidos | ≥ 50 (MVP) / ≥ 200 (ano 1) | Semanal |
| **NPS do Consumidor** | NPS alto correlaciona com recompra orgânica e word-of-mouth | ≥ 40 | Mensal (a partir do 3º pedido) |

---

## 7. Counter Metrics (métricas de proteção)

Monitoradas para evitar que o PCSS cresça à custa de saúde do produto.

| Counter Metric | Risco que monitora | Limite aceitável |
|----------------|--------------------|------------------|
| **Taxa de pedidos cancelados** | Crescimento artificial via promoções que depois falham | < 8% dos pedidos criados |
| **Taxa de reclamação aberta / pedidos entregues** | Satisfação comprometida | < 3% |
| **Comissão efetiva paga ao restaurante** | Pressão sobre restaurantes (risco de churn de oferta) | Mantida em 85/15 (restaurante/plataforma) |
| **% de pedidos com cupom aplicado** | Ticket inflado artificialmente por subsídio | < 40% |
| **Tempo médio de entrega** | Qualidade operacional erodindo | < 45 min (seed atual: 25-40 min declarados) |

---

## 8. Instrumentação Técnica Necessária

Derivada da `tech_spec.md`:

- **Fonte do numerador:** `orders.status = 'delivered'` (estado final implementado em `order.service.mjs`).
- **Tabela de reclamações:** **não existe hoje** — será necessário criar `complaints` (ou reusar um campo em `orders`) na Fase 02/03 para permitir o filtro de "sem reclamação aberta em 48h". Enquanto isso, proxy por feedback qualitativo.
- **Exportação semanal:** query SQLite pode rodar direto sobre `foodflow.db` até que surja um pipeline de analytics. Agendador a definir (cron Node ou task scheduler do VPS).
- **Dashboard:** `/admin/dashboard` já agrega métricas básicas (`GET /api/admin/dashboard`) — estender para incluir PCSS semanal é um follow-up de baixo custo.

---

## 9. Relação com a Visão de Produto

> **Visão (5 anos):** "FoodFlow será a plataforma de referência para quem busca experiências gastronômicas por delivery em São Paulo e nas principais capitais do Brasil — reconhecida pela curadoria impecável de restaurantes artesanais, pela experiência de descoberta que encanta, e por um ecossistema de pagamento integrado que torna pedir comida tão prazeroso quanto comer."

A North Star **PCSS** é o termômetro único que traduz essa visão em número: cada ponto do PCSS é uma prova de que a proposta de valor se concretizou — um consumidor descobriu, pediu, recebeu e ficou satisfeito o suficiente para não reclamar.

---

## 10. Checklist de validação da North Star

- [x] É uma métrica *output*, não *input* (mede resultado, não atividade).
- [x] É acionável pelo time (cada KR move algum componente dela).
- [x] É compreensível por qualquer stakeholder em uma frase.
- [x] É mensurável com a instrumentação atual (ou com instrumentação viável a curto prazo).
- [x] Captura simultaneamente aquisição, retenção, qualidade e satisfação.
- [x] Está ligada diretamente à visão de produto de 3-5 anos.
