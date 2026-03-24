import { Type } from '@sinclair/typebox';
import * as authService from '../services/auth.service.mjs';

const RegisterBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 6 }),
  name: Type.String({ minLength: 2 }),
  phone: Type.Optional(Type.String()),
});

const LoginBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});

const RefreshBody = Type.Object({
  refreshToken: Type.String(),
});

export async function authRoutes(app) {
  // POST /api/auth/register
  app.post('/api/auth/register', {
    schema: { body: RegisterBody },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = authService.register(app.db, request.body);
    if (!result.success) {
      return reply.code(409).send(result);
    }
    return reply.code(201).send(result);
  });

  // POST /api/auth/login
  app.post('/api/auth/login', {
    schema: { body: LoginBody },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = authService.login(app.db, request.body);
    if (!result.success) {
      return reply.code(401).send(result);
    }
    return reply.send(result);
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', {
    schema: { body: RefreshBody },
  }, async (request, reply) => {
    const result = authService.refresh(app.db, request.body);
    if (!result.success) {
      return reply.code(401).send(result);
    }
    return reply.send(result);
  });
}
