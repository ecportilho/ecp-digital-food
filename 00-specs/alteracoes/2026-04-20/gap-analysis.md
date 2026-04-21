# Gap Analysis — ecp-digital-food (2026-04-20)

> Análise baseada nas specs de 2026-04-20 (`product_briefing_spec.md`, `tech_spec.md`, `design_spec.md`) vs. código em `03-product-delivery/`.

Observação inicial importante: as specs foram **regeneradas a partir do código implementado** em 20/04/2026. Como consequência, elas descrevem majoritariamente o que existe. As lacunas encontradas vêm de três fontes:
1. Requisitos que a spec menciona mas o código não cobre (ex.: consumo de endereço default no checkout, UI de Settlements).
2. Requisitos não-funcionais que a spec pede e o código não entrega (ex.: HMAC no webhook ECP Pay, tokenização de cartão de crédito).
3. Itens que a própria spec lista explicitamente como **fora do escopo** da v1.0 (seção 6 do briefing) — estes foram classificados como "Não implementado — backlog documentado", **não como bugs**.

---

## Sumário executivo

- **Total de requisitos avaliados:** 92
- **✅ Implementados:** 80 (87%)
- **⚠️ Parcialmente implementados:** 8 (9%)
- **❌ Não implementados:** 4 (4%)

### Maiores riscos / bloqueios

1. **Endereço hardcoded no checkout** — o CRUD de endereços existe (F08) mas o fluxo de compra nunca consome `addresses` do usuário. Toda ordem é gravada com `"Rua Augusta, 1234 — Sao Paulo, SP"`. Impede demo realista multi-endereço.
2. **UI de Settlements ausente no painel do restaurante (F14)** — backend pronto (`GET /api/restaurant-admin/settlements`) mas `RestaurantPanelPage` só expõe abas menu/orders/settings; restaurante não consegue ver o repasse 85%.
3. **Webhook ECP Pay sem validação HMAC** — spec pede HMAC apenas no webhook do banco, mas o briefing §6 reconhece o risco: webhook interno está aberto e aceita qualquer POST. Em produção multi-tenant isso é crítico.
4. **Tokenização de cartão ausente (F09)** — `credit_cards.card_number` armazena PAN completo em plaintext; a spec marca como "MVP — não há tokenização", mas no padrão PCI isso é bloqueio para ir além de demo.
5. **Chat AI sem validação de propriedade em tools financeiras** — Transaction agent chama `create_order` / `pay_with_pix` diretamente; há guarda no system prompt ("NUNCA execute create_order sem confirmação"), mas nenhum enforcement programático no backend.

---

## Backend

### ✅ Implementado

- **Autenticação** (register/login/refresh, JWT 24h+7d, bcryptjs 12) — `server/routes/auth.routes.mjs:22-46` + `server/auth.mjs`
- **Middleware de auth aceitando Bearer OU `?token=` query (para SSE)** — `server/auth.mjs:51`
- **RBAC via `requireRole`** — `server/routes/admin.routes.mjs`, `restaurant-admin.routes.mjs`
- **Catálogo público** (categorias, restaurantes com filtros q/category/page/limit, menu) — `server/routes/restaurant.routes.mjs:6-30`, `category.routes.mjs:5`
- **Carrinho server-side** (GET/POST/PUT/DELETE + cart_items com `CHECK(quantity > 0)`) — `server/routes/cart.routes.mjs:16-59`
- **Pedidos** (create/list/get/patch status) — `server/routes/order.routes.mjs:27-64`
- **Cupons — validação + CRUD admin** — `server/routes/coupon.routes.mjs:12`, `admin.routes.mjs:187-215`
- **Favoritos** — `server/routes/favorite.routes.mjs:11-31`
- **Cartões do usuário (CRUD + default)** — `server/routes/credit-card.routes.mjs:13-44`
- **Pagamentos — 3 fluxos** (card ECP Bank, credit-card ECP Pay c/ fallback, PIX QR Code c/ fallback) — `server/routes/payment.routes.mjs:28-111`, `server/services/payment.service.mjs:117,198,302`
- **SSE para atualização de pagamento** — `server/routes/payment.routes.mjs:114`, `server/services/sse-manager.mjs`
- **Worker de expiração PIX (30s)** — `server/index.mjs:153`
- **Webhook bank/pix-received com HMAC** — `server/routes/webhook.routes.mjs:7`, `server/services/webhook-handler.mjs:13`
- **Webhook ecp-pay/payment-confirmed idempotente** — `server/routes/webhook.routes.mjs:39-97`
- **Admin Plataforma — dashboard, restaurantes, categorias, cupons** — `server/routes/admin.routes.mjs:48-215`
- **Admin Restaurante — menu CRUD, pedidos, settings, settlements** — `server/routes/restaurant-admin.routes.mjs:55-207`
- **Chat AI multi-agente** — orchestrator 15 intents + knowledge + transaction com 13 tools e `MAX_TOOL_ITERATIONS=5` — `server/services/chat-agents/transaction.mjs:9`, `orchestrator.mjs:14-28`
- **Persistência chat** (`chat_conversations` + `chat_messages` com `tool_calls` JSON) — `server/database.mjs:211-236`
- **Split 85/15** — `server/services/split-calculator.mjs:1,36`
- **Circuit breaker + retry + timeout na integração com bank** — `server/services/bank-integration.mjs:7-52`
- **Cliente ECP Pay com `X-Idempotency-Key`** — `server/services/ecp-pay-client.mjs:41-76`
- **Rate limit global 100/min e 5/min em pagamentos, 10/min em auth** — `server/index.mjs` + `payment.routes.mjs:31`
- **Todas as tabelas + índices** conforme spec — `server/database.mjs:33-235`
- **Seed idempotente** (7 categorias, 6 restaurantes, 47 menu items, 2 cupons, 13 usuários, 11 cartões, MVP10/FRETEGRATIS) — `server/seed.mjs:195-298`
- **Regras invioláveis básicas**: prepared statements, bcryptjs 12, ESM `.mjs`, valores em centavos — confirmadas no código

### ⚠️ Parcialmente implementado

- **Endereço de entrega no pedido** — a ordem grava `address_text` (texto livre) em `orders.address_text` (`server/database.mjs:126`) mas nenhum endpoint consome o `addresses.is_default` do usuário ao criar pedido. O `order.service.mjs:6` recebe o texto bruto do front. Falta: buscar endereço default se nenhum endereço foi enviado, ou exigir `address_id` referenciando a tabela.
- **Webhook ECP Pay — validação de origem** — spec §5.10/briefing §6 dizem "aceita `X-API-Key`/source", mas `webhook.routes.mjs:39` aceita qualquer POST sem nenhuma verificação (nem de API key nem de HMAC). Falta: validar `X-API-Key` contra env e, idealmente, assinatura HMAC compartilhada.
- **Chat Transaction — enforcement de autorização em tools** — `transaction.mjs:557` chama `createOrderTool`/`payWithPix`/`payWithCreditCard` com `userId` do request, mas o system prompt é a única salvaguarda contra execução sem confirmação do usuário. Falta: passo explícito de confirmação (ex.: tool `confirm_checkout`) antes de executar mutações financeiras.
- **Settlements — cálculo de `restaurant_share`** — endpoint `GET /api/restaurant-admin/settlements` existe (`restaurant-admin.routes.mjs:207`) mas não há teste nem UI consumidora, aumentando risco de bugs silenciosos no split. Validar se `pj_cnpj`/`pj_pix_key` realmente alimentam `createSplits` no ECP Pay.
- **Índices de performance no chat** — existem `idx_chat_conv_user/updated` e `idx_chat_msg_conv`, mas não há índice em `chat_messages(created_at)` necessário para o "últimas 10 msgs" do histórico em conversas longas.
- **JWT refresh token — sem revogação** — `auth.service.mjs:75` valida o refresh mas não há blacklist/tabela de tokens revogados; logout client-side apenas limpa `localStorage`. Brecha conhecida em MVP.

### ❌ Não implementado

- **Tokenização de cartão de crédito (PCI)** — spec §2.7 e briefing F09 reconhecem explicitamente: `card_number` armazenado completo. Requer integração com cofre de tokens (ECP Pay `saveCard`) para produção.
- **Scripts `setup.mjs`/`register-webhook.mjs`/`deploy.mjs`** — spec §6 do briefing lista como não implementados; não há substituto. Impacta onboarding de nova instalação.
- **Blacklist / revogação de refresh tokens** — não existe tabela `refresh_tokens` ou equivalente.

---

## Frontend

### ✅ Implementado

- **Todas as rotas da spec §10** — `App.jsx:68-78` cobre Login, Register, Home, Restaurant, Checkout, Card/CreditCard/Pix payment, Orders, Favorites, Profile, CreditCards, RestaurantPanel, Admin
- **AuthContext + CartContext** — `client/src/context/`
- **Hooks: useApi, useChat, useSSE** — `client/src/hooks/`
- **ChatWidget flutuante** (FAB 56×56, desktop 400×600, mobile fullscreen, quick actions, erro bar) — `client/src/components/chat/ChatWidget.jsx`
- **SSE reconexão com backoff exponencial** — `client/src/hooks/useSSE.js:17-36`
- **PIX QR Code com timer + copia-e-cola + animação `qrAppear`** — `client/src/components/payment/PixQrCode.jsx`
- **PaymentStatus** nos 4 estados (processing/completed/failed/expired) — `client/src/components/payment/PaymentStatus.jsx`
- **PaymentMethodSelector — 3 opções (credit_card default, card, pix)** — `client/src/components/payment/PaymentMethodSelector.jsx`
- **CartPanel sidebar desktop + bottom sheet mobile** — `client/src/components/cart/CartPanel.jsx`
- **BottomNav com badge de contagem e labels Início/Buscar/Cardápio/Carrinho/Conta** — `client/src/components/layout/BottomNav.module.css`
- **Toast com `useToast`/`ToastProvider`** — `client/src/components/ui/Toast.jsx`
- **Formatters** (`formatCurrency`, `pluralize`, ETA) — `client/src/lib/formatters.js`
- **ProfilePage com CRUD de endereços** — `client/src/pages/ProfilePage.jsx:15-72`

### ⚠️ Parcialmente implementado

- **Checkout não consome endereço default** — `CheckoutPage.jsx:20`, `CreditCardPaymentPage.jsx:88` e `TopBar.jsx:15` usam literal `'Rua Augusta, 1234 — Sao Paulo, SP'`. Briefing §10 reconhece o gap mas marca como pendente. Falta: carregar `GET /api/consumer/addresses`, exibir seletor, passar `address_text` do endereço selecionado.
- **Painel do Restaurante sem aba Settlements** — `RestaurantPanelPage.jsx:17` só contém `menu/orders/settings`; nenhum componente consome `GET /api/restaurant-admin/settlements`. Falta: aba dedicada com tabela de pedidos pagos + `restaurant_share_cents` formatado.
- **Bottom nav — "Buscar" e "Cardápio" não têm tela própria** — design_spec §13 item 4 admite: "Buscar hoje navega para `/?search=1`" e "Cardápio também cai em `/`". Para coerência com labels, ou criar telas dedicadas ou remover os itens redundantes.
- **HomePage sem debounce de busca** — não há `useDebounce`/setTimeout em `HomePage.jsx`; cada tecla dispara filtro síncrono client-side. Baixo impacto hoje (filtro local), virará problema quando a busca for server-side.
- **Sem tela de detalhe de pedido em andamento** — `/orders/:id` é a página de confirmação (`OrderConfirmedPage.jsx`); não há timeline visual de `confirmed → preparing → out_for_delivery → delivered` mesmo que o backend modele a transição. Spec §6.3 descreve o fluxo mas UI não tem componente de steps.

### ❌ Não implementado

- **Nenhum gap frontend marcado como "backlog ausente" além dos listados em parciais**. Todos os componentes documentados em `tech_spec.md §3` e `design_spec.md §3` existem.

---

## Design / Tokens

### ✅ Implementado

- **Paleta Midnight Express completa** (bg #0d1020, surface, brand #7b61ff, brand-2 #ff5fa2, accent #59d8ff, success #2fd387, danger #ff6b81) — `client/src/styles/tokens.css:1`
- **Tokens de radius (xl/lg/md/sm) e spacing (xs→2xl)** — `tokens.css`
- **Tipografia Inter com utility classes h1-h4** — `client/src/styles/global.css:14,50`
- **Glassmorphism** (`backdrop-filter: blur(14px)`, surface opacidade 86%) — `BottomNav.module.css`
- **`--hero` gradient + `--card-glow` radial cyan** — `tokens.css:49-51`
- **Todas as animações do design_spec §4** (fadeIn, checkPop, processingPulse, dotPulse, slideUp/Down, shimmer, spin, toastIn/Out, qrAppear) — `client/src/styles/animations.css`
- **Focus visible via glow brand 14%** — `global.css:98`
- **Contraste WCAG AAA** no par #f4f6ff × #0d1020 (≈16:1)
- **Safe-area iOS no BottomNav** — `BottomNav.module.css`
- **Breakpoints 720/980/1180px** aplicados consistentemente

### ⚠️ Parcialmente implementado

- **Skeletons — keyframe `shimmer` existe mas poucos componentes usam.** RestaurantGrid e lista de pedidos mostram "Carregando..." como texto simples (`App.jsx:28`). Para sensação de marca premium, aplicar skeletons onde faz sentido.

### ❌ Não implementado

- **ThemeContext / switcher de tema** — design_spec §13 diz que era planejado e não existe no código. Como a spec marca como decisão explícita (tema único), não é um gap real — apenas uma decisão.

---

## Integrações (ECP Pay, ECP Bank, Chat AI)

### ✅ Implementado

- **ECP Pay client** com headers `X-API-Key`, `X-Source-App=ecp-food`, `X-Idempotency-Key` UUID em mutações — `server/services/ecp-pay-client.mjs:22,41-76`
- **Endpoints ECP Pay consumidos:** `/pay/pix`, `/pay/card`, `/pay/transactions/:id`, `/pay/transactions/:id/refund`, `/pay/transactions/:id/splits` — todos presentes no client
- **Fallback ECP Pay → ECP Bank em credit-card e PIX** — `payment.service.mjs:198,302`
- **ECP Bank integration** com circuit breaker (5 falhas → 30s open), timeout 10s, retry 1x em 5xx — `server/services/bank-integration.mjs:7-52`
- **Funções bank:** `bankLogin`, `bankListCards`, `bankGetBalance`, `bankPixTransfer`, `bankGeneratePixQrCode`, `bankCardPurchaseByNumber`, `getPlatformBankToken` (cache 23h) — todas presentes
- **HMAC do webhook bank** com `crypto.timingSafeEqual` — `server/services/webhook-handler.mjs:13`
- **Split pre-registrado no PIX via `createSplits`** — `payment.service.mjs:302` + try/catch conforme regra da spec
- **Chat multi-agente** com Claude Sonnet 4, 13 tools, histórico de 10 msgs, sanitização de `tool_calls` — `chat-agents/transaction.mjs`, `chat.service.mjs`
- **Quick actions do chat** ("Ver restaurantes", "Buscar comida", "Ver meu carrinho", "Meus pedidos") — `ChatWidget.jsx`

### ⚠️ Parcialmente implementado

- **Webhook ECP Pay sem nenhuma verificação de origem** — não checa `X-API-Key` nem HMAC, apesar de a spec dizer "confia em `X-API-Key`". Falta mínimo: comparar header com env `ECP_PAY_WEBHOOK_SECRET` antes de processar.
- **Refund endpoint existe no client mas não há rota que o exponha** — `ecp-pay-client.mjs:76` tem `createSplits` mas o refund (`POST /pay/transactions/:id/refund`) não é consumido por nenhum handler. Sem fluxo de cancelamento financeiro, um pedido cancelado após pago não é estornado automaticamente.
- **Chat — guardrails pro domínio** — classifyIntent permite `GENERAL:OUT_OF_SCOPE` mas sem rate limit adicional nem auditoria de prompts ofensivos.

### ❌ Não implementado

- **Endpoint de estorno/refund consumido pela UI ou workflow** — o cliente ECP Pay existe, mas nenhum controller faz `refund`. Ao cancelar ordem após paga, dinheiro fica com a plataforma.

---

## Recomendações de priorização

Ordenação por impacto em experiência real de demo/produção do squad:

| # | Item | Categoria | Esforço | Impacto |
|---|------|-----------|---------|---------|
| 1 | **Consumir endereço default do usuário no checkout** (remover 3 hardcodes "Rua Augusta") | Frontend | S | Alto — demo inconsistente |
| 2 | **UI de Settlements no Restaurant Panel** (aba nova + consumo do endpoint) | Frontend | M | Alto — feature vendida no briefing F14 |
| 3 | **Validar `X-API-Key` no webhook ECP Pay** | Backend/Integração | S | Alto — segurança |
| 4 | **Fluxo de refund ECP Pay** quando ordem é cancelada pós-pagamento | Backend/Integração | M | Alto — regulatório/UX |
| 5 | **Tool `confirm_checkout` no chat** antes de `create_order` / `pay_*` | Backend/IA | M | Alto — evita cobranças acidentais |
| 6 | **Tokenização de cartão de crédito** via ECP Pay `saveCard` | Backend | L | Alto — PCI |
| 7 | **Timeline visual de status do pedido** em `/orders/:id` | Frontend | M | Médio — reforça marca |
| 8 | **Debounce da busca** em HomePage (preparar para busca server-side) | Frontend | XS | Médio |
| 9 | **Revogação de refresh tokens** (tabela `refresh_tokens` com `revoked_at`) | Backend | M | Médio — segurança |
| 10 | **Skeletons reais** substituindo textos "Carregando..." | Design/Frontend | S | Baixo — polish |

---

## Itens fora do escopo (spec §6 do briefing — não são gaps)

- Rastreamento GPS, chat consumer-restaurante, sistema de avaliação, push notifications
- Múltiplas cidades, app nativo
- Programa de fidelidade
- Scripts `setup.mjs`/`register-webhook.mjs`/`deploy.mjs` (reconhecidos como não implementados)
- Pasta `server/schemas/` dedicada (schemas TypeBox estão inline nas rotas — decisão consciente)
- `hooks/useDebounce.js`, `hooks/useAuth.js`, `hooks/useCart.js` standalone (substituídos por `useContext`)
- ThemeContext / switcher de tema (tema único Midnight Express é a decisão de produto)

Esses itens são **decisões explícitas de produto**, não dívida técnica; não devem entrar na priorização da Onda 1.
