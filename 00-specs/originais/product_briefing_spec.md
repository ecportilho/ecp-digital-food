# Product Briefing — FoodFlow

## 1. Visão Geral do Produto

**Nome:** FoodFlow  
**Tagline:** Pedir comida pode ser lindo, rápido e viciante.  
**Tipo:** Marketplace de delivery de comida (web responsiva para desktop, Android e iOS)  
**Identidade Visual:** Midnight Express — direção premium, dark mode, pedidos noturnos, branding memorável  
**Referências de mercado:** iFood, 99food, Keeta, Rappi

FoodFlow é um marketplace de delivery que conecta restaurantes a consumidores finais, priorizando descoberta rápida, conversão e recompra. O produto nasce mobile-first com experiência responsiva completa para web, garantindo qualidade visual e funcional equivalente em qualquer dispositivo.

---

## 2. Problema e Oportunidade

**Problema do consumidor:** Apps de delivery existentes priorizam volume de restaurantes sobre experiência de descoberta. O usuário navega por listas genéricas, sem personalização real, com UI visualmente poluída e pouca diferenciação entre restaurantes.

**Problema do restaurante:** Restaurantes ficam invisíveis no catálogo sem investir em mídia paga dentro da plataforma. Falta transparência sobre desempenho e acesso direto ao consumidor.

**Oportunidade:** Criar um marketplace com UX premium que valorize a curadoria, ofereça descoberta inteligente por categorias e promoções, e gere recorrência via programas de fidelidade — posicionando-se como alternativa aspiracional aos incumbentes.

---

## 3. Público-Alvo

### 3.1 Consumidor Primário
- **Perfil:** Jovens adultos e profissionais (22-40 anos), áreas urbanas (São Paulo inicialmente)
- **Comportamento:** Pedem delivery 3-5x/semana, sensíveis a promoções mas valorizam qualidade
- **Dor principal:** Fadiga de decisão, falta de confiança em restaurantes desconhecidos
- **Motivação:** Praticidade, descoberta de restaurantes bons, economia real com cupons

### 3.2 Restaurante Parceiro
- **Perfil:** Restaurantes artesanais e de médio porte, com cardápio curado (não fast-food genérico)
- **Categorias iniciais:** Hambúrguer, Japonês, Pizza, Saudável, Massas, Brasileira
- **Dor principal:** Baixa visibilidade, custo alto de aquisição, dependência de algoritmos opacos
- **Motivação:** Acesso a base qualificada, controle sobre cardápio e promoções, dados de performance

---

## 4. Proposta de Valor

| Para | Proposta |
|------|----------|
| **Consumidor** | Descoberta visual rápida, promoções reais, carrinho inteligente, checkout sem atrito |
| **Restaurante** | Presença premium, gestão de cardápio, promoções próprias, analytics de pedidos |
| **Plataforma** | Comissão por pedido, upsell de destaque, dados de consumo para curadoria inteligente |

---

## 5. Escopo do MVP (v1.0)

### 5.1 Funcionalidades do Consumidor

#### F01 — Onboarding e Autenticação
- Cadastro com email/senha
- Login com email/senha
- Definição de endereço de entrega (texto livre + CEP)
- Sessão persistente via JWT

#### F02 — Home e Descoberta
- Hero banner com promoção do dia e busca integrada
- Mapa de disponibilidade com métricas ao vivo (restaurantes online, cupons ativos, frete médio)
- Barra de busca por nome de restaurante, prato, categoria ou tag
- Grid de categorias com filtro por chip (Todos, Hambúrguer, Japonês, Pizza, Saudável, Massas, Brasileira)
- Catálogo de restaurantes em cards visuais com: cover gradient, rating, ETA, taxa de entrega, pedido mínimo, tags, promo ativa
- Contador de resultados filtrados

#### F03 — Detalhe do Restaurante e Cardápio
- Banner do restaurante com nome, subtítulo, rating, avaliações, ETA, frete, promo
- Grid de itens do cardápio com: nome, descrição, preço, badge (Best seller, Vegetariano, etc.), emoji visual
- Botão "Adicionar" por item

#### F04 — Carrinho de Compras
- Carrinho persistente (sidebar desktop / bottom sheet mobile)
- Listagem de itens com nome, restaurante de origem, preço unitário, quantidade
- Controle de quantidade (+/−) com remoção automática ao zerar
- Resumo financeiro: subtotal, entrega, desconto (cupom MVP10), total
- Regra de frete grátis para ticket acima de R$ 120
- Badge de contagem de itens
- CTA "Ir para checkout"

#### F05 — Checkout e Pagamento (Integração ECP Digital Bank)
- Resumo do pedido com endereço de entrega
- Aplicação de cupom de desconto
- **Duas formas de pagamento integradas ao ecp-digital-bank (`https://bank.ecportilho.com`):**

**Opção A — Pagamento com Cartão Virtual ECP Digital Bank:**
- Usuário informa email e senha do ecp-digital-bank para autenticar via API (`POST /auth/login`)
- FoodFlow lista os cartões virtuais do usuário via API (`GET /cards`)
- Usuário seleciona o cartão desejado
- FoodFlow consulta saldo disponível via API (`GET /accounts/balance`)
- Ao confirmar, FoodFlow registra a transação como pagamento no ecp-digital-bank via API (`POST /pix/transfer` com chave PIX do restaurante/plataforma, valor em centavos)
- Saldo é debitado automaticamente no ecp-digital-bank
- Transação aparece no extrato do banco digital

**Opção B — Pagamento via PIX (QR Code gerado no ecp-digital-bank):**
- FoodFlow solicita ao ecp-digital-bank a geração de um QR Code de cobrança via API (`POST /pix/qrcode`)
- QR Code é exibido na tela de checkout do FoodFlow
- Usuário abre o app do ecp-digital-bank (ou qualquer banco) e escaneia o QR Code
- Ao ser pago, o ecp-digital-bank dispara um webhook (`POST /api/webhooks/bank/pix-received`) notificando o FoodFlow
- FoodFlow valida o webhook, confirma o pagamento e o pedido é aprovado automaticamente
- Frontend é notificado em tempo real via SSE (Server-Sent Events) que o pagamento foi confirmado

- Confirmação do pedido com número de protocolo
- Tela de status do pedido (Confirmado → Preparando → Saiu para entrega → Entregue)

#### F06 — Histórico e Favoritos
- Lista de pedidos anteriores com data, restaurante, itens, valor total, status
- Botão "Repetir pedido"
- Marcar/desmarcar restaurantes como favoritos
- Tela de favoritos

#### F07 — Perfil do Consumidor
- Visualizar e editar dados pessoais (nome, email, telefone)
- Gerenciar endereços salvos
- Visualizar cupons disponíveis
- Logout

### 5.2 Funcionalidades do Restaurante (Painel Admin)

#### F08 — Gestão de Cardápio
- CRUD de itens do cardápio (nome, descrição, preço, badge, categoria interna, emoji)
- Ativar/desativar itens
- Ordenar itens no cardápio

#### F09 — Gestão de Pedidos
- Lista de pedidos recebidos em tempo real
- Atualizar status do pedido (Confirmado → Preparando → Pronto para retirada)
- Visualizar detalhes do pedido

#### F10 — Dados do Restaurante
- Editar informações visíveis (nome, subtítulo, culinária, cover, ETA estimado)
- Definir taxa de entrega e pedido mínimo
- Gerenciar promoções ativas (texto da promo, regras)

### 5.3 Funcionalidades da Plataforma (Admin Global)

#### F11 — Gestão de Restaurantes
- Aprovar/rejeitar cadastros de restaurantes
- Suspender/reativar restaurantes
- Visualizar métricas gerais (total de restaurantes, pedidos, ticket médio)

#### F12 — Gestão de Categorias e Promoções
- CRUD de categorias do marketplace
- CRUD de promoções globais (cupons, frete grátis, destaque)

---

## 6. Funcionalidades Fora do Escopo do MVP

- Gateway de pagamento externo (pagamento é via ecp-digital-bank)
- Rastreamento GPS do entregador em tempo real
- Chat entre consumidor e restaurante
- Sistema de avaliação pós-entrega
- Programa de fidelidade e pontos
- Push notifications (web e mobile)
- Planos de assinatura para consumidores
- Múltiplas cidades/regiões
- Integração com sistemas ERP de restaurantes
- App nativo (será web responsiva PWA-ready)

---

## 7. Métricas de Sucesso (North Star)

| Métrica | Meta MVP | Descrição |
|---------|----------|-----------|
| **Taxa de conversão** | > 8% | Visitantes que concluem um pedido |
| **Ticket médio** | > R$ 45 | Valor médio por pedido |
| **Taxa de recompra** | > 25% | Usuários que pedem novamente em 30 dias |
| **Tempo até primeiro pedido** | < 5 min | Da abertura do app até o checkout |
| **NPS** | > 40 | Net Promoter Score dos consumidores |

---

## 8. Jornadas Críticas

### Jornada 1 — Primeiro Pedido com Cartão ECP Digital Bank (Happy Path)
1. Usuário acessa FoodFlow → vê hero com promo do dia
2. Navega categorias ou busca por prato
3. Seleciona restaurante → explora cardápio
4. Adiciona itens ao carrinho
5. Revisa carrinho → aplica cupom
6. Vai para checkout → confirma endereço
7. Escolhe "Pagar com Cartão ECP" → autentica no banco digital
8. Seleciona cartão virtual → confirma pagamento
9. Saldo debitado no ecp-digital-bank → pedido confirmado
10. Acompanha status até entrega

### Jornada 1b — Primeiro Pedido com PIX (Happy Path)
1. Passos 1-6 idênticos à Jornada 1
7. Escolhe "Pagar com PIX" → QR Code gerado via ecp-digital-bank
8. Usuário escaneia QR Code no app bancário e paga
9. ecp-digital-bank envia webhook para FoodFlow → pagamento confirmado
10. Tela do FoodFlow atualiza em tempo real (via SSE) → pedido confirmado
11. Acompanha status até entrega

### Jornada 2 — Recompra Rápida
1. Usuário logado acessa FoodFlow
2. Vai para histórico → clica "Repetir pedido"
3. Carrinho preenchido automaticamente
4. Checkout rápido com dados salvos

### Jornada 3 — Restaurante Gerencia Pedido
1. Restaurante recebe notificação de novo pedido
2. Visualiza detalhes → confirma pedido
3. Atualiza status para "Preparando"
4. Marca como "Pronto para retirada"

---

## 9. Requisitos Não-Funcionais

- **Performance:** First Contentful Paint < 1.5s, Time to Interactive < 3s
- **Responsividade:** Breakpoints em 720px (mobile), 980px (tablet), 1180px (desktop), max 1440px
- **Acessibilidade:** Contraste WCAG AA, navegação por teclado, labels semânticos
- **Segurança:** Senhas com hash (bcryptjs), JWT com expiração, rate limiting, sanitização de inputs
- **Disponibilidade:** 99.5% uptime target
- **SEO:** Meta tags, Open Graph, estrutura semântica HTML5

---

## 10. Restrições e Premissas

### Restrições
- Stack tecnológica idêntica ao ecp-digital-banking (Node.js + Fastify + SQLite + React)
- Deploy em VPS Linux (Hostinger ou Oracle Cloud Free Tier)
- Identidade visual Midnight Express (dark mode premium)
- Desenvolvimento via ECP AI Squad no Claude Code
- Sem dependência de serviços pagos externos no MVP

### Premissas
- Dados de restaurantes e cardápios serão seed mockados no MVP
- Pagamento é real via integração com ecp-digital-bank (`https://bank.ecportilho.com`)
- Duas modalidades: cartão virtual ECP (débito direto via API) e PIX (QR Code gerado pelo banco)
- O ecp-digital-bank já está em produção e expõe APIs REST com autenticação JWT
- Entrega será simulada (sem integração com entregadores)
- O endereço de entrega será texto livre, sem geocoding
- Um consumidor pode pedir de múltiplos restaurantes no mesmo carrinho (simplificação MVP)
- O FoodFlow terá uma conta no ecp-digital-bank (conta da plataforma) que recebe os pagamentos e cuja chave PIX é usada para gerar QR Codes de cobrança
