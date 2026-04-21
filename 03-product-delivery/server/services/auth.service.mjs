import bcrypt from 'bcryptjs';
import {
  generateTokens,
  verifyRefreshToken,
  storeRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
} from '../auth.mjs';

const BCRYPT_ROUNDS = 12;

/**
 * Register a new consumer.
 */
export function register(db, { email, password, name, phone }) {
  // Check if email exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return { success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } };
  }

  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

  const stmt = db.prepare(`
    INSERT INTO users (email, password_hash, name, phone, role)
    VALUES (?, ?, ?, ?, 'consumer')
  `);
  const result = stmt.run(email.toLowerCase(), passwordHash, name, phone || null);

  const user = db.prepare('SELECT id, email, name, phone, role, created_at FROM users WHERE rowid = ?').get(result.lastInsertRowid);
  const tokens = generateTokens(user);
  storeRefreshToken(db, user.id, tokens.refreshToken);

  return {
    success: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
      ...tokens,
    },
  };
}

/**
 * Login with email + password.
 */
export function login(db, { email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
  }

  const tokens = generateTokens(user);
  storeRefreshToken(db, user.id, tokens.refreshToken);

  return {
    success: true,
    data: {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, restaurant_id: user.restaurant_id },
      ...tokens,
    },
  };
}

/**
 * Refresh access token using a valid refresh token. Rotates: the old refresh token is
 * revoked and a new one is issued, so a stolen refresh token becomes useless once the
 * legitimate user refreshes.
 */
export function refresh(db, { refreshToken }) {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const record = findValidRefreshToken(db, refreshToken);
    if (!record) {
      return { success: false, error: { code: 'REFRESH_TOKEN_REVOKED', message: 'Refresh token revoked or expired' } };
    }
    const user = db.prepare('SELECT id, email, name, phone, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return { success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
    }
    if (user.id !== record.user_id) {
      // Token belongs to a different user than the JWT claims — tampered.
      revokeRefreshToken(db, refreshToken);
      return { success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token mismatch' } };
    }

    // Rotate: revoke old, issue new.
    revokeRefreshToken(db, refreshToken);
    const tokens = generateTokens(user);
    storeRefreshToken(db, user.id, tokens.refreshToken);

    return { success: true, data: { user, ...tokens } };
  } catch {
    return { success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' } };
  }
}

/**
 * Revoke a refresh token (logout).
 */
export function logout(db, { refreshToken }) {
  if (!refreshToken) {
    return { success: true, data: { revoked: false, reason: 'no_token_provided' } };
  }
  const revoked = revokeRefreshToken(db, refreshToken);
  return { success: true, data: { revoked } };
}
