import jwt from 'jsonwebtoken';
import { config } from './config.mjs';

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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
    });
  }

  const token = authHeader.slice(7);

  // Support SSE token via query param
  const sseToken = request.query?.token;
  const tokenToVerify = token || sseToken;

  try {
    const decoded = verifyAccessToken(tokenToVerify);
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
