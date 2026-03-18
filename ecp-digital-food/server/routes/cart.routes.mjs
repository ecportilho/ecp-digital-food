import { Type } from '@sinclair/typebox';
import { authMiddleware } from '../auth.mjs';
import * as cartService from '../services/cart.service.mjs';

const AddItemBody = Type.Object({
  menu_item_id: Type.String(),
  quantity: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
});

const UpdateItemBody = Type.Object({
  quantity: Type.Integer({ minimum: 0 }),
});

export async function cartRoutes(app) {
  // GET /api/cart
  app.get('/api/cart', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = cartService.getCart(app.db, request.user.id);
    return reply.send(result);
  });

  // POST /api/cart/items
  app.post('/api/cart/items', {
    preHandler: [authMiddleware],
    schema: { body: AddItemBody },
  }, async (request, reply) => {
    const result = cartService.addItem(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(400).send(result);
    }
    return reply.code(201).send(result);
  });

  // PUT /api/cart/items/:itemId
  app.put('/api/cart/items/:itemId', {
    preHandler: [authMiddleware],
    schema: { body: UpdateItemBody },
  }, async (request, reply) => {
    const result = cartService.updateItem(app.db, request.user.id, request.params.itemId, request.body);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });

  // DELETE /api/cart/items/:itemId
  app.delete('/api/cart/items/:itemId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = cartService.removeItem(app.db, request.user.id, request.params.itemId);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });

  // DELETE /api/cart
  app.delete('/api/cart', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = cartService.clearCart(app.db, request.user.id);
    return reply.send(result);
  });
}
