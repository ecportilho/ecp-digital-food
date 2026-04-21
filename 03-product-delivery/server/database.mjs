import Database from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { config } from './config.mjs';

let db = null;

export function getDb() {
  if (db) return db;
  return initDb();
}

export function initDb() {
  // Ensure data directory exists
  const dataDir = path.dirname(config.dbPath);
  mkdirSync(dataDir, { recursive: true });

  db = new Database(config.dbPath);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Run migrations
  migrate(db);

  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'consumer' CHECK(role IN ('consumer', 'restaurant', 'admin')),
      restaurant_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT 'Casa',
      street TEXT NOT NULL,
      number TEXT NOT NULL,
      complement TEXT,
      neighborhood TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'São Paulo',
      state TEXT NOT NULL DEFAULT 'SP',
      zip_code TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT UNIQUE NOT NULL,
      emoji TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      cuisine TEXT NOT NULL,
      subtitle TEXT,
      category_id TEXT NOT NULL REFERENCES categories(id),
      rating REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      eta_min INTEGER NOT NULL DEFAULT 20,
      eta_max INTEGER NOT NULL DEFAULT 40,
      delivery_fee REAL NOT NULL DEFAULT 0,
      min_order REAL NOT NULL DEFAULT 0,
      cover_gradient TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #7b61ff, #ff5fa2)',
      hero_emoji TEXT NOT NULL DEFAULT '🍽️',
      promo_text TEXT,
      note TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      pj_cnpj TEXT,
      pj_pix_key TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_open INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🍽️',
      badge TEXT,
      category TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      UNIQUE(cart_id, menu_item_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      address_text TEXT NOT NULL,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      coupon_code TEXT,
      payment_method TEXT NOT NULL DEFAULT 'pix_qrcode' CHECK(payment_method IN ('card_ecp', 'pix_qrcode', 'credit_card')),
      status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment', 'payment_failed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
      restaurant_name TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, restaurant_id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK(discount_type IN ('fixed', 'percent')),
      discount_value REAL NOT NULL,
      min_order REAL NOT NULL DEFAULT 0,
      max_uses INTEGER,
      uses_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY DEFAULT ('p_' || lower(hex(randomblob(8)))),
      order_id TEXT NOT NULL REFERENCES orders(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      method TEXT NOT NULL CHECK(method IN ('card_ecp', 'pix_qrcode', 'credit_card')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
      amount_cents INTEGER NOT NULL,
      bank_transaction_id TEXT,
      bank_jwt_token TEXT,
      pix_qrcode_data TEXT,
      pix_qrcode_image TEXT,
      pix_expiration TEXT,
      card_last4 TEXT,
      webhook_received_at TEXT,
      webhook_payload TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_cards (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_number TEXT NOT NULL,
      card_holder TEXT NOT NULL,
      card_expiry TEXT NOT NULL,
      card_last4 TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payments_status_expiration ON payments(status, pix_expiration);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);

    -- Chat tables
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_conv_updated ON chat_conversations(updated_at);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      agent TEXT,
      intent TEXT,
      tool_calls TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON chat_messages(created_at);

    -- Refresh token revocation (Wave 2)
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY DEFAULT ('rt_' || lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      last_used_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  `);

  // Additive column migrations (idempotent). SQLite lacks `ADD COLUMN IF NOT EXISTS`,
  // so we inspect the column list and skip when already present.
  const paymentCols = new Set(db.prepare("PRAGMA table_info(payments)").all().map(c => c.name));
  if (!paymentCols.has('refunded_at')) {
    db.exec('ALTER TABLE payments ADD COLUMN refunded_at TEXT');
  }
  if (!paymentCols.has('refund_transaction_id')) {
    db.exec('ALTER TABLE payments ADD COLUMN refund_transaction_id TEXT');
  }
  if (!paymentCols.has('refund_error')) {
    db.exec('ALTER TABLE payments ADD COLUMN refund_error TEXT');
  }

  const ccCols = new Set(db.prepare("PRAGMA table_info(credit_cards)").all().map(c => c.name));
  if (!ccCols.has('card_token')) {
    // Opaque token returned by ECP Pay's vault when saveCard=true. When set, the local
    // card_number is redundant and is cleared by payWithCreditCard after a successful
    // tokenization-on-first-use cycle.
    db.exec('ALTER TABLE credit_cards ADD COLUMN card_token TEXT');
  }
  if (!ccCols.has('tokenized_at')) {
    db.exec('ALTER TABLE credit_cards ADD COLUMN tokenized_at TEXT');
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// If run directly, just run migrations
if (process.argv[1] && process.argv[1].includes('database.mjs')) {
  console.log('Running migrations...');
  initDb();
  console.log('Migrations complete. Database at:', config.dbPath);
  closeDb();
}
