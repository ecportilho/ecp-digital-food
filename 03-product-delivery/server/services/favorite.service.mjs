/**
 * List favorites for a user.
 */
export function listFavorites(db, userId) {
  const favorites = db.prepare(`
    SELECT f.id, f.created_at, r.*,
           c.name as category_name, c.emoji as category_emoji
    FROM favorites f
    JOIN restaurants r ON f.restaurant_id = r.id
    JOIN categories c ON r.category_id = c.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(userId).map(f => ({
    ...f,
    tags: JSON.parse(f.tags || '[]'),
    is_active: Boolean(f.is_active),
    is_open: Boolean(f.is_open),
  }));

  return { success: true, data: favorites };
}

/**
 * Add restaurant to favorites.
 */
export function addFavorite(db, userId, { restaurant_id }) {
  // Verify restaurant exists
  const restaurant = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(restaurant_id);
  if (!restaurant) {
    return { success: false, error: { code: 'RESTAURANT_NOT_FOUND', message: 'Restaurant not found' } };
  }

  // Check if already favorited
  const existing = db.prepare(
    'SELECT id FROM favorites WHERE user_id = ? AND restaurant_id = ?'
  ).get(userId, restaurant_id);

  if (existing) {
    return { success: true, data: { id: existing.id, restaurant_id, already_existed: true } };
  }

  const result = db.prepare(
    'INSERT INTO favorites (user_id, restaurant_id) VALUES (?, ?)'
  ).run(userId, restaurant_id);

  const favorite = db.prepare('SELECT * FROM favorites WHERE rowid = ?').get(result.lastInsertRowid);

  return { success: true, data: favorite };
}

/**
 * Remove restaurant from favorites.
 */
export function removeFavorite(db, userId, restaurantId) {
  const favorite = db.prepare(
    'SELECT id FROM favorites WHERE user_id = ? AND restaurant_id = ?'
  ).get(userId, restaurantId);

  if (!favorite) {
    return { success: false, error: { code: 'FAVORITE_NOT_FOUND', message: 'Favorite not found' } };
  }

  db.prepare('DELETE FROM favorites WHERE id = ?').run(favorite.id);

  return { success: true, data: { deleted: true } };
}
