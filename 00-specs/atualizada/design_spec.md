# Design Spec — ECP Food (FoodFlow) — Versão 2026-04-20

> Spec regenerada a partir dos arquivos CSS implementados em `03-product-delivery/client/src/styles/` e nos módulos de componentes em 20/04/2026.

## 1. Identidade Visual: Midnight Express

FoodFlow adota a direção **Midnight Express** — dark mode premium, glassmorphism, gradiente purple→pink, otimizado para pedidos noturnos. Tema é aplicado globalmente via `client/src/styles/tokens.css` e `global.css`, sem switcher de tema no MVP (default e único).

**Posicionamento visual:** Premium noturno, tech-forward, descoberta visual com card-glow cyan e hero gradient forte.

---

## 2. Design Tokens (CSS Custom Properties)

Fonte: `client/src/styles/tokens.css:1`

### 2.1 Cores

```css
:root {
  /* Backgrounds */
  --bg: #0d1020;
  --bg-soft: #101429;
  --surface: rgba(19, 24, 47, 0.86);
  --surface-strong: #151b34;
  --surface-elevated: rgba(21, 27, 52, 0.95);

  /* Typography */
  --text: #f4f6ff;
  --muted: #a7b0d3;

  /* Borders */
  --line: rgba(160, 174, 255, 0.12);

  /* Brand */
  --brand: #7b61ff;
  --brand-2: #ff5fa2;

  /* Semantic */
  --accent: #59d8ff;
  --success: #2fd387;
  --danger: #ff6b81;

  /* Shadows */
  --shadow: 0 18px 48px rgba(0, 0, 0, 0.36);
  --shadow-soft: 0 10px 30px rgba(0, 0, 0, 0.26);

  /* Gradients */
  --hero: linear-gradient(135deg, rgba(123, 97, 255, 0.98), rgba(255, 95, 162, 0.90));
  --card-glow: radial-gradient(circle at top right, rgba(89, 216, 255, 0.20), transparent 48%);
  --promo: linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.03));
  --chip-active-bg: linear-gradient(135deg, var(--brand), var(--brand-2));

  /* Tags */
  --tag-bg: rgba(123, 97, 255, 0.18);
  --tag-text: #d8d0ff;

  /* Navigation */
  --nav-bg: rgba(13, 16, 32, 0.92);

  /* Hero Text */
  --hero-text: #ffffff;
  --chip-active-text: #ffffff;
}
```

### 2.2 Radius (tokens dedicados)

```css
--radius-xl: 28px;
--radius-lg: 22px;
--radius-md: 16px;
--radius-sm: 12px;
```

### 2.3 Spacing

```css
--spacing-xs: 6px;
--spacing-sm: 10px;
--spacing-md: 14px;
--spacing-lg: 18px;
--spacing-xl: 22px;
--spacing-2xl: 28px;
```

### 2.4 Tipografia

Fonte: `client/src/styles/global.css:14`

```css
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system,
               BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
```

Utility classes em `global.css:50`:

| Classe | Size | Weight | Letter-spacing | Line-height |
|--------|------|--------|----------------|-------------|
| `.h1` | clamp(2rem, 5vw, 3.6rem) | 900 | -0.04em | 0.95 |
| `.h2` | 1.3rem | 800 | -0.03em | 1.2 |
| `.h3` | 1.12rem | 800 | -0.03em | 1.2 |
| `.h4` | 1rem | 700 | -0.02em | 1.3 |

Outros elementos observados:
- **Body:** 1rem / 400 / line-height 1.55
- **Meta/small:** 0.84-0.92rem / 600-700
- **Nav label:** 0.79rem (desktop) / 0.72rem (≤720px) / 700
- **Badge:** 0.65-0.85rem / 700-900
- **ChatWidget header title:** 0.875rem / 700

---

## 3. Sistema de Componentes Implementados

Todos com CSS Modules em `client/src/components/`.

### 3.1 Layout

#### Shell (`layout/Shell.jsx` + `Shell.module.css`)
- Container + `<Outlet />` do React Router
- Inclui `TopBar` e `BottomNav`
- Max-width e safe-area conforme padrão Midnight Express

#### TopBar (`layout/TopBar.jsx`)
- Brand mark + status pills com blur

#### BottomNav (`layout/BottomNav.module.css:1`)
- Fixed bottom, centrado horizontalmente
- Width: `min(760px, calc(100vw - 24px))` → `calc(100vw - 16px)` em ≤720px
- Padding 10px, radius 22px
- Background `var(--nav-bg)`, blur 14px, shadow, border `var(--line)`
- 5 itens iguais (flex:1), grid centered, gap 4px, font 0.79rem / 700
- **Item ativo:** bg `var(--tag-bg)`, color `var(--tag-text)`, radius 16px
- **Badge de contagem:** círculo 18×18px, bg `var(--brand-2)`, font 0.65rem/900, posicionado top:2px right:calc(50%-16px)
- **Itens (labels atuais):** Início, Buscar, Cardápio, Carrinho, Conta
- **Safe area:** `bottom: max(12px, env(safe-area-inset-bottom))`

### 3.2 UI Primitives (`components/ui/`)

| Componente | Arquivos |
|-----------|----------|
| Badge | `Badge.jsx`, `Badge.module.css` — inclui `BadgeHero` para o hero |
| Button | `Button.jsx`, `Button.module.css` — variantes `primary`, `back`, `theme`, `checkout` |
| CategoryChips | `CategoryChips.jsx`, `.module.css` |
| GlassCard | `GlassCard.jsx`, `.module.css` |
| Toast | `Toast.jsx`, `.module.css` — com `ToastProvider` + `useToast` |

### 3.3 Restaurant / Menu (`components/restaurant/`)

| Componente | Função |
|-----------|--------|
| `RestaurantGrid` | Grid responsivo de cards |
| `RestaurantCard` | Card com cover gradient, rating, ETA, fee, min, tags, promo, CTA |
| `MenuItemCard` | Item do cardápio: emoji, nome, descrição, badge, preço, botão Adicionar |

### 3.4 Cart (`components/cart/`)

| Componente | Função |
|-----------|--------|
| `CartPanel` | Sidebar desktop / bottom sheet mobile |
| `CartItem` | Linha com emoji, nome, restaurante, quantity control, preço |
| `CartSummary` | Subtotal, delivery, discount, total |

### 3.5 Payment (`components/payment/`)

Fonte: `Payment.module.css:1`

#### PaymentMethodSelector (`PaymentMethodSelector.jsx`)
- Grid `1fr 1fr 1fr` (3 colunas), gap 14px
- Cada card: padding 18px, radius 22px, bg `var(--surface-strong)`, border 1px `var(--line)`
- **Hover:** `translateY(-2px)` + `var(--shadow-soft)`
- **Selecionado:** `border-color: rgba(123,97,255,0.48)` + glow `box-shadow: 0 0 0 3px rgba(123,97,255,0.14)`
- Ícone 56×56px, radius 16px, bg `var(--tag-bg)`, font 1.6rem (emojis: 💳 🏦 📱)
- Título 1rem/700, Descrição 0.84rem/`var(--muted)`
- **Três opções ativas:** "Cartao de Credito" (default), "Cartao ECP Digital Bank", "PIX QR Code"

#### BankLoginForm (`BankLoginForm.jsx`)
- Container max-width 480px
- Header com ícone bancário 42×42px radius 14px + título + subtítulo
- Inputs: `.input-field` global (radius 16px, padding 14px 16px, bg `var(--surface-strong)`, border `var(--line)`, focus glow brand 14%)
- Nota de segurança: `var(--tag-bg)`, radius 16px, 0.84rem

#### CardSelector (`CardSelector.jsx`)
- Lista de cartões virtuais retornados pelo banco
- Cards com ícone Lucide, last4, saldo

#### PixQrCode (`PixQrCode.jsx`)
- QR Code centralizado com timer de expiração
- Texto "copia e cola" com botão de cópia
- Animação `qrAppear` (fade + scale) ao aparecer
- Estados via SSE: conectado (dotPulse), confirmado (checkPop), expirado (overlay)

#### PaymentStatus (`PaymentStatus.jsx`)
- Estados: `processing`, `completed`, `failed`, `expired`
- Usa keyframes `processingPulse`, `checkPop`, `dotPulse`

### 3.6 Chat (`components/chat/`) — **novo vs. spec antiga**

Fonte: `ChatWidget.jsx`

#### ChatWidget (`ChatWidget.jsx`)
- **FAB** fixed bottom:24 right:24, z-index 9999, 56×56px, border-radius 50%
- Background: `var(--hero)` (gradiente purple→pink)
- Shadow: `var(--shadow)`
- Hover: `transform: scale(1.08)`
- Ícone Lucide `MessageCircle` 24px, color `#fff`

**Panel desktop (>640px):**
- Fixed bottom:24 right:24, 400×600px, radius `var(--radius-xl)` (28px)
- Background `var(--bg)`, border `var(--line)`, shadow principal

**Panel mobile (≤640px):**
- Fullscreen (100%×100%), radius 0

**Header:**
- Padding 12px 16px, border-bottom `var(--line)`, bg `var(--surface-strong)`
- Icon 32×32px radius-sm com `var(--hero)`, label "AI"
- Title "Assistente FoodFlow" 0.875rem/700
- Subtitle "Online" 10px/`var(--muted)`
- Ações: `RotateCcw` (nova conversa) + `X` (fechar), 16px

**Error bar:**
- Padding 8px 16px, bg `rgba(255,107,129,0.10)`, border `rgba(255,107,129,0.20)`, text `var(--danger)` 0.75rem

**Quick actions (primeira interação):**
- "Ver restaurantes", "Buscar comida", "Ver meu carrinho", "Meus pedidos"

**Bounce keyframe** injetado em runtime para typing animation:
```css
@keyframes chatBounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
```

#### ChatMessages, ChatInput, ChatBubble
- Sem CSS Module; estilos inline com design tokens

### 3.7 Forms globais (`global.css:81`)

```css
.input-field {
  width: 100%;
  padding: 14px 16px;
  background: var(--surface-strong);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-field:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.14);
}
.form-group label {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--muted);
  margin-bottom: 8px;
}
```

### 3.8 Scrollbar (`global.css:121`)

Largura 6px, thumb `rgba(160,174,255,0.15)` (hover 0.25), radius 999px.

---

## 4. Animações (`client/src/styles/animations.css:1`)

| Keyframe | Uso |
|----------|-----|
| `fadeIn` | Entrada geral (opacity + translateY 6px) |
| `checkPop` | Check de pagamento confirmado (scale 0→1) |
| `processingPulse` | Pulse brand 20% durante processamento |
| `dotPulse` | 3 dots sequenciais (SSE waiting) |
| `slideUp` / `slideDown` | Bottom sheet do carrinho (translateY 102% ↔ 0) |
| `fadeBackdropIn` | Backdrop do sheet |
| `shimmer` | Skeleton loading |
| `spin` | Spinner de loading |
| `toastIn` / `toastOut` | Entrada/saída de toasts (top) |
| `qrAppear` | QR Code (opacity + scale 0.95→1) |

Durações padrão: 0.18-0.25s ease (hover), 0.3s ease-out (transformações), 1.2s infinite (dotPulse).

---

## 5. Breakpoints Responsivos

| Nome | Largura | Comportamento principal |
|------|---------|-------------------------|
| **Desktop** | > 1180px | Sidebar de carrinho, grid 2-col no catálogo |
| **Tablet** | 981-1180px | Cart vira bottom sheet, grid mantém 2-col |
| **Tablet narrow** | 721-980px | Tudo 1 coluna, hero stack |
| **Mobile** | ≤ 720px | Nav font 0.72rem, padding reduzido |
| **Chat mobile** | ≤ 640px | ChatWidget em fullscreen |

Exemplos observados:
- `BottomNav`: 760px → `calc(100vw - 16px)` ≤720px (`BottomNav.module.css:65`)
- `PaymentMethodSelector`: grid 3 colunas (sem media query de colapso explícito; stack natural em containers estreitos)

---

## 6. Cover Gradients por Restaurante (seed atual)

Fonte: `server/seed.mjs:56`

| Restaurante | Gradient |
|-------------|----------|
| Pasta & Fogo | `linear-gradient(135deg, #e44d26, #f7b731)` |
| Sushi Wave | `linear-gradient(135deg, #0c3483, #a2b6df)` |
| Burger Lab | `linear-gradient(135deg, #f7b731, #fc5c65)` |
| Green Bowl Co. | `linear-gradient(135deg, #38ada9, #78e08f)` |
| Pizza Club 24h | `linear-gradient(135deg, #e55039, #f8c291)` |
| Brasa & Lenha | `linear-gradient(135deg, #6a3093, #a044ff)` |

> **Nota:** Os gradients de seed divergem dos documentados na spec antiga (que eram `#f14b3d→#ffb067`, `#1f2937→#1d4ed8`, etc.). Os valores acima são os que o banco realmente carrega hoje.

---

## 7. Emojis como Ícones

- **Hero/categoria:** 🍝 🍣 🍔 🥗 🍕 🥩 🍽️
- **Menu items:** determinados por restaurante (🍰 🥖 🐟 🥤 🫐 🌯 🧅 🍜 🍡 🍹 🍮 🥣 🍢 🥟)
- **Navegação:** 🏠 🔎 🍽️ 🛒 👤 (fonte: `BottomNav.jsx:6`)
- **Payment methods:** 💳 🏦 📱 (fonte: `PaymentMethodSelector.jsx`)
- **ChatWidget avatar:** texto "AI" em caixa com gradient brand

**Ícones funcionais via Lucide React** (`lucide-react@0.400.0`):
- `MessageCircle`, `X`, `RotateCcw` — ChatWidget header
- `CreditCard`, `QrCode`, `Building2`, `Shield`, `Copy`, `CheckCircle2`, `XCircle`, `Clock`, `WifiOff` — componentes de pagamento

---

## 8. Glassmorphism e Efeitos

- `backdrop-filter: blur(14px)` no BottomNav
- `--surface` com 86% opacity, `--surface-elevated` com 95%
- `--nav-bg` com 92% opacity (13,16,32)
- Borders luminosas via `var(--line)` = `rgba(160,174,255,0.12)`
- `--card-glow` radial cyan 20% top-right para cards de restaurante
- Sombras: `--shadow` (hero/nav) e `--shadow-soft` (cards)

---

## 9. Estados de Interface Implementados

### 9.1 Carrinho Vazio
- Mensagem em `CheckoutPage.jsx:27` quando `cart.items.length === 0`
- Container centralizado, padding 48px 20px, color `var(--muted)`

### 9.2 Pagamento (fonte: `CheckoutPage.module.css`, `PaymentPages.module.css`)

| Estado | Visual |
|--------|--------|
| Selecionar método | 3 cards com hover/select (glow ring brand 14%) |
| Loading (gerando QR) | `GlassCard` + `PaymentStatus status="processing"` (processingPulse) |
| QR exibido | `PixQrCode` component + SSE listener |
| Confirmado | `PaymentStatus status="completed"` + check animation + toast success |
| Expirado | Toast error + overlay opcional |
| Falha | `PaymentStatus status="failed"` + mensagem + botão retry |

### 9.3 Toasts (`components/ui/Toast.jsx`)
- `useToast(message, type)` — types: `success`, `error`
- Animação `toastIn` / `toastOut` (topo, translateY)

### 9.4 Loading genérico
- Texto "Carregando..." centrado na `ProtectedRoute` (`App.jsx:28`)
- Skeletons com `shimmer` onde aplicável

---

## 10. Telas Implementadas

Fonte: `App.jsx:49`

### 10.1 Fluxo Consumidor

| Tela | Rota | Componentes principais |
|------|------|----------------------|
| Login | `/login` | form email/senha |
| Cadastro | `/register` | form nome/email/senha/telefone |
| Home | `/` | HeroBanner, CategoryChips, RestaurantGrid, CartPanel, BadgeHero ("🔥 Promo do dia") |
| Detalhe Restaurante | `/restaurant/:id` | banner + MenuItemCard grid + CartPanel |
| Checkout | `/checkout` | resumo, endereço readOnly, cupom, PaymentMethodSelector, CartSummary, botão checkout |
| Pagamento Cartão ECP | `/checkout/card` | BankLoginForm → CardSelector → PaymentStatus |
| Pagamento Cartão Cadastrado | `/checkout/credit-card` | CardSelector (cartões locais) + PaymentStatus |
| Pagamento PIX | `/checkout/pix` | PixQrCode + SSE listener + PaymentStatus |
| Pedido Confirmado | `/orders/:id` | OrderConfirmedPage |
| Histórico | `/orders` | OrdersPage (lista) |
| Favoritos | `/favorites` | FavoritesPage |
| Perfil | `/profile` | ProfilePage |
| Cartões | `/credit-cards` | CreditCardsPage (CRUD) |

### 10.2 Fluxo Restaurante

| Tela | Rota | Descrição |
|------|------|-----------|
| Painel Restaurante | `/restaurant-panel` | Menu CRUD + pedidos + settings + settlements |

### 10.3 Fluxo Admin

| Tela | Rota | Descrição |
|------|------|-----------|
| Admin | `/admin` | Dashboard + restaurantes + categorias + cupons (tudo em uma página) |

### 10.4 Chat Widget (overlay, disponível em todas as rotas autenticadas)

- Renderizado em `App.jsx:43` via `AuthenticatedChat`
- Só aparece quando `user && !loading`
- Posicionado por cima de qualquer tela protegida

---

## 11. Padrões de Formatação (`client/src/lib/formatters.js`)

### 11.1 Moeda
- `formatCurrency(valor)` → `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Exemplo: `R$ 49,90`
- Taxa de entrega zero é renderizada como "Grátis" nas tools do chat (`transaction.mjs`)

### 11.2 Pluralização
- `pluralize(count, singular, plural)` usado no HomePage para "restaurante/restaurantes"

### 11.3 Tempo
- ETA formatado como `"${eta_min}-${eta_max} min"` (ex: `25-40 min`)

---

## 12. Acessibilidade

- **Contraste:** #f4f6ff sobre #0d1020 ≈ 16:1 (WCAG AAA)
- **Focus visible:** `box-shadow: 0 0 0 3px rgba(123,97,255,0.14)` nos inputs (global.css:98)
- **Touch targets:** Botões do ChatWidget 56×56px, nav items ≥44px
- **ARIA:** labels nos botões do ChatWidget (`aria-label="Abrir chat"`, `aria-label` nos nav items)
- **Safe area:** `env(safe-area-inset-bottom)` no BottomNav (iOS)
- **Semântica:** `<nav>` no BottomNav, `<section>`, `<button>` com roles

---

## 13. Diferenças vs. Design Spec Original (2026-03)

1. **Tema único real:** a spec antiga mencionava "futuramente switchable" via `ThemeContext`; este context não existe no código.
2. **3 métodos de pagamento** em vez de 2: adicionado "Cartão de Crédito cadastrado" como default.
3. **ChatWidget** é um sistema de design novo (FAB + panel responsivo + bounce animation) não previsto na spec antiga.
4. **Bottom nav:** labels continuam Início / Buscar / Cardápio / Carrinho / Conta, mas "Buscar" hoje navega para `/?search=1` (sem tela dedicada) e "Cardápio" também cai em `/`.
5. **Cover gradients** seed divergem dos documentados originalmente (tabela em §6).
6. **CartSummary** exibe 3 linhas (subtotal, delivery, total) e lida com cupom via `cart.coupon` + `cart.setCoupon`.
7. **SSE com token via query**: o spec antigo sugeriu polyfill com headers; a implementação usa `?token=` com validação no `authMiddleware` (`auth.mjs:51`).
8. **Cartão cadastrado (F09)** e Settlements (F14) geram telas próprias não previstas na spec antiga.
