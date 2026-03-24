# Design Spec — FoodFlow

## 1. Identidade Visual: Midnight Express

FoodFlow adota a direção **Midnight Express** — a identidade premium noturna do protótipo. Essa direção é sofisticada, memorável e otimizada para dark mode, pedidos noturnos e experiência aspiracional. Toda a UI é construída sobre esta paleta como tema default e único do MVP.

**Posicionamento visual:** Premium noturno, tech-forward, experiência de descoberta que valoriza cada restaurante com presença visual forte.

---

## 2. Design Tokens (CSS Custom Properties)

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

  /* Radius */
  --radius-xl: 28px;
  --radius-lg: 22px;
  --radius-md: 16px;
  --radius-sm: 12px;
}
```

### 2.2 Tipografia

```css
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--text);
}
```

| Elemento | Size | Weight | Letter-spacing | Line-height |
|----------|------|--------|----------------|-------------|
| H1 (hero) | clamp(2rem, 5vw, 3.6rem) | 900 | -0.04em | 0.95 |
| H2 (section title) | 1.3rem | 800 | -0.03em | 1.2 |
| H3 (card title) | 1.12rem | 800 | -0.03em | 1.2 |
| H4 (item title) | 1rem | 700 | -0.02em | 1.3 |
| Body | 1rem | 400 | 0 | 1.55 |
| Small / meta | 0.84-0.92rem | 600-700 | 0.01em | 1.45 |
| Price | 1.12rem | 800 | -0.02em | 1 |
| Badge / tag | 0.82-0.85rem | 700 | 0.01em | 1.2 |
| Nav item | 0.79rem (desktop) / 0.72rem (mobile) | 700 | 0 | 1 |
| Stat value | 1.55rem | 900 | -0.04em | 1 |

### 2.3 Espaçamento

O sistema de espaçamento segue incrementos de 2px com âncoras em 8, 10, 12, 14, 16, 18, 22, 24, 28.

| Token | Valor | Uso |
|-------|-------|-----|
| `spacing-xs` | 6px | Gaps mínimos entre texto |
| `spacing-sm` | 10px | Gap entre chips, pills, items |
| `spacing-md` | 14px | Gap entre cards, inner padding |
| `spacing-lg` | 18px | Padding de cards, sections |
| `spacing-xl` | 22px | Padding de glass cards, cart panels |
| `spacing-2xl` | 28px | Padding do hero |

### 2.4 Sombras e Efeitos

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow` | `0 18px 48px rgba(0,0,0,0.36)` | Hero, cart panel, bottom nav |
| `--shadow-soft` | `0 10px 30px rgba(0,0,0,0.26)` | Cards, pills, brand |
| Hover lift | `transform: translateY(-2px)` | Cards e botões |
| Active lift | `transform: translateY(-1px)` | Todos os interativos |
| Backdrop blur | `backdrop-filter: blur(10-18px)` | Surfaces, nav, modais |
| Transition | `0.18-0.25s ease` | Todas as transições |

---

## 3. Sistema de Componentes

### 3.1 Layout Shell

**Container principal (`Shell`):**
- `max-width: 1440px`, centrado
- Padding: `max(18px, env(safe-area-inset-*))` para safe area em iOS
- Padding bottom: `calc(88px + env(safe-area-inset-bottom))` para compensar bottom nav

**Grid principal (`MainGrid`):**
- Desktop (>1180px): `grid-template-columns: minmax(0, 1fr) 380px` (content + cart sidebar)
- Tablet/Mobile (≤1180px): `grid-template-columns: minmax(0, 1fr)` (cart vira bottom sheet)
- Gap: 24px

### 3.2 Top Bar

- Flex row, `space-between`, wrap
- **Brand mark:** 40×40px, border-radius 14px, gradient brand, emoji 20px, dentro de pill com blur
- **Status pills:** inline-flex, radius 999px, surface + line border, blur backdrop

### 3.3 Hero Banner

- Grid: `1.35fr 0.95fr` (desktop) → `1fr` (mobile ≤980px)
- Background: `var(--hero)` — gradient 135deg de purple para pink
- Border-radius: `var(--radius-xl)` (28px)
- Elementos decorativos: dois pseudo-elements circulares `::before` e `::after` com white overlay 12-16% opacity
- **Search box:** grid 3 colunas (input + 2 botões) → 1 coluna no mobile, blur 18px, border white 20%
- **Promo card:** glassmorphism com progress bar e stats row
- **Map card:** grid 3×2 com dots de emoji e métricas

### 3.4 Glass Card

Base visual para todas as seções de conteúdo:
```css
background: var(--surface);           /* rgba(19,24,47,0.86) */
border: 1px solid var(--line);        /* rgba(160,174,255,0.12) */
border-radius: var(--radius-xl);      /* 28px */
box-shadow: var(--shadow-soft);
backdrop-filter: blur(16px);
overflow: hidden;
```
- Padding interno: 22px (`.card-pad`)

### 3.5 Category Chips

- Flex row, wrap, gap 10px
- **Inativo:** bg-soft, muted color, line border, 999px radius
- **Ativo:** gradient brand (purple→pink), white text, glow shadow `color-mix(in srgb, var(--brand) 22%, transparent)`
- Padding: 11px 14px, font-weight 700

### 3.6 Restaurant Card

- Grid layout com gap 16px, padding 16px, radius 24px
- Background: `card-glow` overlay + `surface-strong`
- Border: 1px solid `line`, transição de border-color ao selecionar
- **Cover:** min-height 160px, border-radius 20px, gradient customizado por restaurante, overlay tags
- **Selected state:** border brand 48% + glow ring 3px brand 14%
- **Hover:** translateY(-3px) + shadow-soft
- **Body:** restaurant name, cuisine, meta pills (ETA, fee, min), tags, promo, CTA

### 3.7 Menu Item Card

- Grid, gap 14px, padding 18px, radius 22px
- Border: 1px solid line, surface-strong background
- **Top row:** flex space-between — título (tag + h4 + description) × emoji box (46px, radius 16px, tag-bg)
- **Bottom row:** flex space-between — price (800 weight, 1.12rem) × botão "Adicionar"

### 3.8 Cart Panel

**Desktop (>1180px):**
- Position sticky, top 18px
- Surface-elevated background, blur 18px, shadow principal
- Radius: radius-xl, padding 22px

**Mobile (≤1180px):**
- Bottom sheet (`transform: translateY(102%)` → `translateY(0)`)
- Backdrop: rgba(5,10,20,0.44) + blur 6px
- Max-height: `min(86vh, 760px)`, overflow auto
- **Floating button:** fixed, bottom 82px + safe-area, gradient brand, white text, glow shadow

### 3.9 Cart Item

- Grid, gap 12px, padding 14px, radius 18px
- Border: 1px solid line, bg-soft background
- **Quantity control:** inline-flex, 999px radius, line border, surface bg
- **Qty button:** 30×30px, 999px radius, surface-strong, 900 weight

### 3.10 Checkout Button

- Width 100%, padding 16px 18px, radius 20px
- Background: gradient brand (purple→pink)
- White text, 900 weight, 1rem
- Shadow: `0 14px 28px color-mix(in srgb, var(--brand) 30%, transparent)`
- Disabled: opacity 0.55, no shadow, cursor not-allowed

### 3.11 Bottom Navigation

- Fixed, centrado bottom, z-index 35
- Width: `min(760px, calc(100vw - 24px))` → `calc(100vw - 16px)` no mobile
- Padding 10px, radius 22px
- Background: nav-bg (rgba(13,16,32,0.92)), blur 14px, shadow, border line
- **Items:** 5 flex items iguais, grid centered, gap 6px, 0.79rem
- **Active:** tag-bg background, tag-text color, radius 16px
- **Itens:** Início, Buscar, Cardápio, Carrinho, Conta

### 3.12 Tags, Badges e Pills

| Componente | Background | Text | Radius | Padding |
|------------|-----------|------|--------|---------|
| Tag | `var(--tag-bg)` | `var(--tag-text)` | 999px | 9px 12px |
| Badge (hero) | `rgba(255,255,255,0.16)` | white | 999px | 8px 12px |
| Cover tag | `rgba(255,255,255,0.18)` + blur 8px | white | 999px | 8px 10px |
| Rating chip | `rgba(255,255,255,0.18)` + blur 8px | white | 999px | 8px 10px |
| Meta pill | `var(--tag-bg)` | `var(--tag-text)` | 999px | 9px 12px |
| Status pill | `var(--surface)` | `var(--muted)` | 999px | 10px 14px |

### 3.13 Botões

| Variante | Background | Text | Radius | Padding | Extra |
|----------|-----------|------|--------|---------|-------|
| Primary | #fff | #111 | 18px | 14px 18px | shadow 0 10px 26px rgba(0,0,0,0.12) |
| Ghost | rgba(255,255,255,0.12) | white | 18px | 14px 18px | border white 18% |
| Mini (CTA) | gradient brand | #fff | 16px | 12px 14px | glow shadow brand 28% |
| Theme | tag-bg | tag-text | 999px | 10px 14px | 800 weight |
| Icon | tag-bg | tag-text | 14px | — | 42×42px, grid center |

### 3.14 Payment Method Selector

Componente de seleção entre Cartão ECP e PIX QR Code no checkout.

- Container: glass-card com card-pad (22px)
- **Duas opções em cards lado a lado** (desktop) ou empilhadas (mobile ≤720px)
- Cada opção: radius 22px, padding 18px, border 1px solid line, surface-strong bg
- **Selecionada:** border brand 48%, glow ring 3px (mesmo padrão de restaurant-card selected)
- **Ícone:** Lucide `CreditCard` ou `QrCode`, 32×32px em caixa 56×56px, tag-bg, radius 16px
- **Título:** 1rem, 700 weight — "Cartão ECP Digital Bank" / "PIX QR Code"
- **Descrição:** 0.84rem, muted — "Débito direto na sua conta" / "Escaneie e pague com qualquer banco"
- Hover: translateY(-2px) + shadow-soft

### 3.15 Bank Login Form

Formulário de autenticação no ecp-digital-bank durante o fluxo de cartão.

- Container: glass-card, max-width 480px, centrado
- **Header:** ícone do banco (Lucide `Building2`, 24px) + "Entrar no ECP Digital Bank", 1.2rem, 800 weight
- **Descrição:** muted, "Insira suas credenciais do banco digital para pagar com cartão virtual"
- **Inputs:** border 1px solid line, radius var(--radius-md) (16px), padding 14px 16px, surface-strong bg
  - Placeholder: muted color
  - Focus: border brand, glow 0 0 0 3px brand 14%
- **Botão submit:** checkout-btn style (gradient brand, full-width, 900 weight)
- **Nota de segurança:** tag-bg container, radius 16px, 0.84rem, com ícone Lucide `Shield`
  - Texto: "Suas credenciais são usadas apenas para esta transação e não são armazenadas"
- **Estado de loading:** botão com spinner (border animation) + texto "Autenticando..."
- **Estado de erro:** danger color, radius 16px, padding 12px, bg danger 10% opacity

### 3.16 Card Selector

Lista de cartões virtuais retornados pelo ecp-digital-bank.

- Container: grid, gap 12px
- **Card item:** flex row, radius 18px, padding 14px, border 1px solid line, surface-strong bg
  - **Ícone do cartão:** Lucide `CreditCard`, 20px, dentro de caixa 42×42px, tag-bg, radius 12px
  - **Info:** nome "Cartão Virtual", last4 "•••• 4532" em 0.92rem 700 weight, status tag
  - **Saldo:** brand color, 1rem, 800 weight, alinhado à direita
- **Selecionado:** border brand 48%, glow ring
- **Bloqueado:** opacity 0.5, cursor not-allowed, tag "Bloqueado" em danger bg
- **Resumo abaixo:** glass card com: saldo disponível (success color se suficiente, danger se insuficiente), total do pedido, diferença

### 3.17 PIX QR Code Display

Exibição do QR Code gerado pelo ecp-digital-bank para pagamento. O frontend abre uma conexão SSE (`EventSource`) e aguarda o evento `payment_update` do servidor, que é disparado quando o ecp-digital-bank envia o webhook confirmando o recebimento.

- Container: glass-card, centrado, max-width 480px
- **QR Code:** imagem base64, 240×240px (desktop) / 200×200px (mobile), radius 22px, border 4px solid white 10%, padding 16px, surface-strong bg
- **Copia-e-cola:** input readonly com botão "Copiar" (Lucide `Copy`), radius 16px, click copia para clipboard + toast "Código copiado"
- **Timer de expiração:** barra de progresso circular (accent color → danger nos últimos 2 min)
  - Texto: "Expira em 09:42" — countdown em tempo real (client-side, baseado no `pix_expiration` retornado)
  - Quando < 2 min: texto danger color, pulse animation sutil
- **Status (via SSE):** abaixo do QR Code
  - Conectado + aguardando: "Aguardando pagamento..." com spinner (brand color) e dot-pulse
  - Pagamento confirmado (evento SSE `completed`): QR Code faz fade-out, check animation entra (scale 0→1, 0.3s ease-out) com success color, texto "Pagamento confirmado!", redirect automático em 2s
  - QR Code expirado (evento SSE `expired` ou timer local): QR Code com overlay escuro 60%, botão "Gerar novo QR Code" centralizado em danger color
  - Conexão SSE perdida: ícone Lucide `WifiOff` em muted, texto "Reconectando...", tentativa automática de reconexão
- **Instrução:** muted, "Abra o app do seu banco, escaneie o QR Code ou copie o código acima"
- **Nota de segurança:** tag-bg container, 0.84rem, "Você será notificado automaticamente quando o pagamento for confirmado"

### 3.18 Payment Status Indicator

Feedback visual do processamento do pagamento.

- **Processing:** spinner circular (brand gradient), texto "Processando pagamento...", pulse glow
- **Completed:** check icon (Lucide `CheckCircle2`) em success color, 48px, texto "Pagamento confirmado!", transição 0.3s scale 0→1
- **Failed:** x icon (Lucide `XCircle`) em danger color, mensagem de erro, botão "Tentar novamente"
- **Expired:** clock icon (Lucide `Clock`) em muted, "Tempo expirado", botão "Gerar novo QR Code"
- Todos os estados: centrados, glass-card container, gap 16px

---

## 4. Breakpoints Responsivos

| Nome | Largura | Layout |
|------|---------|--------|
| **Desktop** | > 1180px | Grid 2 colunas (content + cart sidebar), hero 2 colunas, restaurant grid 2 colunas, menu grid 2 colunas |
| **Tablet** | 981-1180px | Grid 1 coluna, cart vira bottom sheet + floating button, hero e grids mantém 2 colunas |
| **Tablet narrow** | 721-980px | Hero 1 coluna, todos os grids 1 coluna, toolbar 1 coluna |
| **Mobile** | ≤ 720px | Padding reduzido (12px), search 1 coluna, brand/pills full-width, nav item 0.72rem |

### Comportamento Responsivo Chave

- **Cart panel:** sidebar sticky no desktop → bottom sheet no mobile (≤1180px)
- **Mobile cart button:** hidden no desktop → visible no mobile com contagem de itens
- **Hero:** 2 colunas → 1 coluna no ≤980px (preview cards empilham abaixo)
- **Restaurant grid:** 2 colunas → 1 coluna no ≤980px
- **Menu grid:** 2 colunas → 1 coluna no ≤980px
- **Search box:** 3 colunas (input + 2 botões) → 1 coluna no ≤720px
- **Top bar:** flex row → full-width stacked no ≤720px
- **Bottom nav:** sempre visível, `env(safe-area-inset-bottom)` para iOS

---

## 5. Cover Gradients por Restaurante

Cada restaurante possui um gradient customizado para o cover do card e banner de detalhe:

| Restaurante | Gradient |
|-------------|----------|
| Pasta & Fogo | `linear-gradient(135deg, #f14b3d, #ffb067)` |
| Sushi Wave | `linear-gradient(135deg, #1f2937, #1d4ed8)` |
| Burger Lab | `linear-gradient(135deg, #171717, #f97316)` |
| Green Bowl Co. | `linear-gradient(135deg, #059669, #84cc16)` |
| Pizza Club 24h | `linear-gradient(135deg, #7f1d1d, #f59e0b)` |
| Brasa & Lenha | `linear-gradient(135deg, #44403c, #f97316)` |

Estes gradients são armazenados no banco de dados (`cover_gradient`) e renderizados como `background` inline.

---

## 6. Emojis como Ícones

O MVP utiliza emojis nativos do sistema em vez de ícones SVG para:
- Brand mark: 🍜
- Categorias de card: 🍝 🍣 🍔 🥗 🍕 🥩
- Menu items: emoji por item (🍝 🧀 🍅 🍮 🌶️ 🥟 🔥 🍗 🍟 🥤 🌯 🧃 🍪 🥩 🥘 🍨)
- Navigation: 🏠 🔎 🍽️ 🛒 👤
- Status: 📍 ⚡ ⏱️ 🚚 🎟️ ⭐ 🔥 📡 🧠 💡 🛍️
- Map dots: 🍔 🍣 🥗

**Exceção:** Ícones da UI funcional (setas, X, check, etc.) usam Lucide React para consistência e acessibilidade.

---

## 7. Glassmorphism e Efeitos Visuais

O design system Midnight Express usa glassmorphism consistente:

- **Backdrop blur:** `blur(10px)` a `blur(18px)` em superfícies elevadas
- **Transparência:** fundos com 86-96% opacity via rgba
- **Borders luminosas:** 1px solid com white/blue overlay 10-24%
- **Card glow:** radial-gradient top-right com accent (cyan) 20% para cards de restaurante
- **Hero ornaments:** pseudo-elements circulares com white 12-16% para profundidade
- **Promo surfaces:** gradient 135deg de white 10% → white 3% para cards dentro do hero

---

## 8. Animações e Micro-interações

| Interação | Propriedade | Valor | Timing |
|-----------|-------------|-------|--------|
| Card hover | transform | translateY(-3px) | 0.22s ease |
| Button hover | transform | translateY(-1px) | 0.18s ease |
| Card select | border-color + box-shadow | brand 48% + glow 3px | 0.2s ease |
| Theme switch | background + color (body) | theme tokens | 0.35s ease |
| Bottom sheet open | transform | translateY(102%) → translateY(0) | 0.25s ease |
| Backdrop open | opacity | 0 → 1 | 0.2s ease |
| Scroll to section | scroll | smooth | native |
| Payment method select | border-color + box-shadow | brand 48% + glow 3px | 0.2s ease |
| Bank login → card list | transform | slide-left | 0.25s ease |
| QR Code appear | opacity + transform | 0→1, scale(0.95→1) | 0.3s ease-out |
| Payment confirmed | transform | scale(0→1) + check icon | 0.3s ease-out |
| Timer countdown | stroke-dashoffset (SVG circle) | continuous | linear per second |
| Polling dots | opacity | 3-dot pulse sequence | 1.2s infinite |
| SSE connected indicator | opacity | fade-in dot (success) | 0.3s ease |
| SSE reconnecting | opacity | pulse badge (muted) | 2s infinite |

---

## 9. Estados de Interface

### 9.1 Carrinho Vazio
- Emoji 🛍️ em caixa 74×74px, tag-bg, radius 24px
- Título "Carrinho vazio"
- Descrição muted guiando o usuário a adicionar itens

### 9.2 Busca Sem Resultados
- Glass card com título e descrição sugerindo termos alternativos
- Tom orientador, sem frustração

### 9.3 Loading States (a implementar)
- Skeleton com pulse animation nos cards
- Background: alternância entre surface e surface-strong
- Mesmas dimensões dos componentes finais

### 9.4 Error States (a implementar)
- Toast notification no topo com danger color
- Duração: 4s com fade out
- Ícone de erro + mensagem + botão de retry quando aplicável

### 9.5 Success States (a implementar)
- Toast notification com success color
- Confirmação de ação (item adicionado, pedido criado)
- Animação sutil de check

### 9.6 Estados de Pagamento

**Seleção de método:**
- Dois cards interativos com hover/select states
- Transição suave entre métodos (opacity fade 0.2s)

**Login no banco (Cartão ECP):**
- Idle: form limpo com inputs vazios
- Loading: botão com spinner, inputs desabilitados (opacity 0.6)
- Erro: borda danger nos inputs, mensagem abaixo em danger color com bg danger 10%
- Sucesso: transição automática para Card Selector (slide-left 0.25s)

**Seleção de cartão:**
- Lista com cards clicáveis, saldo exibido ao lado
- Saldo insuficiente: card com borda danger dashed, badge "Saldo insuficiente" em danger
- Confirmação: botão checkout-btn com valor total

**QR Code PIX (SSE-driven):**
- Gerando: skeleton do QR Code (pulse animation, 240×240px, surface bg)
- Exibindo: QR Code + timer + código copia-e-cola + indicador SSE "Conectado"
- Aguardando: indicador "Aguardando..." com dots animation (3 dots pulsando sequencialmente, 1.2s loop)
- Confirmado (evento SSE): QR Code faz fade-out (opacity 1→0, 0.2s), check animation entra (scale 0→1, 0.3s ease-out), glow ring success 20%, texto "Pagamento confirmado!", countdown "Redirecionando em 2s..."
- Expirado (evento SSE ou timer local): QR Code com overlay escuro 60%, botão "Gerar novo" centralizado
- SSE desconectado: badge muted "Reconectando..." com ícone WifiOff, auto-retry com backoff

---

## 10. Telas por Fluxo

### 10.1 Fluxo Consumidor

| Tela | Rota | Componentes Principais |
|------|------|----------------------|
| Login | `/login` | Form com email + senha, link para cadastro |
| Cadastro | `/register` | Form com nome + email + senha + telefone |
| Home | `/` | TopBar, HeroBanner, CategoryChips, RestaurantGrid, RestaurantDetail/MenuGrid, CartPanel |
| Detalhe Restaurante | `/restaurant/:id` | Banner, MenuGrid, CartPanel (mobile: página dedicada) |
| Carrinho | `/cart` | CartPanel full-page (mobile), redirect para checkout |
| Checkout | `/checkout` | Resumo do pedido, endereço, cupom, PaymentMethodSelector |
| Pagamento Cartão ECP | `/checkout/card` | BankLoginForm → CardSelector → confirmação → PaymentStatus |
| Pagamento PIX | `/checkout/pix` | PixQrCodeDisplay com timer → SSE listener → PaymentStatus |
| Status do Pedido | `/orders/:id` | Timeline de status com steps visuais |
| Histórico | `/orders` | Lista de pedidos com status, data, total, botão repetir |
| Favoritos | `/favorites` | Grid de restaurantes favoritos (mesmo card do catálogo) |
| Perfil | `/profile` | Dados pessoais, endereços, cupons, logout |

### 10.2 Fluxo Restaurante

| Tela | Rota | Componentes Principais |
|------|------|----------------------|
| Gestão de Cardápio | `/restaurant/menu` | Lista de items, modal de add/edit, toggle disponibilidade |
| Pedidos Recebidos | `/restaurant/orders` | Lista real-time, card de pedido com ações de status |
| Configurações | `/restaurant/settings` | Form de dados do restaurante, taxa, ETA, promo |

### 10.3 Fluxo Admin

| Tela | Rota | Componentes Principais |
|------|------|----------------------|
| Dashboard | `/admin` | Métricas agregadas (restaurantes, pedidos, ticket médio) |
| Restaurantes | `/admin/restaurants` | Lista com ações de aprovação/suspensão |
| Categorias | `/admin/categories` | CRUD com emoji e ordenação |
| Cupons | `/admin/promotions` | CRUD de cupons com regras |

---

## 11. Padrões de Formatação

### 11.1 Moeda
- Formato: `pt-BR`, `BRL` → `R$ 49,90`
- Intl.NumberFormat com style currency
- Taxa grátis exibida como texto "Grátis" em vez de R$ 0,00

### 11.2 Tempo
- ETA: `24-34 min` (range min-max)
- Datas: formato brasileiro dd/mm/aaaa HH:mm

### 11.3 Contagem
- Pluralização: `1 restaurante encontrado` / `6 restaurantes encontrados`
- Reviews: formato `pt-BR` com separador de milhar → `2.410 avaliações`

---

## 12. Acessibilidade

- **Contraste:** WCAG AA — texto #f4f6ff sobre #0d1020 = ratio ~16:1
- **Touch targets:** botões mínimo 42×42px, chips mínimo 44px altura
- **Focus visible:** outline com brand color para navegação por teclado
- **Semantic HTML:** header, nav, main, section, article, aside
- **ARIA labels:** em botões de ícone (scroll-top, cart, quantity +/−)
- **Screen reader:** textos descritivos em emojis decorativos via aria-hidden
- **Safe area:** `env(safe-area-inset-*)` para notch e home indicator do iOS
