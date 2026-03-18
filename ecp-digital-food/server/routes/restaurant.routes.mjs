import { Type } from '@sinclair/typebox';
import * as restaurantService from '../services/restaurant.service.mjs';

export async function restaurantRoutes(app) {
  // GET /api/restaurants
  app.get('/api/restaurants', {
    schema: {
      querystring: Type.Object({
        category: Type.Optional(Type.String()),
        q: Type.Optional(Type.String()),
        page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
        limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
      }),
    },
  }, async (request, reply) => {
    const result = restaurantService.listRestaurants(app.db, request.query);
    return reply.send(result);
  });

  // GET /api/restaurants/:id
  app.get('/api/restaurants/:id', async (request, reply) => {
    const result = restaurantService.getRestaurant(app.db, request.params.id);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });

  // GET /api/restaurants/:id/menu
  app.get('/api/restaurants/:id/menu', async (request, reply) => {
    const result = restaurantService.getMenu(app.db, request.params.id);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });
}
