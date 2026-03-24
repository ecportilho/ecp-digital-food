/**
 * Get user profile.
 */
export function getProfile(db, userId) {
  const user = db.prepare(
    'SELECT id, email, name, phone, role, restaurant_id, created_at, updated_at FROM users WHERE id = ?'
  ).get(userId);

  if (!user) {
    return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
  }

  return { success: true, data: user };
}

/**
 * Update user profile.
 */
export function updateProfile(db, userId, { name, phone }) {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
  }

  db.prepare(`
    UPDATE users SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?
  `).run(name, phone || null, userId);

  return getProfile(db, userId);
}

/**
 * List addresses for a user.
 */
export function listAddresses(db, userId) {
  const addresses = db.prepare(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC'
  ).all(userId);

  return { success: true, data: addresses };
}

/**
 * Add a new address.
 */
export function addAddress(db, userId, { label, street, number, complement, neighborhood, city, state, zip_code, is_default }) {
  // If setting as default, unset other defaults
  if (is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
  }

  // If this is the first address, make it default
  const count = db.prepare('SELECT COUNT(*) as cnt FROM addresses WHERE user_id = ?').get(userId);
  const makeDefault = is_default || count.cnt === 0 ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO addresses (user_id, label, street, number, complement, neighborhood, city, state, zip_code, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId,
    label || 'Casa',
    street,
    number,
    complement || null,
    neighborhood,
    city || 'São Paulo',
    state || 'SP',
    zip_code,
    makeDefault
  );

  const address = db.prepare('SELECT * FROM addresses WHERE rowid = ?').get(result.lastInsertRowid);
  return { success: true, data: address };
}

/**
 * Delete an address.
 */
export function deleteAddress(db, userId, addressId) {
  const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(addressId, userId);
  if (!address) {
    return { success: false, error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' } };
  }

  db.prepare('DELETE FROM addresses WHERE id = ?').run(addressId);

  // If deleted address was default, make the most recent one default
  if (address.is_default) {
    const next = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
    if (next) {
      db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(next.id);
    }
  }

  return { success: true, data: { deleted: true } };
}
