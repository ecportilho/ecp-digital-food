import { Type } from '@sinclair/typebox';
import { authMiddleware, requireRole } from '../auth.mjs';

const PatchRestaurantBody = Type.Object({
  is_active: Type.Optional(Type.Boolean()),
  is_open: Type.Optional(Type.Boolean()),
});

const CreateCategoryBody = Type.Object({
  name: Type.String({ minLength: 1 }),
  emoji: Type.Optional(Type.String()),
  sort_order: Type.Optional(Type.Integer()),
});

const UpdateCategoryBody = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  emoji: Type.Optional(Type.String()),
  sort_order: Type.Optional(Type.Integer()),
  is_active: Type.Optional(Type.Boolean()),
});

const CreateCouponBody = Type.Object({
  code: Type.String({ minLength: 1 }),
  discount_type: Type.Union([Type.Literal('fixed'), Type.Literal('percent')]),
  discount_value: Type.Number({ minimum: 0 }),
  min_order: Type.Optional(Type.Number({ minimum: 0 })),
  max_uses: Type.Optional(Type.Integer({ minimum: 1 })),
  is_active: Type.Optional(Type.Boolean()),
  expires_at: Type.Optional(Type.String()),
});

const UpdateCouponBody = Type.Object({
  code: Type.Optional(Type.String({ minLength: 1 })),
  discount_type: Type.Optional(Type.Union([Type.Literal('fixed'), Type.Literal('percent')])),
  discount_value: Type.Optional(Type.Number({ minimum: 0 })),
  min_order: Type.Optional(Type.Number({ minimum: 0 })),
  max_uses: Type.Optional(Type.Integer({ minimum: 1 })),
  is_active: Type.Optional(Type.Boolean()),
  expires_at: Type.Optional(Type.String()),
});

export async function adminRoutes(app) {
  // All admin routes require authentication and admin role
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', requireRole('admin'));

  // GET /api/admin/dashboard
  app.get('/api/admin/dashboard', async (request, reply) => {
    const totalRestaurants = app.db.prepare('SELECT COUNT(*) as cnt FROM restaurants').get().cnt;
    const totalOrders = app.db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
    const revenueResult = app.db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status NOT IN ('pending_payment', 'payment_failed', 'cancelled')").get();
    const avgTicket = app.db.prepare("SELECT COALESCE(AVG(total), 0) as avg FROM orders WHERE status NOT IN ('pending_payment', 'payment_failed', 'cancelled')").get();
    const activeCoupons = app.db.prepare('SELECT COUNT(*) as cnt FROM coupons WHERE is_active = 1').get().cnt;
    const totalUsers = app.db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'consumer'").get().cnt;
    const ordersToday = app.db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE created_at >= date('now')").get().cnt;

    return reply.send({
      success: true,
      data: {
        total_restaurants: totalRestaurants,
        total_orders: totalOrders,
        total_revenue: Math.round(revenueResult.total * 100) / 100,
        avg_ticket: Math.round(avgTicket.avg * 100) / 100,
        active_coupons: activeCoupons,
        total_users: totalUsers,
        orders_today: ordersToday,
      },
    });
  });

  // GET /api/admin/restaurants
  app.get('/api/admin/restaurants', async (request, reply) => {
    const restaurants = app.db.prepare(`
      SELECT r.*, c.name as category_name
      FROM restaurants r
      JOIN categories c ON r.category_id = c.id
      ORDER BY r.created_at DESC
    `).all().map(r => ({
      ...r,
      tags: JSON.parse(r.tags || '[]'),
      is_active: Boolean(r.is_active),
      is_open: Boolean(r.is_open),
    }));

    return reply.send({ success: true, data: restaurants });
  });

  // PATCH /api/admin/restaurants/:id
  app.patch('/api/admin/restaurants/:id', {
    schema: { body: PatchRestaurantBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const restaurant = app.db.prepare('SELECT id FROM restaurants WHERE id = ?').get(id);
    if (!restaurant) {
      return reply.code(404).send({ success: false, error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found' } });
    }

    const updates = [];
    const params = [];
    if (request.body.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(request.body.is_active ? 1 : 0);
    }
    if (request.body.is_open !== undefined) {
      updates.push('is_open = ?');
      params.push(request.body.is_open ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(id);
      app.db.prepare(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = app.db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
    return reply.send({ success: true, data: { ...updated, tags: JSON.parse(updated.tags || '[]'), is_active: Boolean(updated.is_active), is_open: Boolean(updated.is_open) } });
  });

  // GET /api/admin/categories
  app.get('/api/admin/categories', async (request, reply) => {
    const categories = app.db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all().map(c => ({
      ...c, is_active: Boolean(c.is_active),
    }));
    return reply.send({ success: true, data: categories });
  });

  // POST /api/admin/categories
  app.post('/api/admin/categories', {
    schema: { body: CreateCategoryBody },
  }, async (request, reply) => {
    const { name, emoji, sort_order } = request.body;
    const existing = app.db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
    if (existing) {
      return reply.code(409).send({ success: false, error: { code: 'CATEGORY_EXISTS', message: 'Category already exists' } });
    }

    app.db.prepare('INSERT INTO categories (name, emoji, sort_order) VALUES (?, ?, ?)').run(name, emoji || null, sort_order || 0);
    const category = app.db.prepare('SELECT * FROM categories WHERE name = ?').get(name);
    return reply.code(201).send({ success: true, data: { ...category, is_active: Boolean(category.is_active) } });
  });

  // PUT /api/admin/categories/:id
  app.put('/api/admin/categories/:id', {
    schema: { body: UpdateCategoryBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const category = app.db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!category) {
      return reply.code(404).send({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' } });
    }

    const updates = [];
    const params = [];
    if (request.body.name !== undefined) { updates.push('name = ?'); params.push(request.body.name); }
    if (request.body.emoji !== undefined) { updates.push('emoji = ?'); params.push(request.body.emoji); }
    if (request.body.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(request.body.sort_order); }
    if (request.body.is_active !== undefined) { updates.push('is_active = ?'); params.push(request.body.is_active ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      app.db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = app.db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return reply.send({ success: true, data: { ...updated, is_active: Boolean(updated.is_active) } });
  });

  // DELETE /api/admin/categories/:id
  app.delete('/api/admin/categories/:id', async (request, reply) => {
    const { id } = request.params;
    const category = app.db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!category) {
      return reply.code(404).send({ success: false, error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' } });
    }

    // Check if category has restaurants
    const hasRestaurants = app.db.prepare('SELECT COUNT(*) as cnt FROM restaurants WHERE category_id = ?').get(id).cnt;
    if (hasRestaurants > 0) {
      return reply.code(409).send({ success: false, error: { code: 'CATEGORY_IN_USE', message: 'Category has associated restaurants and cannot be deleted' } });
    }

    app.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return reply.send({ success: true, data: { deleted: true } });
  });

  // GET /api/admin/coupons
  app.get('/api/admin/coupons', async (request, reply) => {
    const coupons = app.db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all().map(c => ({
      ...c, is_active: Boolean(c.is_active),
    }));
    return reply.send({ success: true, data: coupons });
  });

  // POST /api/admin/coupons
  app.post('/api/admin/coupons', {
    schema: { body: CreateCouponBody },
  }, async (request, reply) => {
    const { code, discount_type, discount_value, min_order, max_uses, is_active, expires_at } = request.body;

    const existing = app.db.prepare('SELECT id FROM coupons WHERE code = ?').get(code.toUpperCase());
    if (existing) {
      return reply.code(409).send({ success: false, error: { code: 'COUPON_EXISTS', message: 'Coupon code already exists' } });
    }

    app.db.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order, max_uses, is_active, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(code.toUpperCase(), discount_type, discount_value, min_order || 0, max_uses || null, is_active !== false ? 1 : 0, expires_at || null);

    const coupon = app.db.prepare('SELECT * FROM coupons WHERE code = ?').get(code.toUpperCase());
    return reply.code(201).send({ success: true, data: { ...coupon, is_active: Boolean(coupon.is_active) } });
  });

  // PUT /api/admin/coupons/:id
  app.put('/api/admin/coupons/:id', {
    schema: { body: UpdateCouponBody },
  }, async (request, reply) => {
    const { id } = request.params;
    const coupon = app.db.prepare('SELECT id FROM coupons WHERE id = ?').get(id);
    if (!coupon) {
      return reply.code(404).send({ success: false, error: { code: 'COUPON_NOT_FOUND', message: 'Coupon not found' } });
    }

    const updates = [];
    const params = [];
    if (request.body.code !== undefined) { updates.push('code = ?'); params.push(request.body.code.toUpperCase()); }
    if (request.body.discount_type !== undefined) { updates.push('discount_type = ?'); params.push(request.body.discount_type); }
    if (request.body.discount_value !== undefined) { updates.push('discount_value = ?'); params.push(request.body.discount_value); }
    if (request.body.min_order !== undefined) { updates.push('min_order = ?'); params.push(request.body.min_order); }
    if (request.body.max_uses !== undefined) { updates.push('max_uses = ?'); params.push(request.body.max_uses); }
    if (request.body.is_active !== undefined) { updates.push('is_active = ?'); params.push(request.body.is_active ? 1 : 0); }
    if (request.body.expires_at !== undefined) { updates.push('expires_at = ?'); params.push(request.body.expires_at); }

    if (updates.length > 0) {
      params.push(id);
      app.db.prepare(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = app.db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    return reply.send({ success: true, data: { ...updated, is_active: Boolean(updated.is_active) } });
  });
}
