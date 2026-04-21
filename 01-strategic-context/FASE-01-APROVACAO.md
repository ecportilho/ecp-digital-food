# Fase 01 — Contexto Estratégico — Documento de Aprovação

**Produto:** FoodFlow (ECP Food)
**Data:** 2026-04-20
**Fase:** 01 — Contexto Estratégico
**Status:** Aguardando aprovação HITL #1
**Sessão:** `ecp-digital-food-2026-04-21-0008`

---

## Resumo Executivo

O Product Manager executou a Fase 01 e produziu a visão estratégica do FoodFlow — marketplace de delivery premium focado em restaurantes artesanais na Grande São Paulo. A North Star é **Pedidos Completados com Satisfação por Semana (PCSS)**, métrica que captura simultaneamente aquisição, retenção, qualidade operacional e satisfação do consumidor. Um Objective único de validação sustenta 5 Key Results outcome-based (conversão, recompra, ticket, oferta ativa, NPS), cada um ligado explicitamente à North Star e a outcomes da OST. A árvore de oportunidades contém 5 outcomes, 19 opportunities e 27 experimentos candidatos — input já estruturado para a Fase 02 (Discovery). A análise de mercado dimensiona TAM R$ 75 bi / SAM R$ 12 bi / SOM R$ 18 mi em 12-18 meses, compara concorrência (iFood, Rappi, Uber Eats, delivery próprio via WhatsApp) e identifica 3 trends macro relevantes (premiumização de delivery, crescimento de nichos artesanais, integração fintech-comércio).

A fase é coerente com o briefing (`00-specs/atualizada/product_briefing_spec.md`) e com o stack implementado (`tech_spec.md`). Nenhuma inconsistência crítica foi detectada entre estratégia e capacidade técnica atual. Há 6 perguntas abertas (OQ1–OQ6) e 7 assunções críticas que precisam de validação na Fase 02.

---

## Objetivos da Fase

- [x] Definir North Star Metric — **Concluído**
- [x] Escrever Objective + Key Results — **Concluído** (1 O, 5 KR)
- [x] Construir Opportunity Solution Tree — **Concluído** (5 outcomes, 19 opportunities, 27 experimentos)
- [x] Analisar mercado (TAM/SAM/SOM, concorrência, trends) — **Concluído** (entregue além do mínimo)
- [x] Mapear assunções críticas e perguntas abertas — **Concluído** (7 assunções, 6 OQs)

---

## Entregas Realizadas

| # | Entrega | Arquivo | Status | Observações |
|---|---------|---------|--------|-------------|
| 1 | North Star Metric | `01-strategic-context/north-star.md` | Completo | PCSS com fórmula, baseline, targets MVP/Ano 1, input + counter metrics |
| 2 | OKRs | `01-strategic-context/okrs.md` | Completo | 1 Objective + 5 KRs outcome-based com baseline, target, cadência, método |
| 3 | Opportunity Solution Tree | `01-strategic-context/ost.md` | Completo | 5 outcomes mapeados 1:1 com os KRs; 19 opportunities; 27 experimentos |
| 4 | Market Analysis | `01-strategic-context/market-analysis.md` | Completo | TAM/SAM/SOM, competitive landscape, trends — entrega opcional realizada |

---

## Evidências e Artefatos

### North Star — `north-star.md`
- Métrica: **PCSS (Pedidos Completados com Satisfação por Semana)**
- Fórmula: `orders.status='delivered' AND NOT EXISTS(reclamação em 48h)` — agregada por semana ISO America/Sao_Paulo
- Baseline: 0 / Target MVP: ≥ 630/semana (~90/dia) / Target Ano 1: ≥ 6.300/semana (~900/dia)
- 6 input metrics identificadas (conversão, ticket, recompra 30d, tempo até 1º pedido, restaurantes ativos, NPS)
- 5 counter metrics de proteção (cancelamento, reclamação, comissão, % cupom, tempo entrega)
- Gap de instrumentação: tabela `complaints` ainda não existe — endereçar na Fase 03

### OKRs — `okrs.md`
- **Objective:** Validar experiência premium com consumidores E adoção por restaurantes artesanais em SP
- **KR1:** Conversão Visitor-to-Order ≥ 8% por 4 semanas seguidas
- **KR2:** Recompra em 30d ≥ 25%
- **KR3:** Ticket médio ≥ R$ 45
- **KR4:** 50+ restaurantes artesanais ativos no 3º mês
- **KR5:** NPS ≥ 40 entre clientes com ≥ 3 pedidos
- Cada KR conectado a North Star + outcome na OST + assunções (A1–A7)

### OST — `ost.md`
- Outcome-A (conversão) → KR1
- Outcome-B (retenção) → KR2
- Outcome-C (ticket/valor percebido) → KR3
- Outcome-D (adoção restaurantes) → KR4
- Outcome-E (satisfação) → KR5
- Estrutura pronta para priorização RICE/ICE na Fase 02

### Market Analysis — `market-analysis.md`
- **TAM:** R$ 75 bi/ano (food delivery Brasil)
- **SAM:** R$ 12 bi/ano (Grande São Paulo, canais digitais)
- **SOM:** R$ 18 mi/ano em 12-18 meses (~0,15% do SAM, conservador)
- Competitive table: iFood, Rappi, Uber Eats, WhatsApp/próprio — dimensões preço, curadoria, operações, pagamento
- Trends identificadas: premiumização, artesanal/nicho, integração fintech-comércio

---

## Métricas Estratégicas (baseline + target)

| Métrica | Baseline | Target MVP | Target Ano 1 | Status |
|---------|----------|------------|--------------|--------|
| PCSS (North Star) | 0 | ≥ 630/sem | ≥ 6.300/sem | Medição a partir do go-live |
| Conversão (KR1) | 0% | ≥ 8% (4 sem seg.) | ≥ 10% | Instrumentar Fase 03 |
| Recompra 30d (KR2) | 0% | ≥ 25% | ≥ 35% | Medir a partir do 30º dia pós-launch |
| Ticket médio (KR3) | — | ≥ R$ 45 | ≥ R$ 50 | Query SQL direta em `orders.total` |
| Restaurantes ativos (KR4) | 6 (seed) | ≥ 50 (3º mês) | ≥ 200 | Query agregada |
| NPS (KR5) | n/d | ≥ 40 | ≥ 50 | Survey in-app — implementar na Fase 03 |

---

## Riscos e Pendências

| # | Risco / Pendência | Severidade | Mitigação |
|---|-------------------|------------|-----------|
| R1 | A1 — Consumidores premium podem não migrar do iFood só por UX | Alta | Discovery qualitativo na Fase 02 + experimento de aquisição controlada |
| R2 | A2 — Restaurantes artesanais podem rejeitar comissão/canal | Alta | Entrevistas na Fase 02 + definir OQ1 (modelo de comissão) antes da Fase 03 |
| R3 | A5 — Massa crítica em 3 meses pode ser otimista | Alta | Validar com benchmark de lançamentos de verticais similares; ajustar bairros-alvo |
| R4 | Tabela `complaints` inexistente hoje | Média | Incluir no domain model da Fase 03; até lá, proxy por support tickets |
| R5 | NPS survey não implementada | Média | Scope na Fase 03 (Backend + Frontend) |
| R6 | OQs 1-6 sem resposta (comissão, base ecp-digital-bank, pagamentos, bairros, operação entrega, budget aquisição) | Alta | Priorizar resposta no HITL #1 ou tratar como hipóteses de Fase 02 |

---

## Perguntas Abertas (para HITL #1)

| ID | Pergunta | Impacto |
|----|----------|---------|
| OQ1 | Modelo de comissão definitivo para restaurantes? (range discutido: 10-18%) | KR4, unit economics |
| OQ2 | Tamanho da base ecp-digital-bank em SP disponível como canal de aquisição? | KR1, CAC |
| OQ3 | Meios de pagamento para não-correntistas ecp-digital-bank no MVP? | KR1, conversão |
| OQ4 | Bairros-alvo priorizados no lançamento? (proposta atual: Pinheiros, Vila Madalena, Itaim, Moema, Vila Mariana) | KR1, KR4 |
| OQ5 | Modelo operacional de entrega no MVP? (entregadores próprios, 3PL, restaurante-próprio?) | KR1, KR2 |
| OQ6 | Budget de aquisição no MVP (subsídios, cupons, comissão zero inicial)? | KR4 |

---

## Iterações Consolidadas Durante a Fase

Nenhuma iteração foi consolidada durante a Fase 01 — a iteração `2026-04-20` (retroativa, 3 specs regeneradas de `03-product-delivery/`) já estava formalizada como consolidada no pré-voo.

---

## Recomendação do Orquestrador

**Aprovação recomendada** — todas as entregas foram concluídas, são coerentes entre si, estão alinhadas ao briefing e ao stack técnico, e delimitam riscos e perguntas abertas de forma acionável. Recomenda-se que o humano use o HITL #1 para responder (ou explicitamente adiar para Discovery) as 6 Open Questions antes da Fase 02.

---

## Decisão HITL #1

**Data:** ___
**Decisor:** ___

- [ ] Aprovado
- [ ] Aprovado com ressalvas: ___
- [ ] Reprovado — Motivo: ___

**Feedback:** ___

**Respostas às Open Questions (se disponíveis agora):**
- OQ1: ___
- OQ2: ___
- OQ3: ___
- OQ4: ___
- OQ5: ___
- OQ6: ___
