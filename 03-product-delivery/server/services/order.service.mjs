import * as couponService from './coupon.service.mjs';
import { refundOrderPayment } from './payment.service.mjs';

/**
 * Resolve a delivery address string: if none provided, fall back to the user's
 * default address (or first address available). Returns null if the user has no
 * addresses at all — caller must reject the order in that case.
 */
function resolveAddressText(db, userId, providedAddressText) {
  if (providedAddressText && providedAddressText.trim()) {
    return providedAddressText.trim();
  }
  const address = db.prepare(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1'
  ).get(userId);
  if (!address) return null;
  const parts = [
    `${address.street}, ${address.number}`,
    address.complement || null,
    address.neighborhood,
    `${address.city || 'São Paulo'}/${address.state || 'SP'}`,
  ].filter(Boolean);
  return parts.join(' — ');
}

/**
 * Create an order from the user's cart.
 */
export function createOrder(db, userId, { address_text, coupon_code, payment_method }) {
  // 0. Resolve delivery address (caller-provided or user's default)
  const resolvedAddress = resolveAddressText(db, userId, address_text);
  if (!resolvedAddress) {
    return { success: false, error: { code: 'NO_ADDRESS', message: 'User has no delivery address; cadastre um endereço no perfil.' } };
  }

  // 1. Get cart with items
  const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    return { success: false, error: { code: 'CART_EMPTY', message: 'Cart is empty' } };
  }

  const cartItems = db.prepare(`
    SELECT ci.menu_item_id, ci.quantity,
           mi.name as item_name, mi.price as item_price, mi.restaurant_id,
           r.name as restaurant_name, r.delivery_fee
    FROM cart_items ci
    JOIN menu_items mi ON ci.menu_item_id = mi.id
    JOIN restaurants r ON mi.restaurant_id = r.id
    WHERE ci.cart_id = ?
  `).all(cart.id);

  if (cartItems.length === 0) {
    return { success: false, error: { code: 'CART_EMPTY', message: 'Cart is empty' } };
  }

  // 2. Calculate subtotal
  const subtotal = cartItems.reduce((sum, i) => sum + i.item_price * i.quantity, 0);

  // 3. Calculate delivery fee
  const restaurantFees = {};
  for (const item of cartItems) {
    if (!restaurantFees[item.restaurant_id]) {
      restaurantFees[item.restaurant_id] = item.delivery_fee;
    }
  }
  const deliveryFee = subtotal >= 120 ? 0 : Object.values(restaurantFees).reduce((a, b) => a + b, 0);

  // 4. Apply coupon discount
  let discount = 0;
  if (coupon_code) {
    const couponResult = couponService.validateCoupon(db, coupon_code, subtotal);
    if (!couponResult.success) {
      return couponResult;
    }
    discount = couponResult.data.discount_amount;
  }

  // 5. Calculate total
  const total = Math.max(subtotal + deliveryFee - discount, 0);

  // 6. Create order and order_items in a transaction
  const result = db.transaction(() => {
    const orderStmt = db.prepare(`
      INSERT INTO orders (user_id, address_text, subtotal, delivery_fee, discount, total, coupon_code, payment_method, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment')
    `);
    const orderResult = orderStmt.run(
      userId,
      resolvedAddress,
      Math.round(subtotal * 100) / 100,
      Math.round(deliveryFee * 100) / 100,
      Math.round(discount * 100) / 100,
      Math.round(total * 100) / 100,
      coupon_code || null,
      payment_method || 'pix_qrcode'
    );

    const order = db.prepare('SELECT * FROM orders WHERE rowid = ?').get(orderResult.lastInsertRowid);

    // Insert order items (snapshot)
    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, restaurant_id, restaurant_name, menu_item_id, item_name, item_price, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      itemStmt.run(
        order.id,
        item.restaurant_id,
        item.restaurant_name,
        item.menu_item_id,
        item.item_name,
        item.item_price,
        item.quantity
      );
    }

    // Increment coupon uses_count
    if (coupon_code) {
      db.prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE code = ?').run(coupon_code.toUpperCase());
    }

    // Clear cart
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);

    return order;
  })();

  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(result.id);

  return {
    success: true,
    data: {
      ...result,
      items: orderItems,
    },
  };
}

/**
 * List orders for a user.
 */
export function listOrders(db, userId, { page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE user_id = ?').get(userId).cnt;

  const orders = db.prepare(`
    SELECT * FROM orders WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  // Attach items to each order
  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const result = orders.map(order => ({
    ...order,
    items: itemStmt.all(order.id),
  }));

  return {
    success: true,
    data: {
      orders: result,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    },
  };
}

/**
 * Get single order detail.
 */
export function getOrder(db, userId, orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
  if (!order) {
    return { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } };
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const payment = db.prepare('SELECT id, method, status, amount_cents, card_last4, pix_qrcode_data, pix_qrcode_image, pix_expiration, created_at FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(orderId);

  return {
    success: true,
    data: { ...order, items, payment },
  };
}

/**
 * Update order status (restaurant or admin).
 *
 * Side-effect: when transitioning to 'cancelled', a refund is attempted for any completed
 * payment attached to the order. The refund is best-effort (failures are logged into
 * payments.refund_error but never block the status transition).
 *
 * Returns a Promise so callers can await the refund side-effect.
 */
export async function updateOrderStatus(db, user, orderId, { status }) {
  // Determine allowed status transitions
  const validTransitions = {
    confirmed: ['preparing', 'cancelled'],
    preparing: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
  };

  let order;
  if (user.role === 'admin') {
    order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  } else if (user.role === 'restaurant') {
    // Restaurant can only update orders that contain their menu items
    order = db.prepare(`
      SELECT DISTINCT o.* FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN restaurants r ON oi.restaurant_id = r.id
      JOIN users u ON u.restaurant_id = r.id
      WHERE o.id = ? AND u.id = ?
    `).get(orderId, user.id);
  } else {
    // Consumer can only cancel confirmed orders
    order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, user.id);
    if (order && status !== 'cancelled') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Consumers can only cancel orders' } };
    }
  }

  if (!order) {
    return { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } };
  }

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(status)) {
    return {
      success: false,
      error: { code: 'INVALID_TRANSITION', message: `Cannot transition from '${order.status}' to '${status}'` },
    };
  }

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, orderId);

  let refund = null;
  if (status === 'cancelled') {
    refund = await refundOrderPayment(db, orderId);
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  return { success: true, data: { ...updated, items, refund } };
}
