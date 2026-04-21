import { Type } from '@sinclair/typebox';
import { authMiddleware, requireRole } from '../auth.mjs';
import * as orderService from '../services/order.service.mjs';

const CreateOrderBody = Type.Object({
  address_text: Type.Optional(Type.String({ minLength: 1 })),
  coupon_code: Type.Optional(Type.String()),
  payment_method: Type.Optional(Type.Union([
    Type.Literal('card_ecp'),
    Type.Literal('pix_qrcode'),
    Type.Literal('credit_card'),
  ])),
});

const UpdateStatusBody = Type.Object({
  status: Type.Union([
    Type.Literal('confirmed'),
    Type.Literal('preparing'),
    Type.Literal('out_for_delivery'),
    Type.Literal('delivered'),
    Type.Literal('cancelled'),
  ]),
});

export async function orderRoutes(app) {
  // POST /api/orders
  app.post('/api/orders', {
    preHandler: [authMiddleware],
    schema: { body: CreateOrderBody },
  }, async (request, reply) => {
    const result = orderService.createOrder(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(400).send(result);
    }
    return reply.code(201).send(result);
  });

  // GET /api/orders
  app.get('/api/orders', {
    preHandler: [authMiddleware],
    schema: {
      querystring: Type.Object({
        page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
        limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
      }),
    },
  }, async (request, reply) => {
    const result = orderService.listOrders(app.db, request.user.id, request.query);
    return reply.send(result);
  });

  // GET /api/orders/:id
  app.get('/api/orders/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const result = orderService.getOrder(app.db, request.user.id, request.params.id);
    if (!result.success) {
      return reply.code(404).send(result);
    }
    return reply.send(result);
  });

  // PATCH /api/orders/:id/status
  app.patch('/api/orders/:id/status', {
    preHandler: [authMiddleware],
    schema: { body: UpdateStatusBody },
  }, async (request, reply) => {
    const result = await orderService.updateOrderStatus(app.db, request.user, request.params.id, request.body);
    if (!result.success) {
      const code = result.error.code === 'ORDER_NOT_FOUND' ? 404 : result.error.code === 'FORBIDDEN' ? 403 : 400;
      return reply.code(code).send(result);
    }
    return reply.send(result);
  });
}
