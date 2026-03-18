import * as categoryService from '../services/category.service.mjs';

export async function categoryRoutes(app) {
  // GET /api/categories
  app.get('/api/categories', async (request, reply) => {
    const result = categoryService.listCategories(app.db);
    return reply.send(result);
  });
}
