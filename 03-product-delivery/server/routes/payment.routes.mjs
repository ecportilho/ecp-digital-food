import { Type } from '@sinclair/typebox';
import { authMiddleware } from '../auth.mjs';
import * as paymentService from '../services/payment.service.mjs';
import * as sseManager from '../services/sse-manager.mjs';

const BankAuthBody = Type.Object({
  email: Type.String(),
  password: Type.String(),
});

const PayCardBody = Type.Object({
  order_id: Type.String(),
  bank_token: Type.String(),
  card_last4: Type.Optional(Type.String()),
});

const PayPixBody = Type.Object({
  order_id: Type.String(),
});

export async function paymentRoutes(app) {
  // POST /api/payments/bank-auth — proxy auth to bank
  app.post('/api/payments/bank-auth', {
    preHandler: [authMiddleware],
    schema: { body: BankAuthBody },
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await paymentService.bankAuth(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(result.statusCode || 401).send(result);
    }
    return reply.send(result);
  });

  // GET /api/payments/bank-cards — proxy list cards
  app.get('/api/payments/bank-cards', {
    preHandler: [authMiddleware],
    schema: {
      querystring: Type.Object({
        bank_token: Type.String(),
      }),
    },
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await paymentService.bankCards(app.db, request.query);
    if (!result.success) {
      return reply.code(result.statusCode || 500).send(result);
    }
    return reply.send(result);
  });

  // GET /api/payments/bank-balance — proxy get balance
  app.get('/api/payments/bank-balance', {
    preHandler: [authMiddleware],
    schema: {
      querystring: Type.Object({
        bank_token: Type.String(),
      }),
    },
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await paymentService.bankBalance(app.db, request.query);
    if (!result.success) {
      return reply.code(result.statusCode || 500).send(result);
    }
    return reply.send(result);
  });

  // POST /api/payments/card — pay with ECP card
  app.post('/api/payments/card', {
    preHandler: [authMiddleware],
    schema: { body: PayCardBody },
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await paymentService.payWithCard(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(result.statusCode || 400).send(result);
    }
    return reply.send(result);
  });

  // POST /api/payments/pix — generate PIX QR Code
  app.post('/api/payments/pix', {
    preHandler: [authMiddleware],
    schema: { body: PayPixBody },
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const result = await paymentService.payWithPix(app.db, request.user.id, request.body);
    if (!result.success) {
      return reply.code(result.statusCode || 400).send(result);
    }
    return reply.send(result);
  });

  // GET /api/payments/:id/events — SSE stream for payment status updates
  app.get('/api/payments/:id/events', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const payment = paymentService.getPayment(app.db, request.params.id, request.user.id);

    if (!payment) {
      return reply.code(404).send({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
      });
    }

    // If already finalized, send status and close
    if (['completed', 'failed', 'expired'].includes(payment.status)) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      reply.raw.write(`event: payment_update\ndata: ${JSON.stringify({ status: payment.status })}\n\n`);
      reply.raw.end();
      return;
    }

    // Register SSE connection
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ paymentId: payment.id })}\n\n`);

    sseManager.addConnection(payment.id, reply.raw);

    request.raw.on('close', () => {
      sseManager.removeConnection(payment.id, reply.raw);
    });
  });
}
