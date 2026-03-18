import { Type } from '@sinclair/typebox';
import { authMiddleware } from '../auth.mjs';
import * as userService from '../services/user.service.mjs';

const UpdateProfileBody = Type.Object({
  name: Type.String({ minLength: 2 }),
  phone: Type.Optional(Type.String()),
});

const AddAddressBody = Type.Object({
  label: Type.Optional(Type.String()),
  street: Type.String({ minLength: 1 }),
  number: Type.String({ minLength: 1 }),
  complement: Type.Optional(Type.String()),
  neighborhood: Type.String({ minLength: 1 }),
  city: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  zip_code: Type.String({ minLength: 8, maxLength: 10 }),
  is_default: Type.Optional(Type.Boolean()),
});

export async function consumerRoutes(app) {
  // GET /api/consumer/profile
  app.get('/api/consumer/profile', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = userService.getProfile(app.db, request.user.id);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });

  // PUT /api/consumer/profile
  app.put('/api/consumer/profile', {
    preHandler: [authMiddleware],
    schema: { body: UpdateProfileBody },
  }, async (request, reply) => {
    const result = userService.updateProfile(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });

  // GET /api/consumer/addresses
  app.get('/api/consumer/addresses', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = userService.listAddresses(app.db, request.user.id);
    return reply.send(result);
  });

  // POST /api/consumer/addresses
  app.post('/api/consumer/addresses', {
    preHandler: [authMiddleware],
    schema: { body: AddAddressBody },
  }, async (request, reply) => {
    const result = userService.addAddress(app.db, request.user.id, request.body);
    return reply.code(201).send(result);
  });

  // DELETE /api/consumer/addresses/:id
  app.delete('/api/consumer/addresses/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = userService.deleteAddress(app.db, request.user.id, request.params.id);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });
}
