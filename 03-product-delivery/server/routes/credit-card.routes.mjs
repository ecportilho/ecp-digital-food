import { Type } from '@sinclair/typebox';
import { authMiddleware } from '../auth.mjs';
import * as creditCardService from '../services/credit-card.service.mjs';

const RegisterCardBody = Type.Object({
  cardNumber: Type.String({ minLength: 13, maxLength: 19 }),
  cardHolder: Type.String({ minLength: 2 }),
  cardExpiry: Type.String({ pattern: '^\\d{2}/\\d{2}$' }),
});

export async function creditCardRoutes(app) {
  // GET /api/credit-cards — list user's cards
  app.get('/api/credit-cards', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = creditCardService.listCards(app.db, request.user.id);
    return reply.send(result);
  });

  // POST /api/credit-cards — register new card
  app.post('/api/credit-cards', {
    preHandler: [authMiddleware],
    schema: { body: RegisterCardBody },
  }, async (request, reply) => {
    const result = creditCardService.registerCard(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(400).send(result);
    }
    return reply.code(201).send(result);
  });

  // DELETE /api/credit-cards/:id — delete a card
  app.delete('/api/credit-cards/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = creditCardService.deleteCard(app.db, request.user.id, request.params.id);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });

  // PATCH /api/credit-cards/:id/default — set as default
  app.patch('/api/credit-cards/:id/default', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = creditCardService.setDefaultCard(app.db, request.user.id, request.params.id);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });
}
