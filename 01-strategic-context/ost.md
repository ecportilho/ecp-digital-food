# Opportunity Solution Tree (OST) — FoodFlow

> Produto: **FoodFlow** (ECP Food)
> Fase: **01 — Contexto Estratégico**
> Versão: **2026-04-20**
> Metodologia: Teresa Torres — *Continuous Discovery Habits*
> Skill aplicada: `pm-ost-builder`

---

## Como ler esta árvore

```
Outcome (um por KR)
 └── Opportunity (dor, necessidade ou desejo do usuário — NUNCA solução)
      └── Candidate Solution (ideia específica — hipótese de como atender a oportunidade)
           └── Experiment (teste para validar ou refutar a hipótese)
```

**Regras:**
- Oportunidades vivem na linguagem do usuário, não na do time.
- Soluções são hipóteses de trabalho — podem e devem ser trocadas se o experimento refutar.
- Experimentos têm métrica de sucesso antes de rodar.
- A árvore é viva — será refinada na Fase 02 pelo Designer/PO e priorizada por RICE/ICE.

**Legenda das oportunidades:**
- 🔴 **dor** — algo que incomoda/frustra hoje
- 🔵 **necessidade** — algo funcional que o usuário precisa resolver
- 🟣 **desejo** — algo aspiracional que elevaria a experiência

---

# NORTH STAR: Pedidos Completados com Satisfação por Semana (PCSS)

```
                        ┌───────────────────────────┐
                        │   North Star: PCSS        │
                        │   ≥ 630/semana (MVP)      │
                        └─────────────┬─────────────┘
                                      │
           ┌──────────────┬───────────┼────────────┬──────────────┐
           ▼              ▼           ▼            ▼              ▼
      Outcome-A       Outcome-B   Outcome-C   Outcome-D       Outcome-E
       (KR1)           (KR2)       (KR3)       (KR4)            (KR5)
```

---

## Outcome-A — Visitantes concluem um pedido com confiança e sem fricção
**Liga em:** KR1 (Conversão ≥ 8%)

### 🔴 Opportunity A.1 — Fadiga de decisão ao navegar catálogos longos e genéricos
> "Eu abro o app, vejo mil restaurantes e não sei por onde começar. Desisto antes de escolher."

#### Candidate Solutions
1. **Curadoria visual por categoria com imagens-hero fortes** — hipótese: reduzir cognição elevando uma categoria por vez.
2. **Seção "Descubra algo novo hoje"** com rotação diária de 3-5 restaurantes curados.
3. **Filtros por JTBD** ("Quero jantar rápido", "Fim de semana em casa", "Quero experimentar algo novo").
4. **Ordenação padrão por qualidade** (rating × recência de avaliação), não por patrocínio.

#### Experiments
- **E.A1.1** — A/B home atual (grid de 6 seeds) vs home com seção "Destaque do dia" — métrica: taxa de clique em restaurante, adição ao carrinho em ≤ 2 min.
- **E.A1.2** — Teste de usabilidade moderado com 8 pessoas do segmento "Explorador Gastronômico" — métrica: time-to-decision e verbalização da fadiga.

---

### 🔴 Opportunity A.2 — Abandono no checkout quando o preço final surpreende
> "Cheguei no final e descobri frete caro / meu cupom não funcionou. Fechei o app."

#### Candidate Solutions
1. **Exibir total estimado** (com frete + possíveis descontos) desde a tela do restaurante.
2. **Validação de cupom em tempo real** no carrinho (antes do checkout), não só no final.
3. **Barra de progresso "Faltam R$ X para frete grátis"** — aproveita a regra implementada de frete 0 ≥ R$ 120.
4. **Resumo de preço persistente** no header do checkout.

#### Experiments
- **E.A2.1** — A/B do CheckoutPage com/sem barra de progresso de frete grátis — métrica: taxa de conclusão do checkout.
- **E.A2.2** — Instrumentar abandono por passo (carrinho → checkout → método → confirmação) para identificar onde a quebra acontece.

---

### 🔵 Opportunity A.3 — Necessidade de filtros/categorias que conectem ao que se deseja comer agora
> "Hoje eu quero algo leve. Deveria existir um jeito de filtrar sem ler todos os cardápios."

#### Candidate Solutions
1. **Chips de categoria expandidos** além das 6 seed (por momento do dia, por humor, por restrição alimentar).
2. **Busca semântica no chat** ("quero algo vegetariano que chegue rápido") — aproveitando a arquitetura multi-agente já implementada.
3. **Tags no MenuItemCard** (Vegetariano, Sem lactose, Leve, Consistente) — coluna `badge` já existe, só não padroniza valores.

#### Experiments
- **E.A3.1** — Teste de taxonomia com 12 usuários (card sorting) para validar categorias além das atuais.
- **E.A3.2** — Medir adoção de busca via chat IA — métrica: % de pedidos iniciados via chat.

---

### 🟣 Opportunity A.4 — Desejo de confiança antes de pedir de um restaurante novo
> "Se eu nunca pedi, quero sinais claros de que vale a pena: fotos reais, quantas pessoas já pediram, o que pediram."

#### Candidate Solutions
1. **Social proof discreto no card** ("234 pediram esta semana").
2. **Item mais pedido em destaque** na página do restaurante.
3. **Reviews curtas** (1-2 linhas), não obrigatórias — começar read-only com dados seed.
4. **Fotos reais dos pratos** substituindo emojis no item card (transição gradual).

#### Experiments
- **E.A4.1** — A/B com/sem social proof — métrica: taxa de clique em restaurante com < 10 pedidos no histórico.
- **E.A4.2** — Entrevista com 6 Exploradores Gastronômicos para priorizar sinais de confiança.

---

### 🔴 Opportunity A.5 — Fricção no fluxo de pagamento com autenticação ecp-digital-bank
> "Tive que logar de novo no banco no meio do checkout. Quase desisti."

#### Candidate Solutions
1. **Promover cartão cadastrado (F09) como default visual**, já implementado como default técnico.
2. **Lembrar login do banco por sessão** (token curto) para retornos imediatos.
3. **PIX QR Code como atalho para não-correntistas** — educar que funciona em qualquer banco.
4. **Pre-cadastrar cartões durante onboarding** com fluxo opcional.

#### Experiments
- **E.A5.1** — Medir taxa de conclusão por método de pagamento (crédito cadastrado vs cartão ECP vs PIX) — comparativo nas primeiras 4 semanas pós-lançamento.
- **E.A5.2** — Teste de usabilidade do fluxo `BankLoginForm` com 6 usuários — métrica: time-to-complete e verbalização de fricção.

---

## Outcome-B — Consumidores retornam sem precisar redescobrir a plataforma
**Liga em:** KR2 (Recompra ≥ 25%) e KR5 (NPS ≥ 40)

### 🔵 Opportunity B.1 — Necessidade de caminho ultra-rápido para repetir pedido anterior
> "Quando eu quero o de sempre, deveria dar dois cliques e pronto."

#### Candidate Solutions
1. **Botão "Repetir este pedido"** em `/orders` (adicionar itens idênticos ao carrinho).
2. **Home personalizada para retornantes** com shortcut "Pedir o de novo".
3. **Atalho no chat IA** (tool adicional `repeat_last_order`).

#### Experiments
- **E.B1.1** — Instrumentar adoção do botão repetir e medir % do GMV originada desta via.
- **E.B1.2** — Comparar recompra entre cohort com/sem exposição a shortcut.

---

### 🔴 Opportunity B.2 — Esquecimento da plataforma na ausência de razão para voltar
> "Pedi uma vez, gostei, mas depois não lembrei de abrir. Voltei pro iFood por hábito."

#### Candidate Solutions
1. **Email de agradecimento com CTA** "Descubra o que sua vizinhança pediu esta semana" (sem push no MVP — não há infra).
2. **Cupom de retorno** aplicado automaticamente no próximo login em até 14 dias.
3. **Badge visual persistente** nos favoritos para reforçar memória.
4. **Integração com ecp-digital-bank** para cashback cruzado (médio prazo).

#### Experiments
- **E.B2.1** — Enviar email de retorno vs controle — métrica: sessão D7, pedido D30.
- **E.B2.2** — A/B cupom automático de R$ 10 no retorno vs sem cupom — métrica: recompra e ticket médio sem erosão.

---

### 🟣 Opportunity B.3 — Desejo de sentir que a plataforma "conhece" o usuário
> "Depois de 3 pedidos, o app deveria saber que eu gosto de japonês de terça e pizza de sexta."

#### Candidate Solutions
1. **Home contextual** (horário, dia da semana, últimas escolhas).
2. **Sugestões no chat IA** baseadas no histórico (tool `suggest_from_history` — já há base com `list_orders`).
3. **Badges "Sua escolha favorita"** em itens pedidos > 2 vezes.

#### Experiments
- **E.B3.1** — Qualitativo: mostrar mock de home contextual para 8 Práticos Recorrentes — medir reação.
- **E.B3.2** — Quantitativo (pós-MVP): A/B home contextual vs genérica em cohorts com 3+ pedidos.

---

### 🔴 Opportunity B.4 — Quebra de confiança após experiência ruim no 2º pedido
> "O primeiro foi ótimo, o segundo veio errado/atrasado. Não pedi mais."

#### Candidate Solutions
1. **SLA de entrega visível e cumprido** — ETA honesto baseado em dados históricos, não em valor declarado pelo restaurante.
2. **Recuperação proativa** — se pedido atrasa > 15 min do ETA, enviar mensagem + cupom de recuperação.
3. **Escalação rápida de reclamação** via chat IA (tool de abertura de ticket).
4. **Transparência do status** já existente (`preparing`, `out_for_delivery`) com timestamps honestos.

#### Experiments
- **E.B4.1** — Rastrear correlação entre tempo até 2º pedido e qualidade do 1º (medida por ETA cumprido e reclamações).
- **E.B4.2** — Piloto de cupom automático em atraso > 15 min — métrica: recompra D30 da cohort afetada.

---

## Outcome-C — Consumidores montam pedidos completos e percebem valor
**Liga em:** KR3 (Ticket ≥ R$ 45)

### 🔵 Opportunity C.1 — Necessidade de confiança na qualidade para justificar ticket maior
> "Se é caro, quero ter certeza de que vale a pena."

#### Candidate Solutions
1. **Descrições ricas** em cada menu item (origem do ingrediente, porção, harmonização).
2. **Destaque "Mais pedido aqui"** (signal social por restaurante).
3. **Storytelling do restaurante** no banner (quem é o chef, história).

#### Experiments
- **E.C1.1** — A/B descrição curta vs descrição rica no MenuItemCard — métrica: taxa de adição ao carrinho.
- **E.C1.2** — Qualitativo com 6 Exploradores — quais informações elevam confiança.

---

### 🟣 Opportunity C.2 — Desejo de montar refeição completa (entrada + prato + bebida)
> "Seria legal se o app sugerisse o que combina com o que estou pedindo."

#### Candidate Solutions
1. **Sugestão de complemento** no carrinho ("Quem pediu isto também levou…").
2. **Agrupamento por categoria interna** (entrada, prato, sobremesa, bebida) — campo `menu_items.category` já suporta.
3. **Combo sugerido** pelo chat IA via tool `suggest_combo`.

#### Experiments
- **E.C2.1** — A/B com/sem sugestão de complemento no cart panel — métrica: itens/pedido, ticket médio.
- **E.C2.2** — Teste de adoção da sugestão via chat IA — medir ticket médio dos pedidos assistidos pelo chat vs. não-assistidos.

---

### 🔴 Opportunity C.3 — Frustração com frete que inviabiliza pedidos pequenos
> "Ia pedir só um lanche mas o frete matou. Desisti."

#### Candidate Solutions
1. **Barra de progresso "Faltam R$ X para frete grátis"** (já citada em A.2; serve a dois outcomes).
2. **Bundles promocionais** por restaurante ("Pizza + refri = R$ 65").
3. **Cupons direcionados a ticket mínimo** (padrão MVP10 já opera com `min_order R$ 80`).

#### Experiments
- **E.C3.1** — Medir % de carrinhos que cruzam o threshold após introdução da barra — métrica: ticket médio e taxa de conclusão.

---

## Outcome-D — Restaurantes artesanais adotam o FoodFlow como canal com condições justas
**Liga em:** KR4 (50+ restaurantes ativos)

### 🔴 Opportunity D.1 — Invisibilidade do restaurante artesanal em plataformas dominadas por grandes redes
> "No iFood, quem paga aparece. Quem não paga, não existe."

#### Candidate Solutions
1. **Ranking transparente baseado em qualidade** (rating + recência + cumprimento de ETA), sem pay-to-play no MVP.
2. **Seção "Novos no FoodFlow"** na home por 30 dias após onboarding.
3. **Badge "Curadoria FoodFlow"** em restaurantes aprovados.

#### Experiments
- **E.D1.1** — Entrevista com 10 donos de restaurantes artesanais — validar percepção de justiça do modelo.
- **E.D1.2** — Piloto de "Novos no FoodFlow" — medir se novos restaurantes atingem 12+ pedidos/semana em 30 dias.

---

### 🔵 Opportunity D.2 — Necessidade de autonomia real na gestão (cardápio, preço, promoção)
> "Não quero depender de alguém pra mudar meu preço. Quero fazer sozinho."

#### Candidate Solutions
1. **Painel restaurante (F11-F14)** já implementado — validar usabilidade com restaurantes reais.
2. **Editor de cardápio com preview visual** (cliente e painel lado a lado).
3. **Promoções por restaurante** (hoje só a plataforma cria cupons globais).

#### Experiments
- **E.D2.1** — Teste de usabilidade moderado com 6 donos de restaurante no `/restaurant-panel` — métrica: tempo para atualizar cardápio, taxa de erro.
- **E.D2.2** — Entrevistas sobre necessidade de promoções próprias — priorizar para roadmap NEXT.

---

### 🟣 Opportunity D.3 — Desejo por analytics acionável sobre o comportamento dos clientes
> "Eu quero saber qual prato vende mais, em que horário, e pra quem. Hoje voo no escuro."

#### Candidate Solutions
1. **Dashboard básico no painel restaurante** (pedidos/dia, itens mais vendidos, ticket médio próprio).
2. **Relatório semanal por email** com insights principais.
3. **Settlements detalhados** (F14 já entrega valor a receber — estender para métricas).

#### Experiments
- **E.D3.1** — Protótipo clicável do dashboard com 5 restaurantes — medir se o dado muda decisão.
- **E.D3.2** — Enviar relatório semanal manual para 10 restaurantes no piloto — medir engajamento.

---

### 🔴 Opportunity D.4 — Pressão de comissão alta sobre margem de restaurantes artesanais
> "Com 22% de comissão + embalagem + ingrediente premium, sobra nada."

#### Candidate Solutions
1. **Split 85/15** já implementado — comunicar de forma transparente.
2. **Comissão zero nos primeiros X meses** para early adopters (requer OQ6 resolvido).
3. **Sem custos de mídia obrigatórios** (já é o modelo, comunicar como diferencial).

#### Experiments
- **E.D4.1** — Proposta comercial A/B (15% vs 0% nos 3 primeiros meses) para 20 restaurantes — métrica: taxa de aceitação e LTV projetado.

---

### 🔵 Opportunity D.5 — Necessidade de onboarding simples e rápido
> "Não tenho tempo pra documentação e treinamento. Quero cadastrar e começar."

#### Candidate Solutions
1. **Onboarding assistido por humano** nos primeiros 20 restaurantes (white-glove).
2. **Self-service com checklist** (`/restaurant-panel/onboarding`).
3. **Importação de cardápio de PDF** por OCR ou via chat IA (longo prazo).

#### Experiments
- **E.D5.1** — Medir tempo médio do primeiro contato ao primeiro pedido — target < 7 dias.
- **E.D5.2** — A/B onboarding assistido vs self-service — métrica: taxa de ativação em 14 dias.

---

## Outcome-E — Consumidores percebem a experiência como premium e recomendam
**Liga em:** KR5 (NPS ≥ 40)

### 🟣 Opportunity E.1 — Desejo por uma experiência visualmente memorável
> "Esse app é bonito. Não parece iFood."

#### Candidate Solutions
1. **Midnight Express como sistema visual consistente** — já implementado (design_spec.md).
2. **Animações e micro-interações** (qrAppear, checkPop, processingPulse — já há keyframes).
3. **Fotos de prato de alta qualidade** como evolução do uso de emojis.

#### Experiments
- **E.E1.1** — Teste comparativo de percepção (FoodFlow vs iFood vs Rappi) com 20 usuários — scale de premium perceived.
- **E.E1.2** — Monitorar menções espontâneas de design nas respostas de NPS qualitativo.

---

### 🔵 Opportunity E.2 — Necessidade de canais de suporte confiáveis
> "Se algo der errado, quero saber que vão resolver rápido."

#### Candidate Solutions
1. **Chat IA como primeira linha de suporte** (arquitetura já implementada com `knowledge` e `transaction` agents).
2. **Escalação para humano** por tipos de problema (hoje só IA).
3. **FAQ visível** com perguntas mais comuns.

#### Experiments
- **E.E2.1** — Medir taxa de resolução pela IA (resolved sem handoff) — hoje não instrumentado.
- **E.E2.2** — Pesquisa pós-suporte com 2 perguntas (resolvi sim/não, NPS do atendimento).

---

## Matriz Outcome × Oportunidades × Experimentos

| Outcome | # Oportunidades | # Candidate Solutions | # Experiments |
|---------|-----------------|----------------------|---------------|
| A (KR1) | 5 | 17 | 8 |
| B (KR2) | 4 | 14 | 7 |
| C (KR3) | 3 | 8 | 3 |
| D (KR4) | 5 | 13 | 6 |
| E (KR5) | 2 | 6 | 3 |
| **Total** | **19** | **58** | **27** |

---

## Priorização preliminar (para Fase 02)

A priorização formal via RICE/ICE acontece na Fase 02 com o Designer e o PO. Para ancorar a conversa, três candidatos de alta confiança aparecem em múltiplos outcomes e devem ser considerados cedo:

1. **Barra de progresso "Faltam R$ X para frete grátis"** — ataca A.2 e C.3 (conversão e ticket).
2. **Botão "Repetir este pedido"** — ataca B.1 de forma direta (recompra) com baixo custo técnico.
3. **Onboarding assistido para primeiros 20 restaurantes (white-glove)** — destrava D.5 e é pré-requisito para KR4.

Estes candidatos **não são decisões**. São insumos para o HITL #2 (prioridade de oportunidades) na Fase 02.

---

## Regras da OST Aplicadas

- [x] Cada outcome é ligado a pelo menos um KR.
- [x] Cada oportunidade é fraseada na voz do usuário (com citação sugerida).
- [x] Cada solução é uma hipótese, não um compromisso.
- [x] Cada experimento declara o que será medido.
- [x] Zero features sem oportunidade por trás.
- [x] A árvore admite ser podada/reorganizada na Fase 02 sem perder coerência com os KRs.
