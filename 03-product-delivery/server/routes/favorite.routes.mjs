import { Type } from '@sinclair/typebox';
import { authMiddleware } from '../auth.mjs';
import * as favoriteService from '../services/favorite.service.mjs';

const AddFavoriteBody = Type.Object({
  restaurant_id: Type.String(),
});

export async function favoriteRoutes(app) {
  // GET /api/favorites
  app.get('/api/favorites', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = favoriteService.listFavorites(app.db, request.user.id);
    return reply.send(result);
  });

  // POST /api/favorites
  app.post('/api/favorites', {
    preHandler: [authMiddleware],
    schema: { body: AddFavoriteBody },
  }, async (request, reply) => {
    const result = favoriteService.addFavorite(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.code(201).send(result);
  });

  // DELETE /api/favorites/:restaurantId
  app.delete('/api/favorites/:restaurantId', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = favoriteService.removeFavorite(app.db, request.user.id, request.params.restaurantId);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });
}
