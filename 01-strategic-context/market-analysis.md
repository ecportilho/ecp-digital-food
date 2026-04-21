# Market Analysis — FoodFlow

> Produto: **FoodFlow** (ECP Food)
> Fase: **01 — Contexto Estratégico**
> Versão: **2026-04-20**
> Skills aplicadas: `pm-market-sizer`, `pm-competitor-analyzer`, `pm-trend-spotter`

---

## 1. Sizing de Mercado (TAM / SAM / SOM)

### 1.1 TAM — Total Addressable Market

| Campo | Valor |
|-------|-------|
| Descrição | Mercado total de food delivery no Brasil |
| GMV anual estimado | **~ R$ 75 bilhões** |
| Ano-referência | 2025 |
| Crescimento histórico | ~7,5% a.a. (2022-2025) |
| Fontes | ABRASEL, Statista; Brasil é o 4º maior mercado mundial de delivery |
| Abrangência | Todos os canais: apps, delivery próprio de restaurantes, WhatsApp, ligação |

### 1.2 SAM — Serviceable Addressable Market

| Campo | Valor |
|-------|-------|
| Descrição | Delivery via plataformas digitais na Grande São Paulo |
| GMV anual estimado | **~ R$ 12 bilhões** |
| Ano-referência | 2025 |
| Racional | São Paulo concentra ~16% do mercado nacional; filtrando apenas plataformas digitais (sem WhatsApp/ligação) |
| Característica do segmento | 22 milhões de habitantes na região metropolitana, maior densidade de restaurantes do Brasil, ticket médio mais alto |

### 1.3 SOM — Serviceable Obtainable Market

| Campo | Valor |
|-------|-------|
| Descrição | Fatia realista capturável em 12-18 meses, foco nicho premium/artesanal em bairros-alvo de SP |
| GMV anual estimado | **~ R$ 18 milhões** |
| Ano-referência | 2027 |
| Representa | ~0,15% do SAM — meta conservadora dado cold-start contra incumbentes |
| Premissas de cálculo | 50-80 restaurantes artesanais ativos, ticket médio R$ 55, ~900 pedidos/dia pós ramp-up |
| Bairros-alvo | Pinheiros, Vila Madalena, Itaim Bibi, Moema, Vila Mariana (a confirmar em OQ4) |

### 1.4 Visualização do funil

```
   TAM  ─── R$ 75 bi/ano  ─── Food delivery Brasil (todos os canais)
    │
    │ ×16% (São Paulo) + filtro plataformas digitais
    ▼
   SAM  ─── R$ 12 bi/ano  ─── Delivery digital na Grande SP
    │
    │ ×0,15% (nicho premium/artesanal + bairros-alvo)
    ▼
   SOM  ─── R$ 18 mi/ano  ─── FoodFlow ano 2
```

---

## 2. Análise Competitiva

### 2.1 Mapa de concorrência direta

| Player | Market share BR | Posicionamento | Ticket médio estimado |
|--------|-----------------|----------------|------------------------|
| **iFood** | ~80% | Marketplace generalista, líder absoluto | R$ 35-45 |
| **Rappi** | ~7% | Super-app (comida + mercado + farmácia) | R$ 40-50 |
| **99food** | ~3% | Challenger do ecossistema 99/DiDi | R$ 30-40 |
| **Keeta** (ByteDance) | ~1% (entrante recente) | Challenger com apoio ByteDance | R$ 35-45 (ainda calibrando) |
| **FoodFlow** | 0% (pré-lançamento) | Challenger premium, curadoria artesanal | R$ 45+ (target) |

### 2.2 Análise detalhada

#### iFood — Incumbente dominante

**Forças:**
- Base instalada massiva (>350k restaurantes, dezenas de milhões de consumidores).
- Efeito de rede consolidado (oferta e demanda auto-reforçando).
- Infraestrutura logística própria + dark stores + entregadores.
- Clube iFood com milhões de assinantes pagos.
- Investimento pesado em IA para recomendação e pricing.
- Carteira digital própria (iFood Card).

**Fraquezas:**
- UI visualmente poluída com excesso de banners e conteúdo patrocinado.
- Algoritmo de ranking opaco — restaurantes pequenos invisíveis sem mídia paga.
- Comissões elevadas (12-27%) que pressionam margem.
- Suporte inconsistente em disputas e chargebacks.
- Identidade visual utilitária, sem diferenciação premium.

**Gap aproveitável pelo FoodFlow:**
- UX premium com curadoria visual e dark mode.
- Transparência sobre ranking e comissão (modelo 85/15 fixo já implementado).
- Descoberta por JTBD (momento, humor, restrição) vs. listas genéricas.

---

#### Rappi — Super-app diluído

**Forças:**
- Modelo super-app (food + mercado + farmácia + entregas).
- Rappi Prime com frete grátis e benefícios cruzados.
- Integração com Rappi Pay.
- Presença em classes A/B urbanas.

**Fraquezas:**
- Foco diluído — comida compete com outras categorias por atenção.
- Catálogo menor que iFood no Brasil.
- Reestruturações frequentes sinalizando instabilidade.
- Experiência de descoberta de comida é secundária.

**Gap aproveitável pelo FoodFlow:**
- Especialização em food beats generalização em muitas categorias.
- Experiência 100% focada em comida gera descoberta superior.

---

#### 99food — Challenger subsidiado

**Forças:**
- Base cruzada de 99/DiDi (transporte).
- Comissões competitivas em fase de expansão.
- Subsídios agressivos para aquisição.

**Fraquezas:**
- Base de restaurantes limitada em várias regiões.
- Produto sem diferenciação clara de UX.
- Retenção orgânica baixa — dependência de subsídios.
- Operação descontinuada/reduzida em algumas cidades.

**Gap aproveitável pelo FoodFlow:**
- Valida que há espaço para challengers, mas sem diferencial de UX a retenção colapsa.
- Ausência de identidade premium abre janela para FoodFlow.

---

#### Keeta (ByteDance) — Entrante recente

**Forças:**
- Apoio financeiro massivo (subsídio de crescimento).
- Potencial integração com TikTok (social commerce).
- UX moderna, design limpo asiático.
- IA generativa e recomendação social.

**Fraquezas:**
- Marca nova sem confiança estabelecida no Brasil.
- Base de restaurantes pequena.
- Riscos regulatórios/privacidade (ByteDance).
- Sem infraestrutura logística própria.

**Gap aproveitável pelo FoodFlow:**
- Entrada da Keeta valida apetite por UX diferenciada.
- FoodFlow é alternativa local/independente sem dependência de big tech estrangeira.
- Integração nativa com **ecp-digital-bank** é diferencial único, que nenhum concorrente tem.

### 2.3 Diferencial competitivo do FoodFlow (moat inicial)

1. **UX premium consistente** — Midnight Express aplicado de ponta a ponta, sem ruído publicitário.
2. **Ecossistema integrado ecp-digital-bank + ECP Pay** — cartão virtual, débito via PIX transfer, QR Code, splits automáticos 85/15. Nenhum concorrente tem passarela própria integrada a banco próprio.
3. **Assistente IA multi-agente nativo** — orchestrator + knowledge + transaction agents com 13 tools, permitindo pedir/pagar por conversa. Concorrentes têm apenas FAQs básicos.
4. **Curadoria artesanal como posicionamento** — oposto ao "qualquer um entra" do iFood.
5. **Transparência estrutural** — splits 85/15 visíveis no painel do restaurante (F14 Settlements), sem ranking pay-to-play.

### 2.4 Moats frágeis (a proteger)

- **Efeito de rede ainda não existe** — estamos em cold start. Única proteção nos primeiros meses é product excellence.
- **Integração ecp-digital-bank** é replicável por concorrente com poder financeiro (iFood pode comprar/lançar banco).
- **Posicionamento premium** depende de execução contínua — qualquer diluição (comissão paga por destaque, etc.) destrói.

---

## 3. Segmentação de Clientes

### 3.1 Consumidores

#### C1 — Explorador Gastronômico (alvo primário MVP)
- **Perfil:** 22-35 anos, classes A/B, urbano SP, renda R$ 5-15k.
- **JTBD:** "Quando estou entediado com as mesmas opções, quero descobrir restaurantes novos para sentir que vivo experiências gastronômicas variadas."
- **Comportamento:** Pede 3-5x/semana, navega, influenciado por fotos/badges, compartilha em redes.
- **Dores:** Fadiga de decisão, desconfiança de restaurantes novos, promoções confusas.
- **Ticket típico:** R$ 50-80.

#### C2 — Prático Recorrente (alvo secundário)
- **Perfil:** 28-40 anos, CLT/PJ, renda R$ 6-20k, rotina intensa.
- **JTBD:** "Quando preciso jantar rápido depois do trabalho, quero repetir um pedido que já sei que é bom para não gastar energia decidindo."
- **Comportamento:** 3-5 favoritos fixos, usa "repetir pedido", valoriza checkout veloz.
- **Dores:** Checkout lento, falta de atalho de recompra, dados não persistidos.
- **Ticket típico:** R$ 40-60.

#### C3 — Caçador de Ofertas (não é foco do MVP — alto risco de erosão de ticket)
- **Perfil:** 22-32 anos, estudantes/jovens profissionais, renda R$ 2-6k.
- **JTBD:** "Quando quero pedir delivery sem estourar o orçamento, quero encontrar promoções reais."
- **Comportamento:** Compara apps, instala múltiplos, pede em promoções.
- **Dores:** Cupons com regras confusas, frete que anula desconto, promoções fake.
- **Ticket típico:** R$ 30-45 — **abaixo do KR3**.

> ⚠️ FoodFlow deliberadamente **não persegue C3** no MVP — o risco de erosão do ticket médio e da percepção premium é maior que o ganho em volume.

### 3.2 Restaurantes

#### R1 — Restaurante Artesanal em Crescimento (alvo primário MVP)
- **Perfil:** Artesanais de médio porte, 1-3 unidades, faturamento R$ 50-300k/mês, chef/proprietário envolvido.
- **JTBD:** "Quando meu restaurante não aparece no iFood sem pagar mídia, quero uma plataforma que valorize a qualidade."
- **Comportamento:** Cardápio curado 15-40 itens, investe em apresentação, quer controle e dados.
- **Dores:** Invisibilidade, comissão alta, falta de analytics, sem acesso direto ao cliente.
- **Willingness-to-pay:** Aceita 10-18% de comissão se houver visibilidade real.

#### R2 — Dark Kitchen / Delivery-First (alvo secundário)
- **Perfil:** Delivery-only, 1-5 marcas virtuais, equipe enxuta, R$ 30-150k/mês.
- **JTBD:** "Quando opero só por delivery, quero analytics detalhado e boa exposição para otimizar cardápio e operação."
- **Comportamento:** Multi-plataforma, testa preços frequentemente, 100% data-driven.
- **Dores:** Dados fragmentados, custo de multi-presença, dificuldade de construir marca.
- **Willingness-to-pay:** Aceita 15-22% se volume e dados justificarem.

---

## 4. Tendências Relevantes

### T1 — Dark Kitchens e Cloud Kitchens
**Descrição:** Cozinhas 100% delivery sem salão. Crescimento 15-20% a.a. no Brasil.
**Impacto no FoodFlow:** Tratar dark kitchens como parceiros de primeira classe. Analytics por marca virtual é diferencial (R2).
**Horizonte:** Em curso, aceleração até 2028.

### T2 — IA para Personalização e Recomendação
**Descrição:** ML para recomendar pratos/restaurantes com base em histórico, horário, clima, preferências.
**Impacto no FoodFlow:** No MVP, usar heurísticas (popularidade, recência). Pós-MVP, investir em recomendação real. O assistente IA multi-agente já coloca o FoodFlow à frente de grande parte do mercado.
**Horizonte:** 2025-2028, crescimento exponencial.

### T3 — Super-Apps e Consolidação de Serviços
**Descrição:** Unificação de delivery + pagamentos + transporte + compras. Rappi, Grab, Gojek como exemplo.
**Impacto no FoodFlow:** Integração ecp-digital-bank aponta para ecossistema. Estratégia: ser o melhor em comida antes de expandir.
**Horizonte:** Consolidação 2025-2030.

### T4 — Pagamentos Instantâneos e PIX como Infraestrutura
**Descrição:** PIX domina com >150M usuários. QR Code mainstream. PIX Automático em produção.
**Impacto no FoodFlow:** Integração nativa com ecp-digital-bank via PIX QR Code já implementada (F05-C). Oportunidade futura: PIX Automático para planos premium.
**Horizonte:** Consolidado, expansão contínua.

### T5 — Experiência Premium e Curadoria como Diferencial
**Descrição:** Consumidores A/B migrando de quantidade para qualidade. Caviar (DoorDash), TastePort validaram nicho.
**Impacto no FoodFlow:** Midnight Express é perfeitamente alinhado. Curadoria é barreira de entrada. UX premium como fator de retenção.
**Horizonte:** Tendência crescente 2024-2028.

### T6 — Sustentabilidade e Transparência na Cadeia
**Descrição:** Consumidores jovens exigem embalagens eco, transparência de origem, impacto ambiental.
**Impacto no FoodFlow:** Futuro: badges de sustentabilidade, dados de emissão. MVP não prioriza, mas arquitetura deve acomodar.
**Horizonte:** 2026-2030, pressão regulatória crescente.

---

## 5. Go-to-Market preliminar (insumo para Fase 02)

### 5.1 Sequência recomendada
1. **White-glove onboarding** de 20 restaurantes-âncora em 2-3 bairros-alvo (60 dias).
2. **Soft-launch** com waitlist de 500-1000 consumidores alvo (C1) convertida em beta fechado.
3. **Abertura pública** por bairro, à medida que massa crítica (≥ 15 restaurantes ativos/bairro) se estabelece.
4. **Expansão geográfica** apenas após KR4 atingir 50+ restaurantes sustentados.

### 5.2 Canais de aquisição (hipóteses para Discovery)
- **Consumidor:** conteúdo no Instagram/TikTok sobre curadoria, parcerias com influenciadores gastronômicos locais, SEO local ("melhor delivery de sushi em Pinheiros").
- **Restaurante:** outbound direto (telefone/visita), parcerias com ABRASEL local, indicação entre restaurantes.

### 5.3 Orçamento
Indefinido — **OQ6 (budget de aquisição)** permanece bloqueante para calibrar CAC máximo aceitável.

---

## 6. Riscos Macro

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| iFood reage agressivamente com exclusividade ou contrato restritivo com restaurantes-alvo | Média | Alto | Focar em restaurantes multi-canal; oferecer vantagens não-monetárias (dashboard, controle, marca) |
| Keeta/ByteDance entra pesado em SP com subsídio | Baixa-Média | Médio | Diferenciação via curadoria + ecp-digital-bank é difícil de copiar em 12 meses |
| Regulamentação de food delivery (direitos de entregadores, limite de comissão) | Média | Médio | Acompanhar pela ABRASEL; modelo 85/15 fixo é defensível em qualquer marco regulatório |
| Ciclo econômico derruba ticket em classes A/B | Média | Alto | Ter C2 (Prático Recorrente) como reserva de demanda estável |
| Integração ecp-digital-bank sofre downtime prolongado | Baixa | Alto | Circuit breaker já implementado; ECP Pay é camada preferencial, banco é fallback |

---

## 7. Próximos passos (handoff para Fase 02)

1. Responder perguntas abertas **OQ1-OQ6** (ver `okrs.md`) — especialmente OQ1 (comissão), OQ4 (bairros) e OQ5 (logística).
2. Validar assunções **A1, A2, A5** (as de risco alto) via entrevistas qualitativas na Fase 02.
3. Confirmar seleção de 2-3 bairros-alvo de arrancada (densidade de oferta × perfil do consumidor).
4. Iniciar pipeline de white-glove outreach para R1 (Restaurante Artesanal) — meta 20 âncoras em 60 dias.
