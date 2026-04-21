/**
 * Credit card CRUD service.
 */

function serializeCard(c) {
  return {
    id: c.id,
    // Always masked. The raw PAN never leaves the backend — we keep it in DB only until
    // the card is tokenized by ECP Pay on its first use.
    cardNumber: `**** **** **** ${c.card_last4}`,
    cardHolder: c.card_holder,
    cardExpiry: c.card_expiry,
    cardLast4: c.card_last4,
    isDefault: !!c.is_default,
    tokenized: !!c.card_token,
    createdAt: c.created_at,
  };
}

/**
 * List all credit cards for a user.
 */
export function listCards(db, userId) {
  const cards = db.prepare(`
    SELECT id, card_holder, card_expiry, card_last4, is_default, card_token, created_at
    FROM credit_cards
    WHERE user_id = ?
    ORDER BY is_default DESC, created_at DESC
  `).all(userId);

  return {
    success: true,
    data: cards.map(serializeCard),
  };
}

/**
 * Get the default card for a user (or the first one).
 */
export function getDefaultCard(db, userId) {
  const card = db.prepare(`
    SELECT id, card_holder, card_expiry, card_last4, is_default, card_token
    FROM credit_cards
    WHERE user_id = ?
    ORDER BY is_default DESC, created_at DESC
    LIMIT 1
  `).get(userId);

  if (!card) return null;
  return serializeCard(card);
}

/**
 * Register a new credit card.
 */
export function registerCard(db, userId, { cardNumber, cardHolder, cardExpiry }) {
  // Validate card number (basic Luhn-compatible length check)
  const cleaned = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cleaned)) {
    return { success: false, error: { code: 'INVALID_CARD', message: 'Numero do cartao invalido' } };
  }

  // Validate expiry (MM/YY)
  if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
    return { success: false, error: { code: 'INVALID_EXPIRY', message: 'Data de validade invalida (MM/AA)' } };
  }

  if (!cardHolder || cardHolder.trim().length < 2) {
    return { success: false, error: { code: 'INVALID_HOLDER', message: 'Nome do titular invalido' } };
  }

  const last4 = cleaned.slice(-4);

  // Check duplicate
  const existing = db.prepare(
    'SELECT id FROM credit_cards WHERE user_id = ? AND card_number = ?'
  ).get(userId, cleaned);

  if (existing) {
    return { success: false, error: { code: 'CARD_EXISTS', message: 'Este cartao ja esta cadastrado' } };
  }

  // If this is the first card, make it default
  const count = db.prepare('SELECT COUNT(*) as cnt FROM credit_cards WHERE user_id = ?').get(userId);
  const isDefault = count.cnt === 0 ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO credit_cards (user_id, card_number, card_holder, card_expiry, card_last4, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, cleaned, cardHolder.trim().toUpperCase(), cardExpiry, last4, isDefault);

  const card = db.prepare('SELECT * FROM credit_cards WHERE rowid = ?').get(result.lastInsertRowid);

  return {
    success: true,
    data: serializeCard(card),
  };
}

/**
 * Delete a credit card.
 */
export function deleteCard(db, userId, cardId) {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get(cardId, userId);
  if (!card) {
    return { success: false, error: { code: 'CARD_NOT_FOUND', message: 'Cartao nao encontrado' } };
  }

  db.prepare('DELETE FROM credit_cards WHERE id = ?').run(cardId);

  // If the deleted card was default, promote the next one
  if (card.is_default) {
    const next = db.prepare(
      'SELECT id FROM credit_cards WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(userId);
    if (next) {
      db.prepare('UPDATE credit_cards SET is_default = 1 WHERE id = ?').run(next.id);
    }
  }

  return { success: true, data: { deleted: true } };
}

/**
 * Set a card as default.
 */
export function setDefaultCard(db, userId, cardId) {
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get(cardId, userId);
  if (!card) {
    return { success: false, error: { code: 'CARD_NOT_FOUND', message: 'Cartao nao encontrado' } };
  }

  db.prepare('UPDATE credit_cards SET is_default = 0 WHERE user_id = ?').run(userId);
  db.prepare('UPDATE credit_cards SET is_default = 1 WHERE id = ?').run(cardId);

  return { success: true, data: { id: cardId, isDefault: true } };
}

