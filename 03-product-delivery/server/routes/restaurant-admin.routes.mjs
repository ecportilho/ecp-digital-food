import { Type } from '@sinclair/typebox';
import { authMiddleware, requireRole } from '../auth.mjs';
import { calculateOrderSplits } from '../services/split-calculator.mjs';

const CreateMenuItemBody = Type.Object({
  name: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  price: Type.Number({ minimum: 0 }),
  emoji: Type.Optional(Type.String()),
  badge: Type.Optional(Type.String()),
  category: Type.Optional(Type.String()),
  sort_order: Type.Optional(Type.Integer()),
  is_available: Type.Optional(Type.Boolean()),
});

const UpdateMenuItemBody = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  description: Type.Optional(Type.String()),
  price: Type.Optional(Type.Number({ minimum: 0 })),
  emoji: Type.Optional(Type.String()),
  badge: Type.Optional(Type.String()),
  category: Type.Optional(Type.String()),
  sort_order: Type.Optional(Type.Integer()),
  is_available: Type.Optional(Type.Boolean()),
});

const UpdateSettingsBody = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  subtitle: Type.Optional(Type.String()),
  cuisine: Type.Optional(Type.String()),
  cover_gradient: Type.Optional(Type.String()),
  hero_emoji: Type.Optional(Type.String()),
  promo_text: Type.Optional(Type.String()),
  eta_min: Type.Optional(Type.Integer({ minimum: 1 })),
  eta_max: Type.Optional(Type.Integer({ minimum: 1 })),
  delivery_fee: Type.Optional(Type.Number({ minimum: 0 })),
  min_order: Type.Optional(Type.Number({ minimum: 0 })),
  is_open: Type.Optional(Type.Boolean()),
});

/**
 * Helper: get restaurant ID from authenticated restaurant user.
 */
function getRestaurantId(db, userId) {
  const user = db.prepare('SELECT restaurant_id FROM users WHERE id = ? AND role = ?').get(userId, 'restaurant');
  return user?.restaurant_id || null;
}

export async function restaurantAdminRoutes(app) {
  // All routes require authentication and restaurant role
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireRole('restaurant'));

  // GET /api/restaurant-admin/menu
  app.get('/api/restaurant-admin/menu', async (request, reply) => {
    const restaurantId = getRestaurantId(app.db, request.user.id);
    if (!restaurantId) {
      return reply.code(403).send({ success: false, error: { code: 'NO_RESTAURANT', message: 'User is not associated with a restaurant' } });
    }

    const items = app.db.prepare(
      'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY sort_order ASC, name ASC'
    ).all(restaurantId).map(i => ({ ...i, is_available: Boolean(i.is_available) }));

    return reply.send({ success: true, data: items });
  });

  // POST /api/restaurant-admin/menu
  app.post('/api/restaurant-admin/menu', {
    schema: { body: CreateMenuItemBody },
  }, async (request, reply) => {
    const restaurantId = getRestaurantId(app.db, request.user.id);
    if (!restaurantId) {
      return reply.code(403).send({ success: false, error: { code: 'NO_RESTAURANT', message: 'User is not associated with a restaurant' } });
    }

    const { name, description, price, emoji, badge, category, sort_order, is_available } = request.body;

    app.db.prepare(`
      INSERT INTO menu_items (restaurant_id, name, description, price, emoji, badge, category, sort_order, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      restaurantId, name, description || null, price,
      emoji || '🍽️', badge || null, category || null,
      sort_order || 0, is_available !== false ? 1 : 0
    );

    const item = app.db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY rowid DESC LIMIT 1').get(restaurantId);
    return reply.code(201).send({ success: true, data: { ...item, is_available: Boolean(item.is_available) } });
  });

  // PUT /api/restaurant-admin/menu/:id
  app.put('/api/restaurant-admin/menu/:id', {
    schema: { body: UpdateMenuItemBody },
  }, async (request, reply) => {
    const restaurantId = getRestaurantId(app.db, request.user.id);
    if (!restaurantId) {
      return reply.code(403).send({ success: false, error: { code: 'NO_RESTAURANT', message: 'User is not associated with a restaurant' } });
    }

    const { id } = request.params;
    const item = app.db.prepare('SELECT id FROM menu_items WHERE id = ? AND restaurant_id = ?').get(id, restaurantId);
    if (!item) {
      return reply.code(404).send({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Menu item not found' } });
    }

    const updates = [];
    const params = [];
    const body = request.body;
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description); }
    if (body.price !== undefined) { updates.push('price = ?'); params.push(body.price); }
    if (body.emoji !== undefined) { updates.push('emoji = ?'); params.push(body.emoji); }
    if (body.badge !== undefined) { updates.push('badge = ?'); params.push(body.badge); }
    if (body.category !== undefined) { updates.push('category = ?'); params.push(body.category); }
    if (body.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(body.sort_order); }
    if (body.is_available !== undefined) { updates.push('is_available = ?'); params.push(body.is_available ? 1 : 0); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(id);
      app.db.prepare(`UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = app.db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    return reply.send({ success: true, data: { ...updated, is_available: Boolean(updated.is_available) } });
  });

  // DELETE /api/restaurant-admin/menu/:id
  app.delete('/api/restaurant-admin/menu/:id', async (request, reply) => {
    const restaurantId = getRestaurantId(app.db, request.user.id);
    if (!restaurantId) {
      return reply.code(403).send({ success: false, error: { code: 'NO_RESTAURANT', message: 'User is not associated with a restaurant' } });
    }

    const { id } = request.params;
    const item = app.db.prepare('SELECT id FROM menu_items WHERE id = ? AND restaurant_id = ?').get(id, restaurantId);
    if (!item) {
      return reply.code(404).send({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Menu item not found' } });
    }

    app.db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    return reply.send({ success: true, data: { deleted: true } });
  });

  // GET /api/restaurant-admin/orders
  app.get('/api/restaurant-admin/orders', async (request, reply) => {
    const restaurantId = getRestaurantId(app.db, request.user.id);
    if (!restaurantId) {
      return reply.code(403).send({ success: false, error: { code: 'NO_RESTAURANT', message: 'User is not associated with a restaurant' } });
    }

    const orders = app.db.prepare(`
      SELECT DISTINCT o.*
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.restaurant_id = ?
        AND o.status NOT IN ('pending_payment', 'payment_failed')
      ORDER BY o.created_at DESC
    `).all(restaurantId);

    // Attach items for this restaurant only
    const itemStmt = app.db.prepare('SELECT * FROM order_items WHERE order_id = ? AND restaurant_id = ?');
    const result = orders.map(order => ({
      ...order,
      items: itemStmt.all(order.id, restaurantId),
    }));

    return reply.send({ success: true, data: result });
  });

  // PUT /api/restaurant-admin/settings
  app.put('/api/restaurant-admin/settings', {
    schema: { body: UpdateSettingsBody },
  }, async (request, reply) => {
    const restaurantId = getRestaurantId(app.db, request.user.id);
    if (!restaurantId) {
      return reply.code(403).send({ success: false, error: { code: 'NO_RESTAURANT', message: 'User is not associated with a restaurant' } });
    }

    const updates = [];
    const params = [];
    const body = request.body;
    if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
    if (body.subtitle !== undefined) { updates.push('subtitle = ?'); params.push(body.subtitle); }
    if (body.cuisine !== undefined) { updates.push('cuisine = ?'); params.push(body.cuisine); }
    if (body.cover_gradient !== undefined) { updates.push('cover_gradient = ?'); params.push(body.cover_gradient); }
    if (body.hero_emoji !== undefined) { updates.push('hero_emoji = ?'); params.push(body.hero_emoji); }
    if (body.promo_text !== undefined) { updates.push('promo_text = ?'); params.push(body.promo_text); }
    if (body.eta_min !== undefined) { updates.push('eta_min = ?'); params.push(body.eta_min); }
    if (body.eta_max !== undefined) { updates.push('eta_max = ?'); params.push(body.eta_max); }
    if (body.delivery_fee !== undefined) { updates.push('delivery_fee = ?'); params.push(body.delivery_fee); }
    if (body.min_order !== undefined) { updates.push('min_order = ?'); params.push(body.min_order); }
    if (body.is_open !== undefined) { updates.push('is_open = ?'); params.push(body.is_open ? 1 : 0); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(restaurantId);
      app.db.prepare(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = app.db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurantId);
    return reply.send({ success: true, data: { ...updated, tags: JSON.parse(updated.tags || '[]'), is_active: Boolean(updated.is_active), is_open: Boolean(updated.is_open) } });
  });

  // GET /api/restaurant-admin/settlements — show split/settlement info for the restaurant
  app.get('/api/restaurant-admin/settlements', async (request, reply) => {
    const restaurantId = getRestaurantId(app.db, request.user.id);
    if (!restaurantId) {
      return reply.code(403).send({ success: false, error: { code: 'NO_RESTAURANT', message: 'User is not associated with a restaurant' } });
    }

    // Get restaurant PJ info
    const restaurant = app.db.prepare('SELECT id, name, pj_cnpj, pj_pix_key FROM restaurants WHERE id = ?').get(restaurantId);

    // Get all confirmed/completed orders that include items from this restaurant
    const orders = app.db.prepare(`
      SELECT DISTINCT o.*
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
      WHERE oi.restaurant_id = ?
        AND o.status NOT IN ('pending_payment', 'payment_failed', 'cancelled')
      ORDER BY o.created_at DESC
    `).all(restaurantId);

    let totalEarnedCents = 0;
    const settlements = [];

    for (const order of orders) {
      const orderItems = app.db.prepare(
        'SELECT restaurant_id, restaurant_name, item_price, quantity FROM order_items WHERE order_id = ?'
      ).all(order.id);

      const splits = calculateOrderSplits(order, orderItems, app.db);
      const restaurantSplit = splits.find(s => s.account_id === restaurant.pj_cnpj);

      if (restaurantSplit) {
        totalEarnedCents += restaurantSplit.amount;
        settlements.push({
          order_id: order.id,
          order_date: order.created_at,
          order_total: order.total,
          restaurant_share_cents: restaurantSplit.amount,
          restaurant_share: (restaurantSplit.amount / 100).toFixed(2),
        });
      }
    }

    return reply.send({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          pj_cnpj: restaurant.pj_cnpj,
          pj_pix_key: restaurant.pj_pix_key,
        },
        summary: {
          total_orders: settlements.length,
          total_earned_cents: totalEarnedCents,
          total_earned: (totalEarnedCents / 100).toFixed(2),
        },
        settlements,
      },
    });
  });
}
