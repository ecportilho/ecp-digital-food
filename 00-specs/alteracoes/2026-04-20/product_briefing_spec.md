# Product Briefing — ECP Food (FoodFlow) — Versão 2026-04-20

> Spec regenerada a partir do estado implementado em `03-product-delivery/` em 20/04/2026.

## 1. Visão Geral do Produto

**Nome (código):** ecp-digital-food
**Nome do produto:** FoodFlow
**Tagline:** Pedir comida pode ser lindo, rápido e viciante.
**Tipo:** Marketplace de delivery de comida (web responsiva para desktop, Android e iOS via browser)
**Identidade Visual:** Midnight Express — dark mode premium, glassmorphism, gradiente purple→pink
**Referências de mercado:** iFood, 99food, Keeta, Rappi

FoodFlow é um marketplace de delivery que conecta restaurantes a consumidores finais, com catálogo curado, descoberta por categorias, carrinho server-side, checkout multi-método integrado ao ECP Digital Bank e à passarela interna ECP Pay, assistente conversacional de IA embutido e painéis dedicados para Restaurante e Admin da Plataforma.

---

## 2. Problema e Oportunidade

**Problema do consumidor:** Apps de delivery existentes priorizam volume sobre experiência. O usuário navega por listas genéricas, com pouca diferenciação visual entre restaurantes e fricção em fluxos recorrentes (busca, carrinho, checkout, acompanhamento).

**Problema do restaurante:** Restaurantes ficam invisíveis no catálogo sem investir em mídia paga. Falta transparência sobre comissionamento, splits de pagamento e desempenho por pedido.

**Oportunidade:** Entregar um marketplace com UX premium dark-mode, integração nativa ao banco digital do grupo (ECP Digital Bank) + passarela ECP Pay com split automático por restaurante, e um assistente de IA que permite o consumidor navegar, montar carrinho e pagar via chat em linguagem natural.

---

## 3. Público-Alvo

### 3.1 Consumidor Primário
- **Perfil:** Jovens adultos e profissionais (22-40 anos), áreas urbanas (São Paulo e capitais)
- **Comportamento:** Pedem delivery 3-5x/semana, sensíveis a promoções mas valorizam qualidade
- **Dor principal:** Fadiga de decisão, falta de confiança em restaurantes desconhecidos
- **Motivação:** Praticidade, descoberta visual de restaurantes, economia real com cupons

### 3.2 Restaurante Parceiro
- **Perfil:** Restaurantes artesanais e de médio porte, com cardápio curado
- **Categorias ativas (seed):** Hambúrguer, Japonês, Pizza, Saudável, Massas, Brasileira
- **Dor principal:** Baixa visibilidade, custo de aquisição, dependência de algoritmos opacos
- **Motivação:** Presença premium, gestão completa do cardápio, splits transparentes, dados de pedidos

### 3.3 Admin da Plataforma
- **Perfil:** Time de operações do FoodFlow
- **Motivação:** Métricas consolidadas, controle de restaurantes, categorias e cupons

---

## 4. Proposta de Valor

| Para | Proposta |
|------|----------|
| **Consumidor** | Descoberta visual rápida, assistente de IA, carrinho persistente, 3 métodos de pagamento (cartão cadastrado, débito ECP, PIX QR Code) |
| **Restaurante** | Painel próprio, CRUD de cardápio, pedidos em tempo quase real, visão de settlements com split 85/15 |
| **Plataforma** | Fee de 15% por pedido, agregação de métricas, controle global de restaurantes/categorias/cupons |

---

## 5. Escopo Implementado (v1.0 — 20/04/2026)

### 5.1 Funcionalidades do Consumidor

#### F01 — Onboarding e Autenticação
- Cadastro com email, senha, nome e telefone opcional (`POST /api/auth/register`)
- Login com email/senha (`POST /api/auth/login`)
- Refresh token (`POST /api/auth/refresh`)
- JWT com expiração de 24h + refresh de 7d (access + refresh separados)
- Hash bcryptjs com 12 rounds
- Sessão persistida em `localStorage` (`ff_token`)

#### F02 — Home e Descoberta
- Hero banner com chamada promocional e cupom `MVP10`
- Busca por nome, cuisine ou subtitle (filtro client-side)
- Chips de categorias (Todos + 6 categorias seed)
- Grid de cards de restaurantes com: nome, cuisine, rating, review_count, ETA (min-max), taxa de entrega, pedido mínimo, tags, cover gradient, emoji hero, promo text
- Contagem de resultados filtrados
- `GET /api/restaurants?category=&q=&page=&limit=`

#### F03 — Detalhe do Restaurante e Cardápio
- Página `/restaurant/:id` com banner (cover_gradient + hero_emoji) e cardápio completo
- Menu items agrupáveis por categoria interna (ex: Massas, Entradas, Sobremesas)
- Cada item exibe: emoji, nome, descrição, preço, badge (Best Seller, Novo, Vegetariano, etc.)
- Botão "Adicionar" por item

#### F04 — Carrinho de Compras
- Carrinho server-side (`carts` + `cart_items`) persistido por usuário
- Também há representação client-side via `CartContext` (stateful, sincronizado ao pagamento)
- Sidebar desktop (`CartPanel`) + bottom sheet mobile
- Controle de quantidade (+/−), remoção ao zerar
- Endpoints: `GET/POST/PUT/DELETE /api/cart`, `POST /api/cart/items`, `PUT/DELETE /api/cart/items/:itemId`
- Badge de contagem no BottomNav

#### F05 — Checkout e Pagamento (3 métodos)

**Tela `/checkout`** — resumo + endereço + cupom + seletor de método:

**Opção A — Cartão de Crédito cadastrado (default)** — `/checkout/credit-card`
- Lista cartões do usuário (`GET /api/credit-cards`)
- Usuário seleciona cartão e confirma
- Backend tenta ECP Pay primeiro (`POST /pay/card` na ECP Pay) com fallback para ecp-digital-bank (`POST /cards/purchase-by-number`)
- Splits calculados e registrados após confirmação
- Endpoint: `POST /api/payments/credit-card`

**Opção B — Cartão ECP Digital Bank (débito via PIX transfer)** — `/checkout/card`
- Usuário informa email/senha do ecp-digital-bank
- FoodFlow faz proxy: `POST /api/payments/bank-auth` → retorna JWT do banco
- `GET /api/payments/bank-cards` lista cartões virtuais (filtra bloqueados)
- `GET /api/payments/bank-balance` verifica saldo em centavos
- Ao confirmar, `POST /api/payments/card` executa `POST /pix/transfer` no banco com chave PIX da plataforma
- Pedido é confirmado automaticamente em caso de sucesso

**Opção C — PIX QR Code** — `/checkout/pix`
- `POST /api/payments/pix` gera QR Code (via ECP Pay com fallback ecp-digital-bank)
- Backend armazena `pix_qrcode_data`, `pix_qrcode_image`, `pix_expiration` (default 10 min)
- Frontend abre SSE em `GET /api/payments/:id/events` (auth via query param `?token=`)
- Quando pagamento é confirmado (webhook ECP Pay ou banco), SSE emite `payment_update` → frontend redireciona
- Worker de expiração roda a cada 30s marcando PIX vencidos como `expired` e cancelando ordens

#### F06 — Pedidos (Confirmação, Status e Histórico)
- Tela `/orders/:id` com confirmação e acompanhamento de status
- Tela `/orders` com histórico paginado
- Status: `pending_payment`, `payment_failed`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`
- Endpoints: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status`

#### F07 — Favoritos
- Marcar/desmarcar restaurantes favoritos
- Tela `/favorites` lista restaurantes salvos
- Endpoints: `GET/POST /api/favorites`, `DELETE /api/favorites/:restaurantId`

#### F08 — Perfil do Consumidor
- Tela `/profile` com dados pessoais editáveis (nome, telefone)
- Gestão de endereços salvos (CRUD)
- Logout
- Endpoints: `GET/PUT /api/consumer/profile`, `GET/POST/DELETE /api/consumer/addresses`

#### F09 — Cartões de Crédito do Consumidor (novo vs. spec antiga)
- Tela `/credit-cards` com CRUD de cartões pré-cadastrados
- Endpoints: `GET/POST /api/credit-cards`, `DELETE /api/credit-cards/:id`, `PATCH /api/credit-cards/:id/default`
- Armazenamento: `card_number` completo (MVP — não há tokenização), `card_holder`, `card_expiry`, `card_last4`, `is_default`

#### F10 — Chat Assistant (novo — não constava na spec antiga)
- Widget flutuante (`ChatWidget`) disponível em todas as telas autenticadas
- Suporta desktop (400×600px) e mobile (fullscreen)
- Quick actions: "Ver restaurantes", "Buscar comida", "Ver meu carrinho", "Meus pedidos"
- Arquitetura multi-agente:
  - **Orchestrator:** classifica intenção em 15 categorias (BROWSE/ORDER/PAYMENT/CART/FAQ/GENERAL)
  - **Knowledge agent:** responde FAQs
  - **Transaction agent:** loop agêntico com 13 tools (listar restaurantes, ver cardápio, add/remove carrinho, criar pedido, pagar PIX, pagar cartão, status, histórico, etc.)
- LLM: Anthropic Claude (`claude-sonnet-4-20250514` default, configurável via `AI_MODEL`)
- Persistência em `chat_conversations` + `chat_messages` com histórico (últimas 10 msgs) por conversa
- Endpoints: `POST /api/chat/messages`, `GET /api/chat/conversations`, `GET /api/chat/conversations/:id/messages`, `POST /api/chat/conversations`, `PATCH /api/chat/conversations/:id/archive`

### 5.2 Funcionalidades do Restaurante — Painel `/restaurant-panel`

#### F11 — Gestão de Cardápio
- CRUD completo de items (nome, descrição, preço, emoji, badge, categoria interna, sort_order, is_available)
- Endpoints: `GET/POST /api/restaurant-admin/menu`, `PUT/DELETE /api/restaurant-admin/menu/:id`

#### F12 — Pedidos Recebidos
- Lista de pedidos do restaurante (filtrada por `order_items.restaurant_id`)
- Ignora pedidos em `pending_payment` / `payment_failed`
- Items de cada pedido filtrados para apenas o restaurante logado
- Endpoint: `GET /api/restaurant-admin/orders`
- Atualização de status via `PATCH /api/orders/:id/status` (reutiliza rota comum com autorização por role)

#### F13 — Configurações do Restaurante
- Edição de: nome, subtitle, cuisine, cover_gradient, hero_emoji, promo_text, eta_min/max, delivery_fee, min_order, is_open
- Endpoint: `PUT /api/restaurant-admin/settings`

#### F14 — Settlements (novo vs. spec antiga)
- Visão consolidada de pedidos pagos + valor que cabe ao restaurante (85% dos seus items)
- Campos `pj_cnpj` e `pj_pix_key` configurados por restaurante
- Endpoint: `GET /api/restaurant-admin/settlements`

### 5.3 Funcionalidades da Plataforma — Painel `/admin`

#### F15 — Dashboard
- Métricas agregadas: total de restaurantes, total de pedidos, receita total, ticket médio, cupons ativos, usuários, pedidos do dia
- Endpoint: `GET /api/admin/dashboard`

#### F16 — Gestão de Restaurantes
- Listagem completa e ações de ativar/suspender / abrir/fechar
- Endpoints: `GET /api/admin/restaurants`, `PATCH /api/admin/restaurants/:id`

#### F17 — Gestão de Categorias
- CRUD completo; não permite deletar categoria com restaurantes associados
- Endpoints: `GET/POST /api/admin/categories`, `PUT/DELETE /api/admin/categories/:id`

#### F18 — Gestão de Cupons
- CRUD completo com `discount_type` fixed/percent, `min_order`, `max_uses`, `expires_at`, `is_active`
- Seed: `MVP10` (R$ 10 off, min R$ 80, 1000 usos) e `FRETEGRATIS` (0, 500 usos)
- Endpoints: `GET/POST /api/admin/coupons`, `PUT /api/admin/coupons/:id`

---

## 6. Funcionalidades Fora do Escopo / Não Implementadas

Em comparação com a spec 2026-03 original:

- **Scripts `setup.mjs` / `register-webhook.mjs` / `deploy.mjs`** — não implementados; apenas `seed`, `migrate`, `start`, `dev` via `package.json`.
- **Schemas TypeBox em `schemas/`** — estão inline nas rotas, não há pasta dedicada.
- **`useDebounce` / `useAuth` / `useCart` como hooks standalone** — substituídos pelo uso direto de `useContext(AuthContext)` e `useContext(CartContext)`.
- **Assinatura HMAC validada no webhook do ECP Pay** — apenas o webhook legado `/api/webhooks/bank/pix-received` valida HMAC; o novo `/api/webhooks/ecp-pay/payment-confirmed` é aberto (confia no `X-API-Key`/source).
- **Rastreamento GPS, chat consumer-restaurante, sistema de avaliação, push, múltiplas cidades, app nativo** — seguem fora do escopo.
- **Programa de fidelidade** — não implementado.

---

## 7. Métricas de Sucesso (Target)

| Métrica | Meta MVP | Descrição |
|---------|----------|-----------|
| **Taxa de conversão** | > 8% | Visitantes que concluem um pedido |
| **Ticket médio** | > R$ 45 | Valor médio por pedido |
| **Taxa de recompra** | > 25% | Usuários que pedem novamente em 30 dias |
| **Tempo até primeiro pedido** | < 5 min | Da abertura do app até o checkout |
| **Uso do chat** | > 20% dos pedidos | Pedidos originados/assistidos pelo chat IA |
| **NPS** | > 40 | Net Promoter Score dos consumidores |

---

## 8. Jornadas Críticas (implementadas)

### Jornada 1 — Pedido com Cartão de Crédito cadastrado (default)
1. Usuário faz login em `/login` → redireciona para `/`
2. Escolhe categoria ou busca restaurante
3. Abre `/restaurant/:id` → adiciona itens ao carrinho
4. Abre bottom sheet / sidebar → clica "Ir para checkout" → `/checkout`
5. Aplica cupom (opcional) → seleciona "Cartão de Crédito"
6. `/checkout/credit-card` → seleciona cartão default
7. Backend: cria `order` (pending_payment), cria `payment` (processing), chama ECP Pay
8. Em caso de sucesso: `payment.status = completed`, `order.status = confirmed`, splits registrados
9. Redireciona para `/orders/:id`

### Jornada 2 — Pedido com PIX QR Code (webhook + SSE)
1. Passos 1-5 idênticos, escolhe "PIX QR Code" → `/checkout/pix`
2. Backend chama `POST /pay/pix` no ECP Pay com `callback_url`
3. Frontend exibe QR Code + copia-e-cola + timer (10 min)
4. Frontend abre `EventSource('/api/payments/:id/events?token=...')`
5. Usuário paga no app bancário → ECP Pay envia webhook `POST /api/webhooks/ecp-pay/payment-confirmed`
6. FoodFlow atualiza `payment.status = completed`, `order.status = confirmed`, emite SSE
7. Frontend recebe `payment_update` → limpa carrinho → navega para `/orders/:id`
8. Se expirar 10 min sem pagamento: worker marca como `expired`, ordem vai para `cancelled`, SSE notifica

### Jornada 3 — Pedido via Chat IA
1. Usuário abre widget → "Quero uma pizza"
2. Orchestrator classifica como `BROWSE:SEARCH` → routeia para Transaction agent
3. Agente chama `search_food("pizza")` → retorna items
4. Usuário: "Adiciona 1 Margherita no carrinho"
5. Agente chama `add_to_cart(menu_item_id)` → confirma com total atualizado
6. Usuário: "Quero fechar com PIX"
7. Agente chama `create_order(pix_qrcode)` → depois `pay_with_pix(order_id)`
8. Retorna código copia-e-cola no chat

### Jornada 4 — Restaurante Gerencia Pedido
1. Restaurante (role `restaurant`) loga → redireciona para `/restaurant-panel`
2. Visualiza lista de pedidos recebidos (apenas itens do próprio restaurante)
3. Aciona `PATCH /api/orders/:id/status` com transições controladas
4. Também acessa Settlements para ver `restaurant_share` acumulado

---

## 9. Requisitos Não-Funcionais

- **Performance:** Fastify com better-sqlite3 (synchronous); WAL mode ativo
- **Responsividade:** Breakpoints em 720px (mobile), 980px (tablet), 1180px (desktop), max 1440px
- **Segurança:** bcryptjs 12 rounds, JWT 24h access / 7d refresh, rate limit global (100 req/min/IP) + específico (10 req/min auth, 5 req/min payments), `@fastify/helmet`, CORS configurável, HMAC no webhook do banco
- **Disponibilidade:** circuit breaker na integração com ecp-digital-bank (5 falhas → bloqueia 30s), timeout de 10s, retry 1x em 5xx
- **Idempotência:** webhooks retornam 200 e verificam estado atual antes de processar
- **SSE:** reconexão automática com backoff exponencial (até 5 tentativas) no cliente

---

## 10. Restrições e Premissas

### Restrições
- Stack Node 20+ / Fastify 4 / React 18 / SQLite (better-sqlite3)
- Deploy assumido em VPS Linux com Fastify servindo `client/dist` como estático
- Identidade visual Midnight Express (dark only)
- Windows 11 no desenvolvimento (bcryptjs, better-sqlite3)

### Premissas
- Dados iniciais carregados via `seed.mjs` (7 categorias, 6 restaurantes, 47 menu items, 2 cupons, 13 usuários sincronizados com ecp-digital-bank, 11 cartões pré-cadastrados)
- `Senha@123` para todos os consumidores seed (para facilitar demo integrada com ecp-digital-bank)
- Plataforma FoodFlow mantém conta própria no ecp-digital-bank (`foodflow@ecportilho.com`) que recebe os pagamentos via PIX transfer ou QR Code
- ECP Pay (passarela interna) atua como camada preferencial; ecp-digital-bank é fallback
- Entrega é simulada (sem integração com entregadores)
- Endereço default hardcoded no checkout (Rua Augusta, 1234 — SP) — F08 existe mas o checkout ainda não consome o endereço default do usuário
