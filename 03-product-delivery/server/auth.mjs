import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from './config.mjs';

const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches jwtRefreshExpiresIn

/**
 * Derive a deterministic SHA-256 hash of a refresh token. The raw token is never stored.
 */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Persist a refresh token record. Returns the inserted row id.
 */
export function storeRefreshToken(db, userId, refreshToken) {
  const hash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString();
  db.prepare(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, hash, expiresAt);
}

/**
 * Look up a refresh token by hash. Returns the row if it's still valid (not revoked,
 * not expired). Returns null otherwise.
 */
export function findValidRefreshToken(db, refreshToken) {
  const hash = hashRefreshToken(refreshToken);
  const row = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL'
  ).get(hash);
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

/**
 * Revoke a refresh token by its hash. Idempotent.
 */
export function revokeRefreshToken(db, refreshToken) {
  const hash = hashRefreshToken(refreshToken);
  const result = db.prepare(
    "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ? AND revoked_at IS NULL"
  ).run(hash);
  return result.changes > 0;
}

/**
 * Revoke every active refresh token for a user. Useful on password change / logout all.
 */
export function revokeAllUserRefreshTokens(db, userId) {
  db.prepare(
    "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL"
  ).run(userId);
}

/**
 * Generate access + refresh token pair.
 */
export function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

/**
 * Verify access token and return decoded payload.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Verify refresh token and return decoded payload.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}

/**
 * Fastify preHandler — authenticates request via Bearer token.
 * Attaches request.user = { id, email, role }.
 */
export async function authMiddleware(request, reply) {
  const authHeader = request.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (request.query?.token) {
    // SSE via query param — EventSource não suporta headers customizados
    token = request.query.token;
  }

  if (!token) {
    return reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing authorization header or token query' },
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    request.user = { id: decoded.id, email: decoded.email, role: decoded.role };
  } catch (err) {
    return reply.code(401).send({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired or invalid' },
    });
  }
}

/**
 * Factory for role-based authorization middleware.
 * @param  {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
  return async function (request, reply) {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
  };
}
