import { authMiddleware } from '../auth.mjs';
import * as chatService from '../services/chat.service.mjs';

export async function chatRoutes(app) {
  // POST /api/chat/messages — Send message and get AI response
  app.post('/api/chat/messages', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
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
