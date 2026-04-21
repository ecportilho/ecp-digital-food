import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';
import * as orderService from '../order.service.mjs';
import * as paymentService from '../payment.service.mjs';

const client = new Anthropic();

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 2048;
const MAX_TOOL_ITERATIONS = 5;

// In-memory store of pending checkout confirmations. Each token is single-use and expires
// after 5 minutes. Programmatic guard against the LLM firing mutations without having
// first echoed a checkout summary to the user.
const CONFIRMATION_TTL_MS = 5 * 60 * 1000;
const pendingConfirmations = new Map();

function issueConfirmation(userId, intent) {
  const token = 'cft_' + crypto.randomBytes(10).toString('hex');
  pendingConfirmations.set(token, {
    userId,
    intent,
    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
  });
  // Opportunistic GC of stale tokens.
  if (pendingConfirmations.size > 1000) {
    const now = Date.now();
    for (const [t, rec] of pendingConfirmations) {
      if (rec.expiresAt < now) pendingConfirmations.delete(t);
    }
  }
  return token;
}

function consumeConfirmation(userId, token, requiredIntent) {
  if (!token) return { ok: false, error: 'Chame confirm_checkout antes de executar esta ação.' };
  const rec = pendingConfirmations.get(token);
  if (!rec) return { ok: false, error: 'Token de confirmação inválido ou já consumido.' };
  if (rec.userId !== userId) return { ok: false, error: 'Token não pertence a este usuário.' };
  if (rec.expiresAt < Date.now()) {
    pendingConfirmations.delete(token);
    return { ok: false, error: 'Token de confirmação expirado. Peça ao usuário para confirmar novamente.' };
  }
  if (requiredIntent && rec.intent !== requiredIntent) {
    return { ok: false, error: `Token foi emitido para intent "${rec.intent}", não "${requiredIntent}".` };
  }
  pendingConfirmations.delete(token);
  return { ok: true };
}

const SYSTEM_PROMPT = `Você é o assistente de pedidos do FoodFlow. Ajude o usuário a navegar restaurantes, escolher comidas, montar o carrinho e fazer pedidos com pagamento.

Regras:
- SEMPRE chame confirm_checkout antes de create_order e antes de pay_with_pix / pay_with_credit_card
- confirm_checkout retorna um confirmation_token de uso único que expira em 5 minutos
- ANTES de usar o token, mostre o resumo devolvido por confirm_checkout ao usuário e aguarde ele aceitar ("sim", "confirma", "pode ser")
- Se o usuário recusar, NUNCA execute create_order / pay_with_* — peça ajuste e re-confirme
- NUNCA mostre números completos de cartão — apenas últimos 4 dígitos
- Valores sempre em R$ (ex: R$ 49,90)
- Quando listar restaurantes, inclua emoji, rating e tempo de entrega
- Quando listar cardápio, organize por categoria
- Após adicionar ao carrinho, mostre o total atualizado
- Para pagamento com Pix, mostre o código copia e cola
- Para cartão, peça qual cartão usar (list_credit_cards primeiro)
- Seja simpático e use emojis ocasionalmente`;

const TOOLS = [
  {
    name: 'list_restaurants',
    description: 'Listar restaurantes disponíveis. Pode filtrar por culinária.',
    input_schema: {
      type: 'object',
      properties: {
        cuisine: { type: 'string', description: 'Tipo de culinária (ex: Italiana, Japonesa, Brasileira). Opcional.' }
      },
      required: []
    }
  },
  {
    name: 'get_restaurant_menu',
    description: 'Ver o cardápio de um restaurante específico.',
    input_schema: {
      type: 'object',
      properties: {
        restaurant_id: { type: 'string', description: 'ID do restaurante' },
        restaurant_name: { type: 'string', description: 'Nome do restaurante (busca parcial)' }
      },
      required: []
    }
  },
  {
    name: 'search_food',
    description: 'Buscar comidas por nome em todos os restaurantes.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nome da comida (ex: pizza, hambúrguer, sushi)' }
      },
      required: ['query']
    }
  },
  {
    name: 'view_cart',
    description: 'Ver o carrinho atual do usuário com itens, quantidades e total.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'add_to_cart',
    description: 'Adicionar um item ao carrinho. Precisa do ID do item do menu.',
    input_schema: {
      type: 'object',
      properties: {
        menu_item_id: { type: 'string', description: 'ID do item do cardápio' },
        quantity: { type: 'number', description: 'Quantidade (default 1)', default: 1 }
      },
      required: ['menu_item_id']
    }
  },
  {
    name: 'remove_from_cart',
    description: 'Remover um item do carrinho.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string', description: 'ID do item no carrinho' }
      },
      required: ['item_id']
    }
  },
  {
    name: 'confirm_checkout',
    description: 'Computa o resumo do checkout (itens, subtotal, frete, desconto, total, endereço, método de pagamento) e devolve um confirmation_token de uso único válido por 5 minutos. Use este token nas próximas chamadas a create_order / pay_with_pix / pay_with_credit_card. SEMPRE chame esta ferramenta antes de qualquer mutação financeira, mostre o resumo retornado ao usuário e aguarde ele aceitar explicitamente.',
    input_schema: {
      type: 'object',
      properties: {
        intent: { type: 'string', enum: ['create_order', 'pay_with_pix', 'pay_with_credit_card'], description: 'Para qual mutação o token será usado' },
        payment_method: { type: 'string', description: 'Método de pagamento proposto ao usuário', enum: ['pix_qrcode', 'credit_card'] },
        credit_card_id: { type: 'string', description: 'ID do cartão escolhido (quando aplicável)' },
        order_id: { type: 'string', description: 'ID do pedido (quando a intent é pay_with_*)' }
      },
      required: ['intent']
    }
  },
  {
    name: 'create_order',
    description: 'Criar um pedido a partir do carrinho atual. Requer confirmation_token emitido por confirm_checkout com intent=create_order.',
    input_schema: {
      type: 'object',
      properties: {
        payment_method: { type: 'string', description: 'Método: pix_qrcode ou credit_card', enum: ['pix_qrcode', 'credit_card'] },
        address_text: { type: 'string', description: 'Endereço de entrega (se omitido, usa endereço default do usuário)' },
        confirmation_token: { type: 'string', description: 'Token devolvido por confirm_checkout' }
      },
      required: ['payment_method', 'confirmation_token']
    }
  },
  {
    name: 'pay_with_pix',
    description: 'Gerar código Pix copia e cola para pagamento de um pedido. Requer confirmation_token com intent=pay_with_pix.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'ID do pedido' },
        confirmation_token: { type: 'string', description: 'Token devolvido por confirm_checkout' }
      },
      required: ['order_id', 'confirmation_token']
    }
  },
  {
    name: 'pay_with_credit_card',
    description: 'Pagar um pedido com cartão de crédito cadastrado. Requer confirmation_token com intent=pay_with_credit_card.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'ID do pedido' },
        credit_card_id: { type: 'string', description: 'ID do cartão (use list_credit_cards para obter)' },
        confirmation_token: { type: 'string', description: 'Token devolvido por confirm_checkout' }
      },
      required: ['order_id', 'credit_card_id', 'confirmation_token']
    }
  },
  {
    name: 'list_credit_cards',
    description: 'Listar cartões de crédito cadastrados do usuário.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_order_status',
    description: 'Consultar status de um pedido.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'ID do pedido. Se não informado, mostra o último pedido.' }
      },
      required: []
    }
  },
  {
    name: 'list_orders',
    description: 'Listar histórico de pedidos do usuário.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Quantidade (default 5)', default: 5 }
      },
      required: []
    }
  }
];

// ─── Tool implementations ───────────────────────────────────────────────

function formatBRL(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function listRestaurantsTool(db, cuisine) {
  let query = `SELECT id, name, cuisine, rating, review_count, eta_min, eta_max, delivery_fee, hero_emoji, is_open
    FROM restaurants WHERE is_active = 1`;
  const params = [];

  if (cuisine) {
    query += ' AND cuisine LIKE ?';
    params.push(`%${cuisine}%`);
  }

  query += ' ORDER BY rating DESC LIMIT 20';
  const restaurants = db.prepare(query).all(...params);

  if (restaurants.length === 0) {
    return { message: 'Nenhum restaurante encontrado.' };
  }

  return {
    restaurants: restaurants.map(r => ({
      id: r.id,
      name: r.name,
      emoji: r.hero_emoji,
      cuisine: r.cuisine,
      rating: r.rating,
      reviews: r.review_count,
      eta: `${r.eta_min}-${r.eta_max} min`,
      delivery_fee: r.delivery_fee === 0 ? 'Grátis' : formatBRL(r.delivery_fee),
      is_open: r.is_open === 1,
    })),
  };
}

function getRestaurantMenuTool(db, restaurantId, restaurantName) {
  let restaurant;

  if (restaurantId) {
    restaurant = db.prepare('SELECT id, name, cuisine, hero_emoji FROM restaurants WHERE id = ? AND is_active = 1').get(restaurantId);
  } else if (restaurantName) {
    restaurant = db.prepare('SELECT id, name, cuisine, hero_emoji FROM restaurants WHERE name LIKE ? AND is_active = 1').get(`%${restaurantName}%`);
  }

  if (!restaurant) {
    return { error: 'Restaurante não encontrado.' };
  }

  const items = db.prepare(`
    SELECT id, name, description, price, emoji, badge, category
    FROM menu_items
    WHERE restaurant_id = ? AND is_available = 1
    ORDER BY category, sort_order, name
  `).all(restaurant.id);

  return {
    restaurant: { id: restaurant.id, name: restaurant.name, emoji: restaurant.hero_emoji, cuisine: restaurant.cuisine },
    items: items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: formatBRL(i.price),
      price_raw: i.price,
      emoji: i.emoji,
      badge: i.badge,
      category: i.category,
    })),
  };
}

function searchFoodTool(db, query) {
  const items = db.prepare(`
    SELECT mi.id, mi.name, mi.description, mi.price, mi.emoji, mi.category,
           r.name as restaurant_name, r.id as restaurant_id, r.hero_emoji as restaurant_emoji
    FROM menu_items mi
    JOIN restaurants r ON mi.restaurant_id = r.id
    WHERE mi.name LIKE ? AND mi.is_available = 1 AND r.is_active = 1
    ORDER BY r.rating DESC
    LIMIT 20
  `).all(`%${query}%`);

  if (items.length === 0) {
    return { message: `Nenhum resultado para "${query}".` };
  }

  return {
    results: items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: formatBRL(i.price),
      price_raw: i.price,
      emoji: i.emoji,
      category: i.category,
      restaurant: i.restaurant_name,
      restaurant_id: i.restaurant_id,
      restaurant_emoji: i.restaurant_emoji,
    })),
  };
}

function viewCartTool(db, userId) {
  const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    return { message: 'Seu carrinho está vazio.', items: [], total: 'R$ 0,00' };
  }

  const items = db.prepare(`
    SELECT ci.id, ci.quantity, mi.id as menu_item_id, mi.name, mi.price, mi.emoji,
           r.name as restaurant_name, r.delivery_fee
    FROM cart_items ci
    JOIN menu_items mi ON ci.menu_item_id = mi.id
    JOIN restaurants r ON mi.restaurant_id = r.id
    WHERE ci.cart_id = ?
  `).all(cart.id);

  if (items.length === 0) {
    return { message: 'Seu carrinho está vazio.', items: [], total: 'R$ 0,00' };
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFees = {};
  for (const item of items) {
    if (!deliveryFees[item.restaurant_name]) {
      deliveryFees[item.restaurant_name] = item.delivery_fee;
    }
  }
  const totalDelivery = subtotal >= 120 ? 0 : Object.values(deliveryFees).reduce((a, b) => a + b, 0);
  const total = subtotal + totalDelivery;

  return {
    items: items.map(i => ({
      id: i.id,
      menu_item_id: i.menu_item_id,
      name: i.name,
      emoji: i.emoji,
      quantity: i.quantity,
      unit_price: formatBRL(i.price),
      subtotal: formatBRL(i.price * i.quantity),
      restaurant: i.restaurant_name,
    })),
    subtotal: formatBRL(subtotal),
    delivery_fee: totalDelivery === 0 ? 'Grátis' : formatBRL(totalDelivery),
    total: formatBRL(total),
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

function addToCartTool(db, userId, menuItemId, quantity) {
  // Verify menu item exists
  const menuItem = db.prepare(`
    SELECT mi.id, mi.name, mi.price, r.name as restaurant_name
    FROM menu_items mi JOIN restaurants r ON mi.restaurant_id = r.id
    WHERE mi.id = ? AND mi.is_available = 1
  `).get(menuItemId);

  if (!menuItem) {
    return { error: 'Item não encontrado ou indisponível.' };
  }

  // Ensure cart exists
  let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
    cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  }

  // Insert or update cart item
  const existing = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND menu_item_id = ?').get(cart.id, menuItemId);
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (cart_id, menu_item_id, quantity) VALUES (?, ?, ?)').run(cart.id, menuItemId, quantity);
  }

  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  // Return updated cart
  return {
    message: `${quantity}x ${menuItem.name} adicionado ao carrinho!`,
    added: { name: menuItem.name, quantity, price: formatBRL(menuItem.price) },
    cart: viewCartTool(db, userId),
  };
}

function removeFromCartTool(db, userId, itemId) {
  const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    return { error: 'Carrinho não encontrado.' };
  }

  const item = db.prepare(`
    SELECT ci.id, mi.name FROM cart_items ci
    JOIN menu_items mi ON ci.menu_item_id = mi.id
    WHERE ci.id = ? AND ci.cart_id = ?
  `).get(itemId, cart.id);

  if (!item) {
    return { error: 'Item não encontrado no carrinho.' };
  }

  db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return {
    message: `${item.name} removido do carrinho.`,
    cart: viewCartTool(db, userId),
  };
}

function resolveDefaultAddressString(db, userId) {
  const addr = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC LIMIT 1').get(userId);
  if (!addr) return null;
  return `${addr.street}, ${addr.number}${addr.complement ? ' - ' + addr.complement : ''}, ${addr.neighborhood}, ${addr.city}/${addr.state}`;
}

function confirmCheckoutTool(db, userId, { intent, payment_method, credit_card_id, order_id }) {
  if (!['create_order', 'pay_with_pix', 'pay_with_credit_card'].includes(intent)) {
    return { error: 'Intent inválida. Use create_order, pay_with_pix ou pay_with_credit_card.' };
  }

  const address = resolveDefaultAddressString(db, userId);

  // For create_order: summarize the cart.
  // For pay_with_*: summarize the existing pending order.
  if (intent === 'create_order') {
    const cart = viewCartTool(db, userId);
    if (cart.items && cart.items.length === 0) {
      return { error: 'Carrinho vazio. Adicione itens antes de confirmar o checkout.' };
    }
    if (!address) {
      return { error: 'Usuário não tem endereço cadastrado. Peça para cadastrar no Perfil antes.' };
    }
    const token = issueConfirmation(userId, intent);
    return {
      summary: {
        intent,
        items: cart.items,
        subtotal: cart.subtotal,
        delivery_fee: cart.delivery_fee,
        total: cart.total,
        address,
        payment_method: payment_method || 'pix_qrcode',
      },
      confirmation_token: token,
      expires_in_seconds: Math.floor(CONFIRMATION_TTL_MS / 1000),
      next_step: 'Mostre o resumo ao usuário. Se ele confirmar, chame create_order passando confirmation_token.',
    };
  }

  // pay_with_* — requires an existing order
  if (!order_id) {
    return { error: 'Para confirmar pagamento, informe order_id.' };
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, userId);
  if (!order) {
    return { error: 'Pedido não encontrado ou não pertence ao usuário.' };
  }
  if (order.status !== 'pending_payment') {
    return { error: `Pedido está no status "${order.status}" — não pode ser pago.` };
  }
  const token = issueConfirmation(userId, intent);
  return {
    summary: {
      intent,
      order_id: order.id,
      total: formatBRL(order.total),
      status: order.status,
      payment_method: intent === 'pay_with_pix' ? 'pix_qrcode' : 'credit_card',
      credit_card_id: credit_card_id || null,
      address: order.address_text,
    },
    confirmation_token: token,
    expires_in_seconds: Math.floor(CONFIRMATION_TTL_MS / 1000),
    next_step: `Mostre o resumo ao usuário. Se ele confirmar, chame ${intent} passando confirmation_token.`,
  };
}

function createOrderTool(db, userId, paymentMethod, addressText, confirmationToken) {
  const check = consumeConfirmation(userId, confirmationToken, 'create_order');
  if (!check.ok) {
    return { error: check.error };
  }

  // Get default address if not provided
  if (!addressText) {
    addressText = resolveDefaultAddressString(db, userId) || 'Endereço não informado';
  }

  const result = orderService.createOrder(db, userId, {
    address_text: addressText,
    coupon_code: null,
    payment_method: paymentMethod || 'pix_qrcode',
  });

  if (!result.success) {
    return { error: result.error.message };
  }

  const order = result.data;
  return {
    message: 'Pedido criado com sucesso!',
    order: {
      id: order.id,
      total: formatBRL(order.total),
      subtotal: formatBRL(order.subtotal),
      delivery_fee: order.delivery_fee === 0 ? 'Grátis' : formatBRL(order.delivery_fee),
      payment_method: order.payment_method,
      status: order.status,
      items: order.items?.map(i => ({
        name: i.item_name,
        quantity: i.quantity,
        price: formatBRL(i.item_price),
        restaurant: i.restaurant_name,
      })),
    },
  };
}

async function payWithPixTool(db, userId, orderId, confirmationToken) {
  const check = consumeConfirmation(userId, confirmationToken, 'pay_with_pix');
  if (!check.ok) {
    return { error: check.error };
  }
  try {
    const result = await paymentService.payWithPix(db, userId, { order_id: orderId });
    if (!result.success) {
      return { error: result.error.message };
    }
    return {
      message: 'Pix gerado! Copie o código abaixo para pagar:',
      pix_copy_paste: result.data.pix_copy_paste || result.data.qrcode_data,
      amount: formatBRL(result.data.amount),
      expires_at: result.data.expires_at,
      payment_id: result.data.payment_id,
    };
  } catch (err) {
    return { error: `Erro ao gerar Pix: ${err.message}` };
  }
}

async function payWithCardTool(db, userId, orderId, creditCardId, confirmationToken) {
  const check = consumeConfirmation(userId, confirmationToken, 'pay_with_credit_card');
  if (!check.ok) {
    return { error: check.error };
  }
  try {
    const result = await paymentService.payWithCreditCard(db, userId, { order_id: orderId, credit_card_id: creditCardId });
    if (!result.success) {
      return { error: result.error.message };
    }
    return {
      message: 'Pagamento com cartão realizado com sucesso!',
      status: result.data.status,
      amount: formatBRL(result.data.amount),
      card_last4: result.data.card_last4,
    };
  } catch (err) {
    return { error: `Erro ao processar pagamento: ${err.message}` };
  }
}

function listCreditCardsTool(db, userId) {
  const cards = db.prepare(`
    SELECT id, card_last4, card_holder, card_expiry, is_default
    FROM credit_cards WHERE user_id = ?
    ORDER BY is_default DESC, created_at DESC
  `).all(userId);

  if (cards.length === 0) {
    return { message: 'Nenhum cartão cadastrado.' };
  }

  return {
    cards: cards.map(c => ({
      id: c.id,
      last4: c.card_last4,
      holder: c.card_holder,
      expiry: c.card_expiry,
      is_default: c.is_default === 1,
    })),
  };
}

function getOrderStatusTool(db, userId, orderId) {
  let order;
  if (orderId) {
    order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
  } else {
    order = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
  }

  if (!order) {
    return { message: 'Nenhum pedido encontrado.' };
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const payment = db.prepare(
    'SELECT id, method, status, amount_cents, card_last4, pix_qrcode_data, created_at FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(order.id);

  const statusLabels = {
    pending_payment: 'Aguardando pagamento',
    payment_failed: 'Falha no pagamento',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    out_for_delivery: 'Saiu para entrega',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };

  return {
    order: {
      id: order.id,
      status: order.status,
      status_label: statusLabels[order.status] || order.status,
      total: formatBRL(order.total),
      created_at: order.created_at,
      items: items.map(i => ({
        name: i.item_name,
        quantity: i.quantity,
        price: formatBRL(i.item_price),
        restaurant: i.restaurant_name,
      })),
      payment: payment ? {
        method: payment.method,
        status: payment.status,
        card_last4: payment.card_last4,
      } : null,
    },
  };
}

function listOrdersTool(db, userId, limit) {
  const orders = db.prepare(`
    SELECT * FROM orders WHERE user_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(userId, limit);

  if (orders.length === 0) {
    return { message: 'Nenhum pedido encontrado.' };
  }

  const itemStmt = db.prepare('SELECT item_name, quantity, item_price, restaurant_name FROM order_items WHERE order_id = ?');

  return {
    orders: orders.map(o => ({
      id: o.id,
      status: o.status,
      total: formatBRL(o.total),
      payment_method: o.payment_method,
      created_at: o.created_at,
      items: itemStmt.all(o.id).map(i => ({
        name: i.item_name,
        quantity: i.quantity,
        price: formatBRL(i.item_price),
        restaurant: i.restaurant_name,
      })),
    })),
  };
}

// ─── Tool dispatcher ────────────────────────────────────────────────────

function executeTool(db, toolName, toolInput, userId) {
  switch (toolName) {
    case 'list_restaurants':
      return listRestaurantsTool(db, toolInput.cuisine);
    case 'get_restaurant_menu':
      return getRestaurantMenuTool(db, toolInput.restaurant_id, toolInput.restaurant_name);
    case 'search_food':
      return searchFoodTool(db, toolInput.query);
    case 'view_cart':
      return viewCartTool(db, userId);
    case 'add_to_cart':
      return addToCartTool(db, userId, toolInput.menu_item_id, toolInput.quantity || 1);
    case 'remove_from_cart':
      return removeFromCartTool(db, userId, toolInput.item_id);
    case 'confirm_checkout':
      return confirmCheckoutTool(db, userId, toolInput);
    case 'create_order':
      return createOrderTool(db, userId, toolInput.payment_method, toolInput.address_text, toolInput.confirmation_token);
    case 'pay_with_pix':
      return payWithPixTool(db, userId, toolInput.order_id, toolInput.confirmation_token);
    case 'pay_with_credit_card':
      return payWithCardTool(db, userId, toolInput.order_id, toolInput.credit_card_id, toolInput.confirmation_token);
    case 'list_credit_cards':
      return listCreditCardsTool(db, userId);
    case 'get_order_status':
      return getOrderStatusTool(db, userId, toolInput.order_id);
    case 'list_orders':
      return listOrdersTool(db, userId, toolInput.limit || 5);
    default:
      return { error: `Tool "${toolName}" não reconhecida.` };
  }
}

// Exposed for unit testing the checkout-confirmation guard without invoking Anthropic.
export const __internals__ = {
  issueConfirmation,
  consumeConfirmation,
  confirmCheckoutTool,
  createOrderTool,
  payWithPixTool,
  payWithCardTool,
  pendingConfirmations,
};

// ─── Agentic loop ───────────────────────────────────────────────────────

/**
 * Transaction agent — handles orders, cart, and payment with tool_use loop.
 */
export async function handleTransaction(db, userId, message, intent, history = []) {
  const messages = [];

  for (const msg of history.slice(-8)) {
    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
  }

  messages.push({ role: 'user', content: message });

  let allToolCalls = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Check if we got a final text response (no tool use)
    if (response.stop_reason === 'end_turn' || !response.content.some(b => b.type === 'tool_use')) {
      const textBlock = response.content.find(b => b.type === 'text');
      return {
        content: textBlock?.text || 'Desculpe, não consegui processar. Pode tentar novamente?',
        agent: 'transaction',
        intent,
        toolCalls: allToolCalls.length > 0 ? allToolCalls : null,
      };
    }

    // Process tool calls
    const assistantContent = response.content;
    messages.push({ role: 'assistant', content: assistantContent });

    const toolResults = [];
    for (const block of assistantContent) {
      if (block.type === 'tool_use') {
        let result;
        try {
          result = await executeTool(db, block.name, block.input, userId);
        } catch (err) {
          result = { error: `Erro ao executar ${block.name}: ${err.message}` };
        }

        allToolCalls.push({
          tool: block.name,
          input: block.input,
          output: result,
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Max iterations reached
  const lastText = 'Desculpe, a operação ficou complexa demais. Pode tentar simplificar o pedido?';
  return {
    content: lastText,
    agent: 'transaction',
    intent,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : null,
  };
}
