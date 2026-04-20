# Tech Spec — ECP Food (FoodFlow) — Versão 2026-04-20

> Spec regenerada a partir do estado implementado em `03-product-delivery/` em 20/04/2026.

## 1. Visão Técnica

FoodFlow é uma aplicação web full-stack em monorepo dentro da pasta `03-product-delivery/` do repositório `ecp-digital-food`. Arquitetura: backend Node.js/Fastify (ESM, `.mjs`) expondo API REST + SSE + Webhooks; frontend React 18 SPA com Vite e CSS Modules; persistência SQLite via `better-sqlite3` (synchronous). Em produção o próprio Fastify serve `client/dist` como estático.

---

## 2. Stack Tecnológica

### 2.1 Backend (`03-product-delivery/package.json:12`)

| Dependência | Versão | Uso |
|-------------|--------|-----|
| `fastify` | ^4.28.1 | Framework HTTP |
| `@fastify/cors` | ^9.0.1 | CORS configurável por env |
| `@fastify/helmet` | ^11.1.1 | Security headers (CSP desligado em dev) |
| `@fastify/rate-limit` | ^9.1.0 | Rate limit global (100/min) + por rota |
| `@fastify/static` | ^7.0.4 | Servir `client/dist` em produção |
| `@sinclair/typebox` | ^0.32.35 | Schema validation inline em cada rota |
| `better-sqlite3` | ^11.6.0 | Persistência synchronous (WAL mode) |
| `bcryptjs` | ^2.4.3 | Hash de senhas (12 rounds) |
| `jsonwebtoken` | ^9.0.2 | JWT access (24h) + refresh (7d) |
| `@anthropic-ai/sdk` | ^0.39.0 | Chat assistant (Claude Sonnet 4) |

**Scripts** (`package.json:6`):
```
start    -> node server/index.mjs
dev      -> node --watch server/index.mjs
seed     -> node server/seed.mjs
migrate  -> node server/database.mjs
```

Node.js exigido: `>=20.0.0`. Sem dotenv — `config.mjs` parseia `.env` manualmente.

### 2.2 Frontend (`client/package.json:11`)

| Dependência | Versão | Uso |
|-------------|--------|-----|
| `react` | ^18.3.1 | UI |
| `react-dom` | ^18.3.1 | Render |
| `react-router-dom` | ^6.26.0 | Roteamento |
| `lucide-react` | ^0.400.0 | Ícones funcionais |
| `vite` | ^5.4.0 (dev) | Build/dev server |
| `@vitejs/plugin-react` | ^4.3.1 (dev) | Plugin React |

Scripts: `dev` (vite), `build` (vite build), `preview` (vite preview).

### 2.3 Estilo

- **CSS Modules** por componente (`.module.css`), isolamento automático
- **CSS Custom Properties** em `client/src/styles/tokens.css` (design tokens Midnight Express)
- **Global reset + utility classes** em `client/src/styles/global.css` (.h1/.h2/.h3/.h4, `.input-field`, scrollbar)
- **Animações** em `client/src/styles/animations.css`
- **Sem Tailwind, sem styled-components, sem CSS-in-JS runtime**

---

## 3. Estrutura do Monorepo

```
ecp-digital-food/
├── 00-specs/                          # Specs originais + versões datadas
├── 01-strategic-context/ ... 06-logs/ # Artefatos do squad
└── 03-product-delivery/               # Código da aplicação
    ├── package.json                   # Dependências do server
    ├── architecture.json              # Output do software-architect
    ├── qa-report.json                 # Output do QA
    ├── test-map.json
    ├── hitl-7.json … hitl-10.json
    ├── data/                          # foodflow.db (gitignored)
    │
    ├── server/
    │   ├── index.mjs                  # Bootstrap Fastify + registro de rotas + expiration worker
    │   ├── config.mjs                 # Carrega .env manualmente, exporta `config`
    │   ├── database.mjs               # initDb + migrations inline (CREATE TABLE IF NOT EXISTS)
    │   ├── seed.mjs                   # Seed de dados (roda como script)
    │   ├── auth.mjs                   # generateTokens, verifyAccessToken, authMiddleware, requireRole
    │   │
    │   ├── routes/
    │   │   ├── auth.routes.mjs
    │   │   ├── consumer.routes.mjs
    │   │   ├── restaurant.routes.mjs
    │   │   ├── category.routes.mjs
    │   │   ├── cart.routes.mjs
    │   │   ├── order.routes.mjs
    │   │   ├── coupon.routes.mjs
    │   │   ├── favorite.routes.mjs
    │   │   ├── payment.routes.mjs
    │   │   ├── credit-card.routes.mjs
    │   │   ├── webhook.routes.mjs
    │   │   ├── admin.routes.mjs
    │   │   ├── restaurant-admin.routes.mjs
    │   │   └── chat.routes.mjs
    │   │
    │   └── services/
    │       ├── auth.service.mjs
    │       ├── user.service.mjs
    │       ├── restaurant.service.mjs
    │       ├── category.service.mjs
    │       ├── cart.service.mjs
    │       ├── order.service.mjs
    │       ├── coupon.service.mjs
    │       ├── favorite.service.mjs
    │       ├── credit-card.service.mjs
    │       ├── payment.service.mjs        # Orquestra ECP Pay + ecp-digital-bank
    │       ├── bank-integration.mjs        # Client HTTP ecp-digital-bank + circuit breaker
    │       ├── ecp-pay-client.mjs          # Client HTTP ECP Pay (interno)
    │       ├── split-calculator.mjs        # Regras de split 85/15
    │       ├── sse-manager.mjs             # Map<paymentId, Set<res>> + emit/closeAll
    │       ├── webhook-handler.mjs         # HMAC validation + processPixReceived
    │       ├── chat.service.mjs            # sendMessage + conversation CRUD
    │       └── chat-agents/
    │           ├── orchestrator.mjs        # classifyIntent (15 intents) + handleGeneral
    │           ├── knowledge.mjs           # FAQ agent
    │           └── transaction.mjs         # Agentic loop com 13 tools
    │
    └── client/
        ├── index.html                      # Entry Vite
        ├── vite.config.js
        ├── package.json
        │
        ├── src/
        │   ├── main.jsx
        │   ├── App.jsx                     # BrowserRouter + Providers + Routes + ChatWidget
        │   │
        │   ├── context/
        │   │   ├── AuthContext.jsx
        │   │   └── CartContext.jsx
        │   │
        │   ├── hooks/
        │   │   ├── useApi.js                # Fetch wrapper com JWT + error handling
        │   │   ├── useChat.js                # Hook do ChatWidget (send + histórico)
        │   │   └── useSSE.js                 # EventSource com reconnect + token via query
        │   │
        │   ├── pages/
        │   │   ├── LoginPage.jsx
        │   │   ├── RegisterPage.jsx
        │   │   ├── HomePage.jsx
        │   │   ├── RestaurantPage.jsx
        │   │   ├── CheckoutPage.jsx
        │   │   ├── CardPaymentPage.jsx       # Cartão ECP Digital Bank
        │   │   ├── CreditCardPaymentPage.jsx # Cartão cadastrado (default)
        │   │   ├── PixPaymentPage.jsx
        │   │   ├── OrderConfirmedPage.jsx
        │   │   ├── OrdersPage.jsx
        │   │   ├── FavoritesPage.jsx
        │   │   ├── ProfilePage.jsx
        │   │   ├── CreditCardsPage.jsx
        │   │   ├── RestaurantPanelPage.jsx   # role=restaurant
        │   │   └── AdminPage.jsx             # role=admin
        │   │
        │   ├── components/
        │   │   ├── layout/                   # Shell, TopBar, BottomNav
        │   │   ├── ui/                       # Badge, Button, CategoryChips, GlassCard, Toast
        │   │   ├── restaurant/               # RestaurantCard, RestaurantGrid, MenuItemCard
        │   │   ├── cart/                     # CartPanel, CartItem, CartSummary
        │   │   ├── payment/                  # PaymentMethodSelector, BankLoginForm, CardSelector, PixQrCode, PaymentStatus
        │   │   └── chat/                     # ChatWidget, ChatMessages, ChatInput, ChatBubble
        │   │
        │   ├── lib/
        │   │   └── formatters.js
        │   │
        │   └── styles/
        │       ├── tokens.css
        │       ├── global.css
        │       └── animations.css
        │
        └── public/
```

**Nota vs spec antiga:** não existem `server/schemas/`, `server/utils/`, `scripts/`, `client/public/manifest.json`, `client/public/favicon.svg`, nem `hooks/useDebounce.js`, `hooks/useAuth.js` standalone. O arquivo `CartContext.jsx` cobre todo o estado do carrinho.

---

## 4. Modelo de Dados (SQLite) — fonte: `server/database.mjs`

Todas as tabelas são criadas via `CREATE TABLE IF NOT EXISTS` no `initDb()`. PKs usam `lower(hex(randomblob(8)))` (16 chars hex); `payments.id` tem prefixo `p_`.

### users (`database.mjs:33`)
```sql
id TEXT PK
email TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
name TEXT NOT NULL
phone TEXT
role TEXT CHECK(role IN ('consumer','restaurant','admin')) DEFAULT 'consumer'
restaurant_id TEXT          -- ref ao restaurante (para role=restaurant)
created_at, updated_at
```

### addresses (`database.mjs:45`)
```sql
id, user_id FK users ON DELETE CASCADE,
label DEFAULT 'Casa', street, number, complement, neighborhood,
city DEFAULT 'São Paulo', state DEFAULT 'SP', zip_code,
is_default INTEGER DEFAULT 0, created_at
```

### categories (`database.mjs:60`)
```sql
id, name UNIQUE, emoji, sort_order DEFAULT 0, is_active DEFAULT 1
```

### restaurants (`database.mjs:68`)
```sql
id, name, slug UNIQUE, cuisine, subtitle,
category_id FK categories,
rating REAL, review_count, eta_min, eta_max, delivery_fee, min_order,
cover_gradient, hero_emoji, promo_text, note,
tags TEXT DEFAULT '[]'     -- JSON array
pj_cnpj, pj_pix_key        -- usados pelo split-calculator
is_active, is_open, created_at, updated_at
```

### menu_items (`database.mjs:94`)
```sql
id, restaurant_id FK CASCADE, name, description, price REAL,
emoji DEFAULT '🍽️', badge, category, sort_order,
is_available DEFAULT 1, created_at, updated_at
```

### carts + cart_items (`database.mjs:109`)
```sql
carts: id, user_id UNIQUE FK CASCADE, updated_at
cart_items: id, cart_id FK CASCADE, menu_item_id FK, quantity >0, UNIQUE(cart_id, menu_item_id)
```

### orders (`database.mjs:123`)
```sql
id, user_id FK, address_text, subtotal, delivery_fee, discount, total,
coupon_code,
payment_method CHECK IN ('card_ecp','pix_qrcode','credit_card') DEFAULT 'pix_qrcode',
status CHECK IN ('pending_payment','payment_failed','confirmed','preparing','out_for_delivery','delivered','cancelled'),
created_at, updated_at
```

### order_items (`database.mjs:138`)
```sql
id, order_id FK CASCADE, restaurant_id FK, restaurant_name,
menu_item_id, item_name, item_price, quantity
```

### favorites (`database.mjs:149`)
```sql
id, user_id FK CASCADE, restaurant_id FK CASCADE, created_at, UNIQUE(user_id, restaurant_id)
```

### coupons (`database.mjs:157`)
```sql
id, code UNIQUE,
discount_type CHECK IN ('fixed','percent') DEFAULT 'fixed',
discount_value, min_order, max_uses, uses_count, is_active, expires_at, created_at
```

### payments (`database.mjs:170`)
```sql
id TEXT DEFAULT ('p_' || hex(randomblob(8))),
order_id FK, user_id FK,
method CHECK IN ('card_ecp','pix_qrcode','credit_card'),
status CHECK IN ('pending','processing','completed','failed','expired') DEFAULT 'pending',
amount_cents INTEGER NOT NULL,
bank_transaction_id, bank_jwt_token,
pix_qrcode_data, pix_qrcode_image, pix_expiration,
card_last4,
webhook_received_at, webhook_payload, error_message,
created_at, updated_at
```

### credit_cards (`database.mjs:190`) — **novo vs. spec antiga**
```sql
id, user_id FK CASCADE,
card_number TEXT NOT NULL,     -- MVP armazena o número completo (sem tokenização)
card_holder, card_expiry, card_last4,
is_default DEFAULT 0, created_at
```

### chat_conversations + chat_messages (`database.mjs:211`) — **novo vs. spec antiga**
```sql
chat_conversations: id (16 bytes), user_id FK CASCADE, title,
  status CHECK IN ('active','archived') DEFAULT 'active', created_at, updated_at

chat_messages: id (16 bytes), conversation_id FK CASCADE,
  role CHECK IN ('user','assistant','system'),
  content, agent, intent, tool_calls (JSON), metadata, created_at
```

### Índices
```sql
idx_payments_status_expiration (status, pix_expiration)
idx_orders_user_id, idx_order_items_order_id,
idx_cart_items_cart_id, idx_menu_items_restaurant_id,
idx_favorites_user_id, idx_addresses_user_id, idx_credit_cards_user_id,
idx_chat_conv_user, idx_chat_conv_updated, idx_chat_msg_conv
```

---

## 5. API REST — Endpoints

### 5.1 Autenticação (`server/routes/auth.routes.mjs`)

| Método | Rota | Auth | Rate-limit |
|--------|------|------|------------|
| POST | `/api/auth/register` | — | 10/min |
| POST | `/api/auth/login` | — | 10/min |
| POST | `/api/auth/refresh` | — | — |

### 5.2 Consumidor (`consumer.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| GET/PUT | `/api/consumer/profile` | Sim |
| GET/POST | `/api/consumer/addresses` | Sim |
| DELETE | `/api/consumer/addresses/:id` | Sim |

### 5.3 Catálogo (`restaurant.routes.mjs`, `category.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/categories` | — |
| GET | `/api/restaurants?category=&q=&page=&limit=` | — |
| GET | `/api/restaurants/:id` | — |
| GET | `/api/restaurants/:id/menu` | — |

### 5.4 Carrinho (`cart.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/cart` | Sim |
| POST | `/api/cart/items` | Sim |
| PUT | `/api/cart/items/:itemId` | Sim |
| DELETE | `/api/cart/items/:itemId` | Sim |
| DELETE | `/api/cart` | Sim |

### 5.5 Pedidos (`order.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/orders` | Sim (consumer) |
| GET | `/api/orders?page=&limit=` | Sim |
| GET | `/api/orders/:id` | Sim |
| PATCH | `/api/orders/:id/status` | Sim (consumer/restaurant/admin conforme regra) |

### 5.6 Cupons (`coupon.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/coupons/validate` | Sim |

### 5.7 Favoritos (`favorite.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| GET/POST | `/api/favorites` | Sim |
| DELETE | `/api/favorites/:restaurantId` | Sim |

### 5.8 Cartões do Usuário (`credit-card.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| GET/POST | `/api/credit-cards` | Sim |
| DELETE | `/api/credit-cards/:id` | Sim |
| PATCH | `/api/credit-cards/:id/default` | Sim |

### 5.9 Pagamentos (`payment.routes.mjs`) — 5 req/min/usuário

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/payments/bank-auth` | Proxy auth no ecp-digital-bank |
| GET | `/api/payments/bank-cards?bank_token=` | Lista cartões virtuais do banco |
| GET | `/api/payments/bank-balance?bank_token=` | Saldo em centavos |
| POST | `/api/payments/card` | Pagar com cartão ECP via PIX transfer |
| POST | `/api/payments/credit-card` | Pagar com cartão cadastrado (ECP Pay com fallback bank) |
| POST | `/api/payments/pix` | Gerar QR Code PIX (ECP Pay com fallback bank) |
| GET | `/api/payments/:id/events` | SSE stream (auth via Bearer ou `?token=`) |

### 5.10 Webhooks (`webhook.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/webhooks/bank/pix-received` | HMAC-SHA256 (`X-Webhook-Signature`) |
| POST | `/api/webhooks/ecp-pay/payment-confirmed` | Aberto (confia em `X-API-Key` da passarela interna) |

### 5.11 Admin Restaurante (`restaurant-admin.routes.mjs`) — `preHandler: requireRole('restaurant')`

| Método | Rota |
|--------|------|
| GET/POST | `/api/restaurant-admin/menu` |
| PUT/DELETE | `/api/restaurant-admin/menu/:id` |
| GET | `/api/restaurant-admin/orders` |
| PUT | `/api/restaurant-admin/settings` |
| GET | `/api/restaurant-admin/settlements` |

### 5.12 Admin Plataforma (`admin.routes.mjs`) — `preHandler: requireRole('admin')`

| Método | Rota |
|--------|------|
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/restaurants` |
| PATCH | `/api/admin/restaurants/:id` |
| GET/POST | `/api/admin/categories` |
| PUT/DELETE | `/api/admin/categories/:id` |
| GET/POST | `/api/admin/coupons` |
| PUT | `/api/admin/coupons/:id` |

### 5.13 Chat AI (`chat.routes.mjs`)

| Método | Rota | Auth |
|--------|------|------|
| POST | `/api/chat/messages` | Sim |
| GET | `/api/chat/conversations` | Sim |
| GET | `/api/chat/conversations/:id/messages` | Sim |
| POST | `/api/chat/conversations` | Sim |
| PATCH | `/api/chat/conversations/:id/archive` | Sim |

### 5.14 Health

| Método | Rota |
|--------|------|
| GET | `/api/health` |

---

## 6. Regras de Negócio

### 6.1 Carrinho
- Um carrinho único por usuário (`carts.user_id UNIQUE`)
- Adicionar item existente: incrementa `quantity` (ver `cart.service.mjs`)
- Quantity 0 ou menor → remove (unique constraint + `CHECK(quantity > 0)`)

### 6.2 Cálculo do Pedido (implementado em `order.service.mjs` / `cart.service.mjs`)
- **Subtotal:** `sum(price * quantity)`
- **Delivery fee:** somatório de `restaurants.delivery_fee` por restaurante distinto no carrinho; **grátis se subtotal >= R$ 120**
- **Desconto:** aplicado por cupom validado (fixed ou percent) respeitando `min_order`
- **Total:** `max(subtotal + delivery_fee - discount, 0)`
- Valores em `amount_cents = Math.round(total * 100)` ao comunicar com banco/passarela

### 6.3 Fluxo de Status do Pedido
```
pending_payment ──(payment completed)──▶ confirmed
                └──(payment failed)───▶ payment_failed
                └──(pix expired)──────▶ cancelled
confirmed ──▶ preparing ──▶ out_for_delivery ──▶ delivered
                                                  └──▶ cancelled
```

### 6.4 Autenticação (`auth.mjs`)
- JWT access com `{ id, email, role }`, expiração 24h
- Refresh token, expiração 7d
- `authMiddleware` aceita `Authorization: Bearer <token>` **ou** `?token=` query param (para SSE)
- `requireRole(...)` factory para RBAC

### 6.5 Cupons (`coupon.service.mjs`)
- Validação: ativo, não expirado, `subtotal >= min_order`, `uses_count < max_uses`
- Seeds: `MVP10` (R$ 10 off, min R$ 80, 1000 usos), `FRETEGRATIS` (0, 500 usos)

### 6.6 Pagamentos — Camada unificada em `services/payment.service.mjs`

#### 6.6.1 Crédito com Cartão Cadastrado — `payWithCreditCard` (`payment.service.mjs:198`)
1. Valida `order.status = pending_payment` e `credit_card` pertence ao usuário
2. Cria `payments` com `method='credit_card'`, `status='processing'`
3. Tenta `createCardCharge` na **ECP Pay** (`/pay/card`); se falhar, **fallback** para `bankCardPurchaseByNumber` no ecp-digital-bank (`/cards/purchase-by-number`)
4. Em sucesso: `payment.status='completed'`, `order.status='confirmed'`, chama `processOrderSplits`
5. Em falha: `payment.status='failed'`, `order.status='payment_failed'`

#### 6.6.2 Cartão ECP Digital Bank — `payWithCard` (`payment.service.mjs:117`)
1. Chama `bankGetBalance(bank_token)` — se saldo < total: retorna 422 `INSUFFICIENT_BALANCE`
2. Chama `bankPixTransfer(bank_token, amountCents, "ECP Food Pedido #...")` com chave PIX da plataforma
3. Em sucesso: `payment.status='completed'`, limpa `bank_jwt_token`, `order.status='confirmed'`, processa splits
4. Em falha: marca como `failed` + `payment_failed`

#### 6.6.3 PIX QR Code — `payWithPix` (`payment.service.mjs:302`)
1. Cria `payments` com `method='pix_qrcode'`, `status='pending'`
2. Preferencial: `createPixCharge` na **ECP Pay** com `callback_url = http://127.0.0.1:{PORT}/api/webhooks/ecp-pay/payment-confirmed`
3. Fallback: `bankGeneratePixQrCode` com JWT da plataforma (cache de 23h em `getPlatformBankToken`)
4. Armazena `pix_qrcode_data`, `pix_qrcode_image`, `pix_expiration = now + 10 min`
5. Pre-registra splits na ECP Pay (`createSplits`) para execução ao confirmar o PIX
6. Expiration worker (`server/index.mjs:153`) roda a cada 30s, marca como `expired`, cancela `order`, emite SSE `{status: expired}`

#### 6.6.4 Webhook ECP Pay — `webhook.routes.mjs:38`
- Sem validação HMAC (passarela interna)
- Filtra somente `status === 'completed'`
- Localiza `payment` por `bank_transaction_id = payload.transaction_id`
- Idempotente (checa se já está `completed`)
- Atualiza `payment.status='completed'`, `order.status='confirmed'`, emite SSE e fecha

#### 6.6.5 Webhook ecp-digital-bank — `webhook-handler.mjs`
- Valida `X-Webhook-Signature` via `crypto.timingSafeEqual` contra HMAC-SHA256 do raw body
- Extrai `payment_id` do campo `description` via regex `/FoodFlow #(p_\w+)/`
- Valida `amountInCents` bate com `payments.amount_cents`
- Atualiza em transação + emite SSE + sempre retorna 200

### 6.7 Splits (`split-calculator.mjs`)
- **Platform fee:** 15% fixo (`PLATFORM_FEE_PERCENT`)
- Por restaurante: recebe 85% do subtotal dos seus items (em centavos)
- Plataforma recebe o residual (taxas de entrega + fees)
- Splits registrados na ECP Pay via `createSplits(transactionId, splits)`
- Falha no registro de split **não** quebra o pagamento (try/catch em `processOrderSplits`)

### 6.8 SSE (`sse-manager.mjs`)
```javascript
// Map<paymentId, Set<ServerResponse>>
addConnection(paymentId, res)
removeConnection(paymentId, res)
emit(paymentId, eventName, data)
closeAll(paymentId)
```
- Rota `GET /api/payments/:id/events`:
  - Se payment já finalizado (`completed/failed/expired`): escreve evento e encerra
  - Caso contrário: `event: connected`, registra conexão, `close` no `request.raw`
- Cliente (`useSSE.js`): reconnect com backoff exponencial (máx 5 tentativas), aceita token via `?token=`

---

## 7. Integração ECP Pay (passarela interna)

Arquivo: `server/services/ecp-pay-client.mjs`.

Config via env:
- `ECP_PAY_URL` (default `http://localhost:3335`)
- `ECP_PAY_API_KEY` (default `ecp-food-dev-key`)
- Source app: `ecp-food` (header `X-Source-App`)

Headers enviados: `Content-Type`, `X-API-Key`, `X-Source-App`, `X-Idempotency-Key` (UUID v4 em mutações).

Endpoints consumidos:
| Método | Rota | Uso |
|--------|------|-----|
| POST | `/pay/pix` | QR Code com `callback_url` e `metadata` |
| POST | `/pay/card` | Cobrança em cartão |
| GET | `/pay/transactions/:id` | Consultar transação |
| POST | `/pay/transactions/:id/refund` | Estorno |
| POST | `/pay/transactions/:id/splits` | Registrar divisão de repasse |

---

## 8. Integração ECP Digital Bank (fallback / cartão virtual)

Arquivo: `server/services/bank-integration.mjs`.

Config: `ECP_BANK_API_URL`, `ECP_BANK_PLATFORM_EMAIL`, `ECP_BANK_PLATFORM_PASSWORD`, `ECP_BANK_PLATFORM_PIX_KEY`, `ECP_BANK_PLATFORM_PIX_KEY_TYPE`, `ECP_BANK_PIX_EXPIRATION_MINUTES`, `ECP_BANK_WEBHOOK_SECRET`, `FOODFLOW_PUBLIC_URL`.

**Resiliência:**
- Timeout de 10s (`AbortController`)
- Circuit breaker: 5 falhas → abre por 30s
- Retry 1x em 5xx / timeout / unavailable, com 2s de backoff

**Funções exportadas:**
- `bankLogin(email, password)` → `{ token, user }`
- `bankListCards(jwt)`
- `bankGetBalance(jwt)`
- `bankPixTransfer(jwt, amountInCents, description)`
- `bankGeneratePixQrCode(platformJwt, amountInCents, description)`
- `bankCardPurchaseByNumber(platformJwt, cardNumber, amountCents, description, merchantName, merchantCategory)`
- `getPlatformBankToken()` — cache em memória (23h TTL)
- `BankApiError { code, statusCode, detail }`

---

## 9. Chat AI — Arquitetura Multi-Agente

### 9.1 Orchestrator (`chat-agents/orchestrator.mjs`)
- **Modelo:** Claude Sonnet 4 (`claude-sonnet-4-20250514`, configurável via `AI_MODEL`)
- **Max tokens:** 2048 (configurável via `AI_MAX_TOKENS`)
- Classifica intenção em 15 categorias (BROWSE:*, ORDER:*, PAYMENT:*, CART:*, FAQ:*, GENERAL:*)
- Rota por `[category]:[subcategory]` → agente (`knowledge`, `transaction`, `orchestrator`)
- `handleGeneral` responde saudações / out-of-scope direto

### 9.2 Knowledge (`chat-agents/knowledge.mjs`)
- FAQs sobre entrega / funcionamento geral

### 9.3 Transaction (`chat-agents/transaction.mjs`)
- **Agentic loop** com `MAX_TOOL_ITERATIONS=5`
- 13 tools: `list_restaurants`, `get_restaurant_menu`, `search_food`, `view_cart`, `add_to_cart`, `remove_from_cart`, `create_order`, `pay_with_pix`, `pay_with_credit_card`, `list_credit_cards`, `get_order_status`, `list_orders`
- Tools reutilizam `order.service.mjs` e `payment.service.mjs` (não duplicam lógica)
- Retorna `{ content, agent, intent, toolCalls }` persistido em `chat_messages`

### 9.4 Persistência
- `chat_conversations` auto-titulada pela primeira mensagem do usuário (truncada em 60 chars)
- `chat_messages.tool_calls` guardado como JSON sanitizado (remove chars de controle)
- Histórico: últimas 10 msgs passadas como contexto para o LLM

---

## 10. Configuração e Deploy

### 10.1 Variáveis de Ambiente (`.env`) — carregadas em `server/config.mjs`

```
NODE_ENV=development|production
PORT=3000
HOST=0.0.0.0

JWT_SECRET=<64 chars>
JWT_REFRESH_SECRET=<64 chars>
# jwtExpiresIn/jwtRefreshExpiresIn são hardcoded: 24h / 7d

DB_PATH=./data/foodflow.db         # resolvido contra ROOT do server
CORS_ORIGIN=http://localhost:5174  # aceita CSV

# ECP Digital Bank
ECP_BANK_API_URL=https://bank.ecportilho.com
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=<senha>
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=<shared-hmac>
FOODFLOW_PUBLIC_URL=http://localhost:3000

# ECP Pay
ECP_PAY_URL=http://localhost:3335
ECP_PAY_API_KEY=ecp-food-dev-key

# Chat AI
ANTHROPIC_API_KEY=<chave>
AI_MODEL=claude-sonnet-4-20250514
AI_MAX_TOKENS=2048
```

### 10.2 Bootstrap

`server/index.mjs:31`:
1. `initDb()` — cria/migra schema
2. Registra plugins: `@fastify/cors`, `@fastify/helmet` (CSP off), `@fastify/rate-limit` (100/min global por IP)
3. Registra todas as rotas
4. Tenta servir `client/dist` com `@fastify/static`; fallback para message JSON se build ausente
5. `setNotFoundHandler`: retorna SPA `index.html` para não-API, 404 JSON para `/api/*`
6. `setErrorHandler`: converte erros de validação, rate-limit e internos para payload padronizado `{ success: false, error: {code, message, details?} }`
7. `app.listen({ port, host })`
8. `startExpirationWorker()` — `setInterval` de 30s varrendo PIX expirados

### 10.3 Frontend build
- `cd client && npm run build` → gera `client/dist/`
- Em produção o Fastify serve `dist/` + fallback SPA

### 10.4 Seed (`server/seed.mjs`)
Roda `DELETE FROM …` em todas as tabelas na ordem correta e re-popula:
- 7 categorias
- 6 restaurantes (com `pj_cnpj` e `pj_pix_key`)
- 47 menu items
- 2 cupons (`MVP10`, `FRETEGRATIS`)
- 1 admin (`admin@foodflow.com` / `Adm!nF00d@2026`)
- 1 restaurante user (`pasta@foodflow.com` / `P@sta&Fogo#2026`, associado a `rest_pasta`)
- 11 consumidores sincronizados com ecp-digital-bank (todos com senha `Senha@123`)
- 11 cartões de crédito pré-cadastrados (um por consumidor)
- 1 endereço default para Marina Silva

---

## 11. Padrão de Response

Todas as rotas retornam `{ success: boolean, data?: any, error?: { code, message, details? } }`. Exceções de validação, rate-limit, 404 de SPA e erros internos são tratados no `setErrorHandler` global.

---

## 12. Regras Invioláveis de Código

1. **Nenhuma rota aceita auth sem passar pelo `authMiddleware`** (exceto rotas públicas de catálogo, `/auth/*`, webhooks e `/api/health`)
2. **Todo endpoint que muta estado financeiro** passa pelo `services/payment.service.mjs` (nenhum controller chama `bankIntegration` ou `ecpPayClient` direto)
3. **Valores monetários entre serviços** trafegam em **centavos (integer)**; conversão: `Math.round(reais * 100)`
4. **Senhas** apenas com `bcryptjs.hashSync(…, 12)`; nunca logadas nem retornadas em respostas
5. **SQL** sempre via prepared statements do `better-sqlite3` (`db.prepare(…)`), nunca concatenação
6. **JWT do banco (`bank_jwt_token`)** é efêmero — limpo após concluir/falhar a transação (`bank_jwt_token = NULL`)
7. **Cartões de crédito:** UI nunca exibe `card_number` cheio — só `card_last4`
8. **Webhooks** sempre retornam 200 para evitar retries; falhas são logadas internamente
9. **Arquivos ESM (`.mjs`)** em todo o server; React (JSX) com `"type": "module"` no client
10. **Windows 11 compatibility:** bcryptjs (não bcrypt), better-sqlite3 com build tools, sem comandos Unix em scripts

---

## 13. Output Padrões

- **Erro:** `{ success: false, error: { code: "CODIGO_UPPER", message: "…", details?: [...] }, statusCode?: number }`
- **Sucesso:** `{ success: true, data: {...} }`
- **SSE:** `event: <tipo>\ndata: <JSON>\n\n` — tipos em uso: `connected`, `payment_update`
- **Chat response:** `{ success, data: { conversationId, message: { id, role, content, agent, intent, toolCalls, createdAt } } }`
