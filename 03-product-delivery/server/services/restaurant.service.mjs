/**
 * List restaurants with filtering and pagination.
 */
export function listRestaurants(db, { category, q, page = 1, limit = 20 }) {
  let sql = 'SELECT r.*, c.name as category_name, c.emoji as category_emoji FROM restaurants r JOIN categories c ON r.category_id = c.id WHERE r.is_active = 1';
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND c.name = ?';
    params.push(category);
  }

  if (q) {
    sql += ' AND (r.name LIKE ? OR r.cuisine LIKE ? OR r.subtitle LIKE ?)';
    const search = `%${q}%`;
    params.push(search, search, search);
  }

  // Count total
  const countSql = sql.replace('SELECT r.*, c.name as category_name, c.emoji as category_emoji', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countSql).get(...params);

  // Paginate
  const offset = (page - 1) * limit;
  sql += ' ORDER BY r.rating DESC, r.review_count DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const restaurants = db.prepare(sql).all(...params).map(r => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
    is_active: Boolean(r.is_active),
    is_open: Boolean(r.is_open),
  }));

  return {
    success: true,
    data: {
      restaurants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  };
}

/**
 * Get restaurant detail by ID.
 */
export function getRestaurant(db, id) {
  const restaurant = db.prepare(`
    SELECT r.*, c.name as category_name, c.emoji as category_emoji
    FROM restaurants r JOIN categories c ON r.category_id = c.id
    WHERE r.id = ?
  `).get(id);

  if (!restaurant) {
    return { success: false, error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found' } };
  }

  return {
    success: true,
    data: {
      ...restaurant,
      tags: JSON.parse(restaurant.tags || '[]'),
      is_active: Boolean(restaurant.is_active),
      is_open: Boolean(restaurant.is_open),
    },
  };
}

/**
 * Get restaurant menu items.
 */
export function getMenu(db, restaurantId) {
  const restaurant = db.prepare('SELECT id, name FROM restaurants WHERE id = ?').get(restaurantId);
  if (!restaurant) {
    return { success: false, error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found' } };
  }

  const items = db.prepare(
    'SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY sort_order ASC, name ASC'
  ).all(restaurantId).map(item => ({
    ...item,
    is_available: Boolean(item.is_available),
  }));

  // Group by category
  const grouped = {};
  for (const item of items) {
    const cat = item.category || 'Outros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return {
    success: true,
    data: { restaurant_id: restaurantId, restaurant_name: restaurant.name, items, grouped },
  };
}
