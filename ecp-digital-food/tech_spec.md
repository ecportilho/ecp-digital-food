# Tech Spec — FoodFlow

## 1. Visão Técnica

FoodFlow é uma aplicação web full-stack responsiva (desktop, Android, iOS via browser) que implementa um marketplace de delivery de comida. A arquitetura segue o mesmo padrão do ecp-digital-banking: monorepo com backend Node.js/Fastify servindo API REST + frontend React SPA, persistência SQLite, e deploy em VPS Linux.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão | Justificativa |
|--------|-----------|--------|---------------|
| **Runtime** | Node.js | 20 LTS | Mesma do ecp-digital-banking, estável e amplamente suportado |
| **Backend Framework** | Fastify | 4.x | Alta performance, schema validation nativo, plugin ecosystem |
| **ORM / Query Builder** | better-sqlite3 | 11.x | Sincronismo, zero-config, já validado no digital-banking |
| **Autenticação** | JWT (jsonwebtoken) | 9.x | Stateless, simples, token refresh pattern |
| **Hash de Senha** | bcryptjs | 2.x | Compatível Windows 11 (sem dependência nativa como bcrypt) |
| **Validação** | @sinclair/typebox | 0.32+ | Schema JSON integrado ao Fastify para request/response validation |
| **Frontend Framework** | React | 18.x | SPA com Vite, component-driven, ecossistema maduro |
| **Build Tool** | Vite | 5.x | HMR rápido, build otimizado, configuração mínima |
| **Roteamento SPA** | React Router | 6.x | Roteamento declarativo, nested routes |
| **Estado Global** | React Context + useReducer | — | Simples, sem dependência extra, suficiente para MVP |
| **HTTP Client** | fetch nativo | — | Sem dependência externa, interceptors via wrapper |
| **CSS** | CSS Modules + CSS Variables | — | Escopo isolado, theming via variáveis, sem build extra |
| **Ícones** | Lucide React | 0.4+ | Leve, tree-shakeable, consistente |
| **Process Manager** | PM2 | 5.x | Auto-restart, logs, cluster mode |
| **Reverse Proxy** | Nginx | 1.24+ | SSL termination, gzip, SPA fallback, rate limiting |
| **SSL** | Let's Encrypt / Certbot | — | HTTPS gratuito, renovação automática |
| **Lint** | ESLint + Prettier | — | Consistência de código |
| **OS de desenvolvimento** | Windows 11 | — | Compatibilidade garantida (sem scripts bash-only) |

---

## 2.1. Integração com ECP Digital Bank (Pagamento Real)

O FoodFlow integra com o ecp-digital-bank (`https://bank.ecportilho.com`) para processar pagamentos reais. O banco digital já está em produção e expõe APIs REST autenticadas por JWT.

### Arquitetura de Integração

```
┌──────────────────────┐      ┌──────────────────────────────┐
│   FoodFlow (Client)  │      │   ECP Digital Bank API        │
│   React SPA          │      │   https://bank.ecportilho.com │
└──────┬───────────────┘      └──────────────┬───────────────┘
       │                                      │
       │  1. Checkout → escolhe método         │
       │  6. SSE notifica pagamento ✓          │
       ▼                                      │
┌──────────────────────┐                      │
│   FoodFlow (Server)  │◄────────────────────►│
│   Fastify API        │  HTTP calls (fetch)   │
│                      │                      │
│  ┌─────────────────┐ │  Auth:               │
│  │ payment.service  │─┼─► POST /auth/login   │
│  │                  │ │   (email, password)  │
│  │                  │ │   → JWT token        │
│  │                  │ │                      │
│  │ Cartão Virtual:  │─┼─► GET /cards         │
│  │                  │ │   GET /accounts/balance│
│  │                  │ │   POST /pix/transfer  │
│  │                  │ │   (débito via PIX    │
│  │                  │ │    para chave da     │
│  │                  │ │    plataforma)       │
│  │                  │ │                      │
│  │ PIX QR Code:     │─┼─► POST /pix/qrcode   │
│  │                  │ │   (gera cobrança)    │
│  │                  │ │                      │
│  │ Webhook:         │◄┼── POST /api/webhooks/ │
│  │                  │ │   bank/pix-received  │
│  │                  │ │   (banco notifica    │
│  │                  │ │    pagamento)        │
│  │                  │ │                      │
│  │ SSE:             │─┼─► GET /api/payments/  │
│  │                  │ │   :id/events         │
│  │                  │ │   (stream p/ client) │
│  └─────────────────┘ │                      │
└──────────────────────┘                      │
```

### APIs do ECP Digital Bank Consumidas

| Método | Rota | Uso no FoodFlow | Payload |
|--------|------|----------------|---------|
| POST | `/auth/login` | Autenticar consumidor no banco | `{ email, password }` → JWT |
| GET | `/cards` | Listar cartões virtuais do consumidor | Header: `Authorization: Bearer <jwt>` |
| GET | `/accounts/balance` | Verificar saldo disponível (centavos) | Header: `Authorization: Bearer <jwt>` |
| POST | `/pix/transfer` | Debitar valor do consumidor → conta da plataforma | `{ pixKeyValue, pixKeyType, amountInCents, description }` |
| POST | `/pix/qrcode` | Gerar QR Code de cobrança PIX | `{ amountInCents, description }` |

### Fluxo de Pagamento — Cartão Virtual ECP

1. Consumidor escolhe "Pagar com Cartão ECP" no checkout
2. FoodFlow frontend solicita email/senha do banco digital
3. FoodFlow backend faz `POST /auth/login` no ecp-digital-bank → obtém JWT
4. FoodFlow backend faz `GET /cards` → retorna lista de cartões para o frontend
5. Consumidor seleciona cartão
6. FoodFlow backend faz `GET /accounts/balance` → verifica saldo >= total do pedido
7. FoodFlow backend faz `POST /pix/transfer` com chave PIX da plataforma FoodFlow, valor em centavos
8. Se sucesso → pedido criado com status `confirmed`, transação registrada
9. Se falha (saldo insuficiente, cartão bloqueado) → erro retornado ao frontend

### Fluxo de Pagamento — PIX QR Code (Webhook + SSE)

```
 Consumer Browser           FoodFlow Server           ECP Digital Bank
       │                          │                          │
       │  1. POST /api/payments/pix                          │
       │─────────────────────────►│                          │
       │                          │  2. POST /pix/qrcode     │
       │                          │─────────────────────────►│
       │                          │  ◄── QR Code data        │
       │  ◄── QR Code + paymentId │                          │
       │                          │                          │
       │  3. GET /api/payments/:id/events (SSE stream)       │
       │─────────────────────────►│  (conexão aberta)        │
       │                          │                          │
       │  4. Escaneia QR Code     │                          │
       │  (paga no app bancário)  │                          │
       │                          │                          │
       │                          │  5. POST /api/webhooks/  │
       │                          │     bank/pix-received    │
       │                          │◄─────────────────────────│
       │                          │  (valida assinatura)     │
       │                          │                          │
       │  6. SSE event: {status:  │                          │
       │     "completed"}         │                          │
       │◄─────────────────────────│                          │
       │                          │                          │
       │  7. Redirect → OrderStatus                          │
       │                          │                          │
```

1. Consumidor escolhe "Pagar com PIX" no checkout
2. FoodFlow backend autentica como conta da plataforma no ecp-digital-bank
3. FoodFlow backend faz `POST /pix/qrcode` → obtém QR Code (imagem base64 + string copia-e-cola)
4. Backend cria registro em `payments` com status `pending` e `pix_expiration` = now + 10 min
5. Frontend recebe QR Code e abre conexão SSE em `GET /api/payments/:id/events`
6. Consumidor escaneia QR Code e paga no app bancário
7. ecp-digital-bank dispara webhook `POST /api/webhooks/bank/pix-received` com dados da transação
8. FoodFlow valida assinatura HMAC do webhook, identifica o pagamento pelo valor + descrição
9. FoodFlow atualiza `payment.status = 'completed'` e `order.status = 'confirmed'`
10. FoodFlow emite evento SSE `{ event: 'payment_update', data: { status: 'completed' } }` para o frontend conectado
11. Frontend recebe o evento, fecha a conexão SSE e redireciona para tela de acompanhamento
12. Se `pix_expiration` for atingido sem webhook → `payment.status = 'expired'`, `order.status = 'cancelled'`, SSE emite `{ status: 'expired' }`

### Conta da Plataforma

O FoodFlow possui uma conta própria no ecp-digital-bank que atua como "conta recebedora":
- **Email:** `foodflow@ecportilho.com`
- **Chave PIX:** configurável via `.env` (email, CPF ou chave aleatória)
- Todos os pagamentos (cartão e PIX) são creditados nesta conta
- O JWT da conta da plataforma é obtido no startup do server e renovado automaticamente

---

## 3. Estrutura do Monorepo

```
foodflow/
├── package.json                    # Scripts do monorepo (dev, build, start, seed)
├── .env.example                    # Variáveis de ambiente template
├── .env                            # Variáveis de ambiente local (gitignored)
├── README.md
│
├── server/
│   ├── index.mjs                   # Entry point — Fastify bootstrap, plugin register
│   ├── config.mjs                  # Env vars, constantes, configuração centralizada
│   ├── database.mjs                # Inicialização SQLite, migrations, connection
│   ├── seed.mjs                    # Seed de dados mockados (restaurantes, cardápios, categorias)
│   ├── auth.mjs                    # Middleware JWT, helpers de autenticação
│   │
│   ├── routes/
│   │   ├── auth.routes.mjs         # POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh
│   │   ├── consumer.routes.mjs     # GET/PUT /api/consumer/profile, GET/POST/DELETE /api/consumer/addresses
│   │   ├── restaurant.routes.mjs   # GET /api/restaurants, GET /api/restaurants/:id, GET /api/restaurants/:id/menu
│   │   ├── category.routes.mjs     # GET /api/categories
│   │   ├── cart.routes.mjs         # GET/POST/PUT/DELETE /api/cart (server-side cart)
│   │   ├── order.routes.mjs        # POST /api/orders, GET /api/orders, GET /api/orders/:id, PATCH /api/orders/:id/status
│   │   ├── payment.routes.mjs      # POST /api/payments/card, POST /api/payments/pix, GET /api/payments/:id/events (SSE)
│   │   ├── webhook.routes.mjs      # POST /api/webhooks/bank/pix-received (callback do ecp-digital-bank)
│   │   ├── coupon.routes.mjs       # POST /api/coupons/validate
│   │   ├── favorite.routes.mjs     # GET/POST/DELETE /api/favorites
│   │   ├── admin.routes.mjs        # Rotas do painel admin da plataforma
│   │   └── restaurant-admin.routes.mjs  # Rotas do painel do restaurante
│   │
│   ├── services/
│   │   ├── bank-integration.mjs    # Client HTTP para APIs do ecp-digital-bank
│   │   ├── sse-manager.mjs         # Gerencia conexões SSE abertas por paymentId
│   │   └── webhook-handler.mjs     # Valida assinatura HMAC e processa callbacks do banco
│   │
│   ├── schemas/
│   │   ├── auth.schema.mjs
│   │   ├── restaurant.schema.mjs
│   │   ├── order.schema.mjs
│   │   ├── cart.schema.mjs
│   │   ├── payment.schema.mjs
│   │   └── common.schema.mjs
│   │
│   └── utils/
│       ├── errors.mjs              # Classes de erro padronizadas (AppError, NotFound, etc.)
│       └── helpers.mjs             # Funções utilitárias (formatCurrency, slugify, etc.)
│
├── client/
│   ├── index.html                  # Entry HTML (Vite)
│   ├── vite.config.js
│   │
│   ├── src/
│   │   ├── main.jsx                # React root render
│   │   ├── App.jsx                 # Router principal, layout shell
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Autenticação (user, token, login, logout)
│   │   │   ├── CartContext.jsx      # Carrinho global (items, add, remove, update, clear)
│   │   │   └── ThemeContext.jsx     # Tema (Midnight Express é default, futuramente switchable)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useApi.js           # Fetch wrapper com auth header e error handling
│   │   │   ├── useCart.js          # Atalho para CartContext
│   │   │   ├── useAuth.js         # Atalho para AuthContext
│   │   │   └── useDebounce.js     # Debounce para busca
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Hero + categorias + catálogo + detalhe restaurante
│   │   │   ├── RestaurantDetail.jsx # Página dedicada do restaurante (mobile) com cardápio
│   │   │   ├── Cart.jsx            # Página do carrinho (mobile view)
│   │   │   ├── Checkout.jsx        # Resumo + endereço + seleção de método de pagamento
│   │   │   ├── PaymentCard.jsx     # Fluxo cartão ECP: login banco → listar cartões → confirmar
│   │   │   ├── PaymentPix.jsx      # Fluxo PIX: exibir QR Code → SSE listener → confirmação
│   │   │   ├── OrderStatus.jsx     # Acompanhamento do pedido
│   │   │   ├── OrderHistory.jsx    # Histórico de pedidos
│   │   │   ├── Favorites.jsx       # Restaurantes favoritos
│   │   │   ├── Profile.jsx         # Dados do consumidor
│   │   │   ├── Login.jsx           # Login
│   │   │   ├── Register.jsx        # Cadastro
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.jsx         # Métricas gerais da plataforma
│   │   │   │   ├── ManageRestaurants.jsx # Lista e gestão de restaurantes
│   │   │   │   ├── ManageCategories.jsx  # CRUD de categorias
│   │   │   │   └── ManagePromotions.jsx  # CRUD de promoções globais
│   │   │   │
│   │   │   └── restaurant/
│   │   │       ├── MenuManager.jsx       # CRUD do cardápio do restaurante
│   │   │       ├── OrderManager.jsx      # Pedidos recebidos e gestão de status
│   │   │       └── RestaurantSettings.jsx # Dados do restaurante
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Shell.jsx         # Container max-width + safe-area padding
│   │   │   │   ├── TopBar.jsx        # Brand mark + pills de status
│   │   │   │   ├── BottomNav.jsx     # Navegação fixa mobile/desktop
│   │   │   │   └── MobileSheet.jsx   # Bottom sheet para carrinho mobile
│   │   │   │
│   │   │   ├── home/
│   │   │   │   ├── HeroBanner.jsx    # Hero com busca, promo e stats
│   │   │   │   ├── CategoryChips.jsx # Filtro por categorias
│   │   │   │   ├── RestaurantGrid.jsx # Grid de cards de restaurantes
│   │   │   │   ├── RestaurantCard.jsx # Card individual do restaurante
│   │   │   │   └── MenuGrid.jsx      # Grid de itens do cardápio
│   │   │   │
│   │   │   ├── cart/
│   │   │   │   ├── CartPanel.jsx     # Painel lateral desktop / conteúdo do sheet
│   │   │   │   ├── CartItem.jsx      # Linha de item no carrinho
│   │   │   │   ├── CartSummary.jsx   # Subtotal, frete, desconto, total
│   │   │   │   ├── QuantityControl.jsx # +/− com display
│   │   │   │   └── EmptyCart.jsx     # Estado vazio do carrinho
│   │   │   │
│   │   │   ├── payment/
│   │   │   │   ├── PaymentMethodSelector.jsx # Seleção Cartão ECP vs PIX QR Code
│   │   │   │   ├── BankLoginForm.jsx  # Form email/senha do ecp-digital-bank
│   │   │   │   ├── CardSelector.jsx   # Lista de cartões virtuais do banco
│   │   │   │   ├── PixQrCodeDisplay.jsx # QR Code com timer de expiração
│   │   │   │   ├── PaymentStatus.jsx  # Indicador de status (processing, completed, failed)
│   │   │   │   └── PaymentError.jsx   # Mensagens de erro (saldo insuficiente, timeout, etc.)
│   │   │   │
│   │   │   └── ui/
│   │   │       ├── Badge.jsx
│   │   │       ├── Chip.jsx
│   │   │       ├── GlassCard.jsx
│   │   │       ├── CoverTag.jsx
│   │   │       ├── MiniButton.jsx
│   │   │       ├── PrimaryButton.jsx
│   │   │       ├── SearchBox.jsx
│   │   │       ├── Pill.jsx
│   │   │       ├── RatingChip.jsx
│   │   │       └── ProgressBar.jsx
│   │   │
│   │   ├── styles/
│   │   │   ├── variables.css        # CSS custom properties (Midnight Express)
│   │   │   ├── global.css           # Reset, body, transitions
│   │   │   └── typography.css       # Font stack, sizes, letter-spacing
│   │   │
│   │   ├── lib/
│   │   │   ├── api.js               # Base fetch config, interceptors, error handling
│   │   │   ├── constants.js         # Rotas da API, breakpoints, formatação
│   │   │   └── formatters.js        # Currency (BRL), date, pluralize
│   │   │
│   │   └── assets/
│   │       └── (emojis renderizados nativamente, sem assets de imagem no MVP)
│   │
│   └── public/
│       ├── favicon.svg
│       └── manifest.json            # PWA manifest (name, icons, theme_color)
│
└── scripts/
    ├── setup.mjs                    # Script cross-platform de setup inicial
    ├── seed.mjs                     # Wrapper para rodar seed do server
    ├── register-webhook.mjs         # Registra webhook do FoodFlow no ecp-digital-bank
    └── deploy.mjs                   # Script de deploy para VPS (PM2 + Nginx)
```

---

## 4. Modelo de Dados (SQLite)

### 4.1 Diagrama Entidade-Relacionamento

```
users ─────────────── orders ──────────── order_items
  │                      │
  ├── addresses          │
  ├── favorites          │
  └── carts ────── cart_items
                         │
restaurants ─────── menu_items
  │
  └── categories (FK)

categories
coupons
promotions
```

### 4.2 Tabelas

#### users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'consumer' CHECK(role IN ('consumer', 'restaurant', 'admin')),
  restaurant_id TEXT REFERENCES restaurants(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### addresses
```sql
CREATE TABLE addresses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Casa',
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'São Paulo',
  state TEXT NOT NULL DEFAULT 'SP',
  zip_code TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### categories
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT UNIQUE NOT NULL,
  emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
```

#### restaurants
```sql
CREATE TABLE restaurants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cuisine TEXT NOT NULL,
  subtitle TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id),
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  eta_min INTEGER NOT NULL DEFAULT 20,
  eta_max INTEGER NOT NULL DEFAULT 40,
  delivery_fee REAL NOT NULL DEFAULT 0,
  min_order REAL NOT NULL DEFAULT 0,
  cover_gradient TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #7b61ff, #ff5fa2)',
  hero_emoji TEXT NOT NULL DEFAULT '🍽️',
  promo_text TEXT,
  note TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_open INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### menu_items
```sql
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  badge TEXT,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### carts
```sql
CREATE TABLE carts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### cart_items
```sql
CREATE TABLE cart_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
  UNIQUE(cart_id, menu_item_id)
);
```

#### orders
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  address_text TEXT NOT NULL,
  subtotal REAL NOT NULL,
  delivery_fee REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  coupon_code TEXT,
  payment_method TEXT NOT NULL DEFAULT 'pix_qrcode' CHECK(payment_method IN ('card_ecp', 'pix_qrcode')),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment', 'payment_failed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### order_items
```sql
CREATE TABLE order_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  restaurant_name TEXT NOT NULL,
  menu_item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);
```

#### favorites
```sql
CREATE TABLE favorites (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, restaurant_id)
);
```

#### coupons
```sql
CREATE TABLE coupons (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK(discount_type IN ('fixed', 'percent')),
  discount_value REAL NOT NULL,
  min_order REAL NOT NULL DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### payments
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT ('p_' || lower(hex(randomblob(8)))),
  order_id TEXT NOT NULL REFERENCES orders(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  method TEXT NOT NULL CHECK(method IN ('card_ecp', 'pix_qrcode')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  amount_cents INTEGER NOT NULL,
  bank_transaction_id TEXT,
  bank_jwt_token TEXT,
  pix_qrcode_data TEXT,
  pix_qrcode_image TEXT,
  pix_expiration TEXT,
  card_last4 TEXT,
  webhook_received_at TEXT,
  webhook_payload TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_payments_status_expiration ON payments(status, pix_expiration);
```

---

## 5. API REST — Endpoints

### 5.1 Autenticação

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/auth/register` | Criar conta (consumer) | Não |
| POST | `/api/auth/login` | Login, retorna JWT | Não |
| POST | `/api/auth/refresh` | Renovar token | Sim |

### 5.2 Consumidor

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/consumer/profile` | Dados do perfil | Sim |
| PUT | `/api/consumer/profile` | Atualizar perfil | Sim |
| GET | `/api/consumer/addresses` | Listar endereços | Sim |
| POST | `/api/consumer/addresses` | Adicionar endereço | Sim |
| DELETE | `/api/consumer/addresses/:id` | Remover endereço | Sim |

### 5.3 Catálogo

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/categories` | Listar categorias ativas | Não |
| GET | `/api/restaurants` | Listar restaurantes (query: `?category=&q=&page=&limit=`) | Não |
| GET | `/api/restaurants/:id` | Detalhe do restaurante | Não |
| GET | `/api/restaurants/:id/menu` | Cardápio do restaurante | Não |

### 5.4 Carrinho

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/cart` | Obter carrinho do usuário | Sim |
| POST | `/api/cart/items` | Adicionar item ao carrinho | Sim |
| PUT | `/api/cart/items/:itemId` | Atualizar quantidade | Sim |
| DELETE | `/api/cart/items/:itemId` | Remover item | Sim |
| DELETE | `/api/cart` | Limpar carrinho | Sim |

### 5.5 Pedidos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/orders` | Criar pedido a partir do carrinho | Sim (consumer) |
| GET | `/api/orders` | Listar pedidos do usuário | Sim |
| GET | `/api/orders/:id` | Detalhe do pedido | Sim |
| PATCH | `/api/orders/:id/status` | Atualizar status | Sim (restaurant/admin) |

### 5.6 Cupons

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/coupons/validate` | Validar cupom e retornar desconto | Sim |

### 5.7 Pagamentos (Integração ECP Digital Bank)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/payments/bank-auth` | Autenticar consumidor no ecp-digital-bank (proxy) | Sim (consumer) |
| GET | `/api/payments/bank-cards` | Listar cartões do consumidor no banco (proxy) | Sim (consumer) |
| GET | `/api/payments/bank-balance` | Consultar saldo do consumidor no banco (proxy) | Sim (consumer) |
| POST | `/api/payments/card` | Pagar pedido com cartão ECP (débito via PIX transfer) | Sim (consumer) |
| POST | `/api/payments/pix` | Gerar QR Code PIX para pagamento do pedido | Sim (consumer) |
| GET | `/api/payments/:id/events` | SSE stream — notifica frontend sobre mudanças de status do pagamento em tempo real | Sim (consumer) |

### 5.8 Webhook (recebido do ECP Digital Bank)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/webhooks/bank/pix-received` | Callback chamado pelo ecp-digital-bank quando um PIX é recebido na conta da plataforma | HMAC signature |

### 5.9 Favoritos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/favorites` | Listar favoritos | Sim |
| POST | `/api/favorites` | Adicionar favorito | Sim |
| DELETE | `/api/favorites/:restaurantId` | Remover favorito | Sim |

### 5.10 Admin Restaurante

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/restaurant-admin/menu` | Listar itens do cardápio | Sim (restaurant) |
| POST | `/api/restaurant-admin/menu` | Adicionar item | Sim (restaurant) |
| PUT | `/api/restaurant-admin/menu/:id` | Editar item | Sim (restaurant) |
| DELETE | `/api/restaurant-admin/menu/:id` | Remover item | Sim (restaurant) |
| GET | `/api/restaurant-admin/orders` | Pedidos recebidos | Sim (restaurant) |
| PUT | `/api/restaurant-admin/settings` | Atualizar dados do restaurante | Sim (restaurant) |

### 5.11 Admin Plataforma

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/admin/dashboard` | Métricas gerais | Sim (admin) |
| GET | `/api/admin/restaurants` | Listar todos os restaurantes | Sim (admin) |
| PATCH | `/api/admin/restaurants/:id` | Ativar/suspender restaurante | Sim (admin) |
| GET | `/api/admin/categories` | Listar categorias | Sim (admin) |
| POST | `/api/admin/categories` | Criar categoria | Sim (admin) |
| PUT | `/api/admin/categories/:id` | Editar categoria | Sim (admin) |
| DELETE | `/api/admin/categories/:id` | Remover categoria | Sim (admin) |
| GET | `/api/admin/coupons` | Listar cupons | Sim (admin) |
| POST | `/api/admin/coupons` | Criar cupom | Sim (admin) |
| PUT | `/api/admin/coupons/:id` | Editar cupom | Sim (admin) |

---

## 6. Regras de Negócio

### 6.1 Carrinho
- Um usuário tem exatamente um carrinho ativo por vez
- Adicionar o mesmo item incrementa a quantidade
- Quantidade mínima de 1 por item; ao zerar, item é removido
- O carrinho persiste entre sessões (server-side para logados)

### 6.2 Cálculo do Pedido
- **Subtotal:** soma de (preço × quantidade) de todos os itens
- **Taxa de entrega:** soma das taxas dos restaurantes envolvidos; grátis se subtotal >= R$ 120
- **Desconto:** valor fixo ou percentual do cupom aplicado, respeitando min_order do cupom
- **Total:** max(subtotal + delivery_fee - discount, 0)

### 6.3 Fluxo de Status do Pedido
```
pending_payment → confirmed → preparing → out_for_delivery → delivered
      │               │
      └→ payment_failed│
                       └→ cancelled (apenas se status = confirmed)
```
- Pedido é criado como `pending_payment` até o pagamento ser `completed`
- Se pagamento `completed` → status muda para `confirmed` automaticamente
- Se pagamento `failed` ou `expired` → status muda para `payment_failed`

### 6.4 Autenticação
- JWT com expiração de 24h
- Refresh token com expiração de 7 dias
- Roles: `consumer`, `restaurant`, `admin`
- Middleware de autorização verifica role + ownership

### 6.5 Cupons
- Cupom validado no momento da aplicação e no momento da criação do pedido
- Verificações: código ativo, não expirado, min_order atendido, max_uses não atingido
- Cupom seed: `MVP10` com R$ 10 de desconto fixo, min_order R$ 80

### 6.6 Pagamentos (ECP Digital Bank)

#### Regras Gerais
- Valores monetários trafegam como **integer (centavos)** entre FoodFlow e ecp-digital-bank — conversão: `Math.round(totalReais * 100)`
- Todo pagamento gera um registro na tabela `payments` antes de chamar a API do banco
- O pagamento é **idempotente** — se o mesmo `payment.id` for reenviado, o banco não processa duplicata
- O pedido só é criado com status `confirmed` após o pagamento ser `completed`
- Se o pagamento falha, o pedido fica com status `payment_failed` e o carrinho não é limpo

#### Fluxo Cartão Virtual ECP
1. Frontend coleta email/senha do ecp-digital-bank (nunca armazenados no FoodFlow)
2. Backend faz proxy de autenticação → `POST https://bank.ecportilho.com/auth/login`
3. JWT do banco retornado é armazenado temporariamente na tabela `payments.bank_jwt_token` (apenas para a sessão da transação)
4. Backend consulta `GET /cards` → retorna apenas cartões com `status != blocked`
5. Backend consulta `GET /accounts/balance` → verifica `balance >= totalAmountCents`
6. Se saldo insuficiente → retorna erro `INSUFFICIENT_BALANCE` com saldo atual
7. Backend executa `POST /pix/transfer` com:
   - `pixKeyValue`: chave PIX da plataforma FoodFlow (env `ECP_BANK_PLATFORM_PIX_KEY`)
   - `pixKeyType`: tipo da chave (env `ECP_BANK_PLATFORM_PIX_KEY_TYPE`)
   - `amountInCents`: total do pedido em centavos
   - `description`: `FoodFlow Pedido #<order_id>`
8. Se transferência bem-sucedida → `payment.status = 'completed'`, `order.status = 'confirmed'`
9. Se falha na API do banco → `payment.status = 'failed'`, `payment.error_message = <msg>`
10. O `bank_jwt_token` é limpo da tabela após conclusão (sucesso ou falha)

#### Fluxo PIX QR Code (Webhook + SSE)
1. Backend autentica como conta da plataforma FoodFlow no banco → `POST /auth/login` com credenciais do `.env`
2. Backend solicita `POST /pix/qrcode` com `amountInCents` e `description` (formato: `FoodFlow #<payment_id>`)
3. QR Code (base64 image + copia-e-cola string) armazenado em `payments.pix_qrcode_data` e `payments.pix_qrcode_image`
4. `payments.pix_expiration` = now + 10 minutos
5. Frontend recebe QR Code e abre conexão SSE em `GET /api/payments/:id/events`
6. Consumidor escaneia e paga no app bancário
7. ecp-digital-bank dispara `POST /api/webhooks/bank/pix-received` com payload da transação
8. FoodFlow valida assinatura HMAC-SHA256, identifica o pagamento pelo campo `description` que contém `FoodFlow #<payment_id>`
9. FoodFlow atualiza `payment.status = 'completed'`, `payment.bank_transaction_id = <txn_id>`, `order.status = 'confirmed'`
10. SSE Manager emite evento para todas as conexões abertas daquele `payment_id`
11. Frontend recebe `{ event: 'payment_update', data: { status: 'completed' } }`, fecha SSE e redireciona
12. Expiration worker (setInterval a cada 30s) verifica pagamentos `pending` com `pix_expiration < now` → marca como `expired`, emite SSE `expired`, fecha conexão

#### Webhook: Validação e Processamento

**Payload esperado do ecp-digital-bank:**
```json
{
  "event": "pix.received",
  "transactionId": "abc123",
  "amountInCents": 8990,
  "pixKeyValue": "foodflow@ecportilho.com",
  "senderName": "João da Silva",
  "senderTaxId": "***456**",
  "description": "FoodFlow #p_7f3a2b1c",
  "timestamp": "2026-03-16T20:30:00.000Z"
}
```

**Validação (em ordem):**
1. Verificar header `X-Webhook-Signature` com HMAC-SHA256 do body usando `ECP_BANK_WEBHOOK_SECRET`
2. Verificar que `event === 'pix.received'`
3. Verificar que `pixKeyValue` corresponde à chave da plataforma
4. Extrair `payment_id` do campo `description` via regex `/FoodFlow #(p_\w+)/`
5. Buscar registro em `payments` onde `id = payment_id` e `status = 'pending'`
6. Verificar que `amountInCents` confere com `payments.amount_cents`
7. Se todas as validações passarem → atualizar payment + order + emitir SSE
8. Retornar `200 OK` ao banco (mesmo se payment já foi processado — idempotência)
9. Se validação falhar → retornar `200 OK` (para não gerar retry), logar o erro internamente

#### SSE (Server-Sent Events): Notificação em Tempo Real

**Endpoint:** `GET /api/payments/:id/events`

**Implementação Fastify:**
```javascript
// payment.routes.mjs
app.get('/api/payments/:id/events', { preHandler: [authMiddleware] }, async (request, reply) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(request.params.id);
  if (!payment || payment.user_id !== request.user.id) {
    return reply.code(404).send({ error: 'Payment not found' });
  }

  // Se já finalizado, retorna status atual e fecha
  if (['completed', 'failed', 'expired'].includes(payment.status)) {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    reply.raw.write(`event: payment_update\ndata: ${JSON.stringify({ status: payment.status })}\n\n`);
    reply.raw.end();
    return;
  }

  // Registra conexão no SSE Manager
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  reply.raw.write(`event: connected\ndata: ${JSON.stringify({ paymentId: payment.id })}\n\n`);

  sseManager.addConnection(payment.id, reply.raw);

  request.raw.on('close', () => {
    sseManager.removeConnection(payment.id, reply.raw);
  });
});
```

**SSE Manager (`server/services/sse-manager.mjs`):**
```javascript
// Map<paymentId, Set<ServerResponse>>
const connections = new Map();

export function addConnection(paymentId, res) {
  if (!connections.has(paymentId)) connections.set(paymentId, new Set());
  connections.get(paymentId).add(res);
}

export function removeConnection(paymentId, res) {
  const set = connections.get(paymentId);
  if (set) {
    set.delete(res);
    if (set.size === 0) connections.delete(paymentId);
  }
}

export function emit(paymentId, eventName, data) {
  const set = connections.get(paymentId);
  if (!set) return;
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(message); } catch { removeConnection(paymentId, res); }
  }
}

export function closeAll(paymentId) {
  const set = connections.get(paymentId);
  if (!set) return;
  for (const res of set) {
    try { res.end(); } catch {}
  }
  connections.delete(paymentId);
}
```

**Frontend (React — `PaymentPix.jsx`):**
```javascript
useEffect(() => {
  if (!paymentId) return;
  const evtSource = new EventSource(`/api/payments/${paymentId}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Nota: EventSource nativo não suporta headers customizados.
  // Usar polyfill `eventsource` do npm ou passar token via query param seguro.

  evtSource.addEventListener('payment_update', (e) => {
    const { status } = JSON.parse(e.data);
    if (status === 'completed') {
      evtSource.close();
      navigate(`/orders/${orderId}`);
    } else if (status === 'expired') {
      evtSource.close();
      setExpired(true);
    }
  });

  return () => evtSource.close();
}, [paymentId]);
```

> **Nota sobre EventSource e Auth:** O EventSource nativo do browser não suporta headers customizados. Para passar o JWT, duas opções: (a) usar token via query param `?token=xxx` com validação server-side e expiração curta (5 min), ou (b) usar o polyfill `eventsource` do npm que suporta headers. Recomendação para o MVP: opção (a) com token de curta duração gerado especificamente para a conexão SSE.

#### Segurança da Integração
- Credenciais do banco da plataforma FoodFlow ficam exclusivamente no `.env` do server
- JWT do consumidor no banco é efêmero — nunca persistido além da transação
- Todas as chamadas ao banco são feitas **server-side** (nunca do frontend direto)
- O FoodFlow **não armazena** dados de cartão — apenas exibe last4 retornado pela API do banco
- Rate limiting de 5 req/min por usuário nas rotas `/api/payments/*`
- Logs de pagamento não incluem tokens JWT ou dados sensíveis
- **Webhook autenticado via HMAC-SHA256** — rejeita payloads com assinatura inválida
- **SSE protegido** — requer autenticação e valida ownership do payment
- Webhook sempre retorna `200 OK` ao banco para evitar retries desnecessários

---

## 7. Seed Data

O seed popula o banco com os mesmos dados do protótipo:

- **Categorias:** Todos, Hambúrguer, Japonês, Pizza, Saudável, Massas, Brasileira
- **Restaurantes:** Pasta & Fogo, Sushi Wave, Burger Lab, Green Bowl Co., Pizza Club 24h, Brasa & Lenha
- **Menu items:** 4 itens por restaurante (24 total)
- **Cupom:** MVP10 (R$ 10 off, min R$ 80)
- **Usuários seed:**
  - Admin: `admin@foodflow.com` / `admin123`
  - Restaurante (Pasta & Fogo): `pasta@foodflow.com` / `pasta123`
  - Consumidor: `user@foodflow.com` / `user123`

---

## 8. Configuração e Deploy

### 8.1 Variáveis de Ambiente (.env)
```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
DB_PATH=./data/foodflow.db
CORS_ORIGIN=https://food.ecportilho.com

# ECP Digital Bank Integration
ECP_BANK_API_URL=https://bank.ecportilho.com
ECP_BANK_PLATFORM_EMAIL=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PASSWORD=<platform-account-password>
ECP_BANK_PLATFORM_PIX_KEY=foodflow@ecportilho.com
ECP_BANK_PLATFORM_PIX_KEY_TYPE=email
ECP_BANK_PIX_EXPIRATION_MINUTES=10
ECP_BANK_WEBHOOK_SECRET=<shared-hmac-secret-with-bank>
FOODFLOW_PUBLIC_URL=https://food.ecportilho.com
```

### 8.2 Scripts (package.json)
```json
{
  "scripts": {
    "dev": "concurrently \"node server/index.mjs\" \"cd client && npx vite\"",
    "build": "cd client && npx vite build",
    "start": "node server/index.mjs",
    "seed": "node scripts/seed.mjs",
    "register-webhook": "node scripts/register-webhook.mjs",
    "setup": "node scripts/setup.mjs",
    "lint": "eslint . --ext .mjs,.jsx,.js"
  }
}
```

### 8.3 Deploy (VPS)
1. Clone repo no VPS
2. `npm install`
3. `npm run build` (gera `client/dist/`)
4. `npm run seed` (popula banco de dados)
5. Fastify serve `client/dist/` como static files em produção
6. PM2: `pm2 start server/index.mjs --name foodflow`
7. Nginx: proxy reverso para `localhost:3000`, SSL via Certbot
8. DNS: `food.ecportilho.com` → IP do VPS

### 8.4 Nginx Config
```nginx
server {
    listen 443 ssl http2;
    server_name food.ecportilho.com;

    ssl_certificate /etc/letsencrypt/live/food.ecportilho.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/food.ecportilho.com/privkey.pem;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 9. Compatibilidade Windows 11

Diretrizes obrigatórias (mesmas do ecp-digital-banking):

- **bcryptjs** em vez de bcrypt (sem dependência nativa C++)
- **better-sqlite3** com build tools configurados (node-gyp + VS Build Tools)
- Todos os scripts em **Node.js (.mjs)**, nunca bash-only
- **LF line endings** enforced via `.gitattributes`
- Paths com `path.join()` ou `path.resolve()`, nunca strings concatenadas com `/`
- Scripts cross-platform via `cross-env` quando necessário
- Nenhum uso de `chmod`, `ln -s` ou comandos Unix-only em scripts de setup

---

## 10. Segurança

- Senhas com hash bcryptjs (rounds: 12)
- JWT com expiração curta (24h access, 7d refresh)
- Rate limiting global via `@fastify/rate-limit` (100 req/min por IP)
- Rate limiting auth: 10 req/min por IP em rotas de login/register
- Rate limiting pagamentos: 5 req/min por usuário em rotas `/api/payments/*`
- Sanitização de inputs via Fastify schema validation (TypeBox)
- CORS restrito ao domínio de produção
- Headers de segurança via `@fastify/helmet`
- SQL injection prevenido por prepared statements (better-sqlite3 nativo)
- XSS prevenido por React (escape automático) + CSP headers
- Credenciais do banco da plataforma exclusivamente em `.env` (nunca no código)
- JWT do consumidor no banco é efêmero — limpo da tabela `payments` após conclusão
- Comunicação FoodFlow → ecp-digital-bank é sempre HTTPS (TLS 1.2+)
- Dados de cartão nunca armazenados — apenas `last4` exibido da resposta da API

---

## 11. Service: bank-integration.mjs

O serviço `server/services/bank-integration.mjs` encapsula toda a comunicação com o ecp-digital-bank. Nenhuma outra parte do código acessa a API do banco diretamente.

### 11.1 Interface do Serviço

```javascript
// server/services/bank-integration.mjs

const BANK_API = process.env.ECP_BANK_API_URL; // https://bank.ecportilho.com

/**
 * Autenticar um usuário no ecp-digital-bank.
 * Usado tanto para consumidores (checkout) quanto para a conta da plataforma.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function bankLogin(email, password) {
  const res = await fetch(`${BANK_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new BankApiError('AUTH_FAILED', res.status, await res.text());
  return res.json();
}

/**
 * Listar cartões virtuais do usuário autenticado no banco.
 * @param {string} bankJwt - JWT obtido via bankLogin
 * @returns {Promise<Array<{ id, last4, status, type }>>}
 */
export async function bankListCards(bankJwt) {
  const res = await fetch(`${BANK_API}/cards`, {
    headers: { Authorization: `Bearer ${bankJwt}` },
  });
  if (!res.ok) throw new BankApiError('CARDS_FETCH_FAILED', res.status);
  return res.json();
}

/**
 * Consultar saldo da conta do usuário no banco (em centavos).
 * @param {string} bankJwt
 * @returns {Promise<{ balance: number }>}
 */
export async function bankGetBalance(bankJwt) {
  const res = await fetch(`${BANK_API}/accounts/balance`, {
    headers: { Authorization: `Bearer ${bankJwt}` },
  });
  if (!res.ok) throw new BankApiError('BALANCE_FETCH_FAILED', res.status);
  return res.json();
}

/**
 * Executar transferência PIX (débito do consumidor → conta da plataforma).
 * @param {string} bankJwt - JWT do consumidor no banco
 * @param {number} amountInCents
 * @param {string} description - ex: "FoodFlow Pedido #abc123"
 * @returns {Promise<{ transactionId: string, status: string }>}
 */
export async function bankPixTransfer(bankJwt, amountInCents, description) {
  const res = await fetch(`${BANK_API}/pix/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bankJwt}`,
    },
    body: JSON.stringify({
      pixKeyValue: process.env.ECP_BANK_PLATFORM_PIX_KEY,
      pixKeyType: process.env.ECP_BANK_PLATFORM_PIX_KEY_TYPE,
      amountInCents,
      description,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BankApiError(
      body.error || 'PIX_TRANSFER_FAILED',
      res.status,
      body.message
    );
  }
  return res.json();
}

/**
 * Gerar QR Code de cobrança PIX (conta da plataforma gera a cobrança).
 * Requer autenticação prévia como conta da plataforma.
 * @param {string} platformJwt - JWT da conta plataforma
 * @param {number} amountInCents
 * @param {string} description
 * @returns {Promise<{ qrcodeData: string, qrcodeImage: string, expiresAt: string }>}
 */
export async function bankGeneratePixQrCode(platformJwt, amountInCents, description) {
  const res = await fetch(`${BANK_API}/pix/qrcode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${platformJwt}`,
    },
    body: JSON.stringify({ amountInCents, description }),
  });
  if (!res.ok) throw new BankApiError('QRCODE_GENERATION_FAILED', res.status);
  return res.json();
}

/**
 * Obter JWT da conta da plataforma FoodFlow no banco.
 * Chamado no startup do server e renovado automaticamente.
 * Token cacheado em memória com refresh a cada 23h.
 */
let platformTokenCache = { token: null, expiresAt: 0 };

export async function getPlatformBankToken() {
  if (platformTokenCache.token && Date.now() < platformTokenCache.expiresAt) {
    return platformTokenCache.token;
  }
  const { token } = await bankLogin(
    process.env.ECP_BANK_PLATFORM_EMAIL,
    process.env.ECP_BANK_PLATFORM_PASSWORD
  );
  platformTokenCache = {
    token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23h (token expira em 24h)
  };
  return token;
}

/**
 * Erro customizado para falhas na API do banco.
 */
export class BankApiError extends Error {
  constructor(code, statusCode, detail) {
    super(`Bank API error: ${code}`);
    this.code = code;
    this.statusCode = statusCode;
    this.detail = detail;
  }
}
```

### 11.2 Tratamento de Erros

| Erro do Banco | Código FoodFlow | Ação |
|--------------|----------------|------|
| Login inválido (401) | `BANK_AUTH_FAILED` | Retorna 401 ao consumidor com mensagem "Credenciais inválidas no banco" |
| Saldo insuficiente | `INSUFFICIENT_BALANCE` | Retorna 422 com saldo atual formatado |
| Cartão bloqueado | `CARD_BLOCKED` | Retorna 422 com sugestão de desbloquear no app do banco |
| Timeout (>10s) | `BANK_TIMEOUT` | Retorna 504 com sugestão de tentar novamente |
| Banco indisponível (5xx) | `BANK_UNAVAILABLE` | Retorna 503 com retry-after header |
| QR Code expirado | `PIX_EXPIRED` | Retorna 410, pedido cancelado |

### 11.3 Retry e Resiliência

- Timeout de 10s para todas as chamadas ao banco
- Retry automático 1x para erros 5xx (com backoff de 2s)
- Circuit breaker: após 5 falhas consecutivas, bloqueia chamadas por 30s
- Fallback: se banco indisponível, checkout exibe mensagem clara sem crash

---

## 12. Service: webhook-handler.mjs

O serviço `server/services/webhook-handler.mjs` processa callbacks HTTP recebidos do ecp-digital-bank.

### 12.1 Interface do Serviço

```javascript
// server/services/webhook-handler.mjs
import crypto from 'node:crypto';
import * as sseManager from './sse-manager.mjs';

const WEBHOOK_SECRET = process.env.ECP_BANK_WEBHOOK_SECRET;

/**
 * Valida a assinatura HMAC-SHA256 do webhook.
 * O ecp-digital-bank envia o header X-Webhook-Signature com o hash do body.
 * @param {string} rawBody - Body raw (string) da requisição
 * @param {string} signature - Valor do header X-Webhook-Signature
 * @returns {boolean}
 */
export function validateSignature(rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * Processa webhook de PIX recebido.
 * Chamado pela rota POST /api/webhooks/bank/pix-received.
 * @param {object} db - Instância do better-sqlite3
 * @param {object} payload - Body parseado do webhook
 * @returns {{ processed: boolean, paymentId?: string, reason?: string }}
 */
export function processPixReceived(db, payload) {
  // 1. Extrair payment_id da description
  const match = payload.description?.match(/FoodFlow #(p_\w+)/);
  if (!match) {
    return { processed: false, reason: 'PAYMENT_ID_NOT_FOUND_IN_DESCRIPTION' };
  }
  const paymentId = match[1];

  // 2. Buscar payment pendente
  const payment = db.prepare(
    'SELECT * FROM payments WHERE id = ? AND status = ?'
  ).get(paymentId, 'pending');

  if (!payment) {
    // Pode ser idempotência (já processado) ou ID inválido
    const existing = db.prepare('SELECT status FROM payments WHERE id = ?').get(paymentId);
    if (existing?.status === 'completed') {
      return { processed: true, paymentId, reason: 'ALREADY_PROCESSED' };
    }
    return { processed: false, reason: 'PAYMENT_NOT_FOUND_OR_NOT_PENDING' };
  }

  // 3. Verificar valor
  if (payload.amountInCents !== payment.amount_cents) {
    return { processed: false, paymentId, reason: 'AMOUNT_MISMATCH' };
  }

  // 4. Atualizar payment e order numa transação
  const update = db.transaction(() => {
    db.prepare(`
      UPDATE payments 
      SET status = 'completed', 
          bank_transaction_id = ?,
          webhook_received_at = datetime('now'),
          webhook_payload = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(payload.transactionId, JSON.stringify(payload), paymentId);

    db.prepare(`
      UPDATE orders 
      SET status = 'confirmed', updated_at = datetime('now')
      WHERE id = ?
    `).run(payment.order_id);
  });
  update();

  // 5. Notificar frontend via SSE
  sseManager.emit(paymentId, 'payment_update', {
    status: 'completed',
    orderId: payment.order_id,
  });
  sseManager.closeAll(paymentId);

  return { processed: true, paymentId };
}
```

### 12.2 Rota do Webhook

```javascript
// server/routes/webhook.routes.mjs
import { validateSignature, processPixReceived } from '../services/webhook-handler.mjs';

export async function webhookRoutes(app) {
  // Fastify precisa do rawBody para validar HMAC
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      req.rawBody = body;
      done(null, JSON.parse(body));
    } catch (err) {
      done(err);
    }
  });

  app.post('/api/webhooks/bank/pix-received', async (request, reply) => {
    const signature = request.headers['x-webhook-signature'];

    // Validar assinatura
    if (!signature || !validateSignature(request.rawBody, signature)) {
      app.log.warn('Webhook signature validation failed');
      return reply.code(200).send({ received: true }); // Sempre 200 para o banco
    }

    // Processar
    const result = processPixReceived(app.db, request.body);

    if (result.processed) {
      app.log.info(`Webhook processed: payment ${result.paymentId} → completed`);
    } else {
      app.log.warn(`Webhook skipped: ${result.reason} (payment: ${result.paymentId || 'unknown'})`);
    }

    // Sempre retorna 200 para evitar retries
    return reply.code(200).send({ received: true });
  });
}
```

### 12.3 Expiration Worker

Worker que roda no startup do server e verifica pagamentos PIX expirados:

```javascript
// Dentro de server/index.mjs (após bootstrap)
import * as sseManager from './services/sse-manager.mjs';

function startExpirationWorker(db) {
  setInterval(() => {
    const expired = db.prepare(`
      SELECT id, order_id FROM payments 
      WHERE status = 'pending' 
        AND method = 'pix_qrcode'
        AND pix_expiration < datetime('now')
    `).all();

    for (const payment of expired) {
      db.prepare(`
        UPDATE payments SET status = 'expired', updated_at = datetime('now') WHERE id = ?
      `).run(payment.id);

      db.prepare(`
        UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?
      `).run(payment.order_id);

      sseManager.emit(payment.id, 'payment_update', { status: 'expired' });
      sseManager.closeAll(payment.id);
    }

    if (expired.length > 0) {
      app.log.info(`Expiration worker: ${expired.length} payment(s) expired`);
    }
  }, 30_000); // A cada 30 segundos
}
```

---

## 13. Configuração do Webhook no ECP Digital Bank

Para que o ecp-digital-bank notifique o FoodFlow, é necessário registrar a URL do webhook no banco. Isso requer uma adição ao ecp-digital-bank:

### 13.1 O que precisa ser adicionado ao ecp-digital-bank

1. **Tabela `webhook_subscriptions`** — registra URLs de callback por evento:
```sql
CREATE TABLE webhook_subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  event_type TEXT NOT NULL DEFAULT 'pix.received',
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

2. **Endpoint de registro** — permite que o FoodFlow registre seu webhook:
```
POST /webhooks/subscribe
Body: { eventType: "pix.received", url: "https://food.ecportilho.com/api/webhooks/bank/pix-received", secret: "<shared-hmac-secret>" }
Auth: Bearer <platform-jwt>
```

3. **Disparo do webhook** — no service de PIX do banco, após confirmar recebimento de um PIX, o banco dispara webhooks registrados:
```javascript
// Dentro do pix.service do ecp-digital-bank, após creditar o valor:
const subscriptions = db.prepare(
  "SELECT * FROM webhook_subscriptions WHERE account_id = ? AND event_type = 'pix.received' AND is_active = 1"
).all(recipientAccountId);

for (const sub of subscriptions) {
  const payload = JSON.stringify({
    event: 'pix.received',
    transactionId: transaction.id,
    amountInCents: transaction.amountInCents,
    pixKeyValue: recipientPixKey,
    senderName: senderName,
    senderTaxId: maskedTaxId,
    description: transfer.description,
    timestamp: new Date().toISOString(),
  });

  const signature = crypto.createHmac('sha256', sub.secret).update(payload).digest('hex');

  fetch(sub.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
    },
    body: payload,
  }).catch(err => {
    console.error(`Webhook delivery failed for ${sub.url}:`, err.message);
    // TODO: retry queue para entregas falhadas
  });
}
```

### 13.2 Seed do Webhook

O seed do FoodFlow pode incluir um script que registra o webhook automaticamente no banco:
```javascript
// scripts/register-webhook.mjs
const bankToken = await bankLogin(ECP_BANK_PLATFORM_EMAIL, ECP_BANK_PLATFORM_PASSWORD);
await fetch(`${ECP_BANK_API_URL}/webhooks/subscribe`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${bankToken}`,
  },
  body: JSON.stringify({
    eventType: 'pix.received',
    url: `${FOODFLOW_PUBLIC_URL}/api/webhooks/bank/pix-received`,
    secret: ECP_BANK_WEBHOOK_SECRET,
  }),
});
```

