import { authMiddleware } from '../auth.mjs';
import * as chatService from '../services/chat.service.mjs';

// Per-user rolling rate limit: at most 20 chat messages per minute per user. We use
// an in-memory map instead of relying on @fastify/rate-limit's keyGenerator because
// the limiter runs before preHandler, so request.user is not yet populated there.
const CHAT_RATE_MAX = 20;
const CHAT_RATE_WINDOW_MS = 60 * 1000;
const chatRateState = new Map(); // userId → number[] (timestamps of recent requests)

function takeChatRateSlot(userId) {
  const now = Date.now();
  const windowStart = now - CHAT_RATE_WINDOW_MS;
  const recent = (chatRateState.get(userId) || []).filter(t => t > windowStart);
  if (recent.length >= CHAT_RATE_MAX) {
    return { ok: false, retryAfterMs: recent[0] + CHAT_RATE_WINDOW_MS - now };
  }
  recent.push(now);
  chatRateState.set(userId, recent);
  return { ok: true };
}

export async function chatRoutes(app) {
  // POST /api/chat/messages — Send message and get AI response
  app.post('/api/chat/messages', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const slot = takeChatRateSlot(request.user.id);
    if (!slot.ok) {
      return reply.code(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Muitas mensagens — aguarde ${Math.ceil(slot.retryAfterMs / 1000)}s.`,
        },
      });
    }
    const { message, conversationId } = request.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message is required' },
      });
    }

    const result = await chatService.sendMessage(app.db, request.user.id, {
      message: message.trim(),
      conversationId,
    });
    return reply.send(result);
  });

  // GET /api/chat/conversations — List conversations
  app.get('/api/chat/conversations', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const limit = parseInt(request.query.limit) || 10;
    const result = chatService.listConversations(app.db, request.user.id, limit);
    return reply.send(result);
  });

  // GET /api/chat/conversations/:id/messages — Get history
  app.get('/api/chat/conversations/:id/messages', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const limit = parseInt(request.query.limit) || 20;
    const result = chatService.getHistory(app.db, request.user.id, request.params.id, limit);
    return reply.send(result);
  });

  // POST /api/chat/conversations — Create new conversation
  app.post('/api/chat/conversations', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = chatService.createConversation(app.db, request.user.id);
    return reply.status(201).send(result);
  });

  // PATCH /api/chat/conversations/:id/archive — Archive conversation
  app.patch('/api/chat/conversations/:id/archive', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = chatService.archiveConversation(app.db, request.user.id, request.params.id);
    return reply.send(result);
  });
}
