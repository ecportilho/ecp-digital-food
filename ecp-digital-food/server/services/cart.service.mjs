/**
 * Get or create the user's cart with items.
 */
export function getCart(db, userId) {
  let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);

  if (!cart) {
    db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
    cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  }

  const items = db.prepare(`
    SELECT ci.id, ci.menu_item_id, ci.quantity,
           mi.name, mi.price, mi.emoji, mi.badge, mi.restaurant_id,
           r.name as restaurant_name, r.delivery_fee
    FROM cart_items ci
    JOIN menu_items mi ON ci.menu_item_id = mi.id
    JOIN restaurants r ON mi.restaurant_id = r.id
    WHERE ci.cart_id = ?
    ORDER BY ci.rowid ASC
  `).all(cart.id);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Calculate delivery fee: sum of unique restaurant fees, free if subtotal >= 120
  const restaurantFees = {};
  for (const item of items) {
    if (!restaurantFees[item.restaurant_id]) {
      restaurantFees[item.restaurant_id] = item.delivery_fee;
    }
  }
  const deliveryFee = subtotal >= 120 ? 0 : Object.values(restaurantFees).reduce((a, b) => a + b, 0);

  return {
    success: true,
    data: {
      id: cart.id,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      delivery_fee: Math.round(deliveryFee * 100) / 100,
      total: Math.round((subtotal + deliveryFee) * 100) / 100,
      item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    },
  };
}

/**
 * Add item to cart. If already exists, increment quantity.
 */
export function addItem(db, userId, { menu_item_id, quantity = 1 }) {
  // Verify menu item exists and is available
  const menuItem = db.prepare(
    'SELECT id, restaurant_id, is_available FROM menu_items WHERE id = ?'
  ).get(menu_item_id);

  if (!menuItem || !menuItem.is_available) {
    return { success: false, error: { code: 'ITEM_NOT_AVAILABLE', message: 'Menu item not found or unavailable' } };
  }

  // Get or create cart
  let cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId);
    cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  }

  // Check if item already in cart
  const existing = db.prepare(
    'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND menu_item_id = ?'
  ).get(cart.id, menu_item_id);

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (cart_id, menu_item_id, quantity) VALUES (?, ?, ?)').run(
      cart.id, menu_item_id, quantity
    );
  }

  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return getCart(db, userId);
}

/**
 * Update cart item quantity.
 */
export function updateItem(db, userId, itemId, { quantity }) {
  const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    return { success: false, error: { code: 'CART_NOT_FOUND', message: 'Cart not found' } };
  }

  const cartItem = db.prepare('SELECT id FROM cart_items WHERE id = ? AND cart_id = ?').get(itemId, cart.id);
  if (!cartItem) {
    return { success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Cart item not found' } };
  }

  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, itemId);
  }

  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return getCart(db, userId);
}

/**
 * Remove item from cart.
 */
export function removeItem(db, userId, itemId) {
  const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    return { success: false, error: { code: 'CART_NOT_FOUND', message: 'Cart not found' } };
  }

  const cartItem = db.prepare('SELECT id FROM cart_items WHERE id = ? AND cart_id = ?').get(itemId, cart.id);
  if (!cartItem) {
    return { success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Cart item not found' } };
  }

  db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return getCart(db, userId);
}

/**
 * Clear entire cart.
 */
export function clearCart(db, userId) {
  const cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!cart) {
    return { success: true, data: { items: [], subtotal: 0, delivery_fee: 0, total: 0, item_count: 0 } };
  }

  db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
  db.prepare("UPDATE carts SET updated_at = datetime('now') WHERE id = ?").run(cart.id);

  return getCart(db, userId);
}
