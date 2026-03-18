/**
 * List all active categories.
 */
export function listCategories(db) {
  const categories = db.prepare(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC'
  ).all().map(c => ({
    ...c,
    is_active: Boolean(c.is_active),
  }));

  return { success: true, data: categories };
}
