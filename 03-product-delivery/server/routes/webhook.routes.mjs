import { validateSignature, processPixReceived } from '../services/webhook-handler.mjs';
import * as sseManager from '../services/sse-manager.mjs';
import { config } from '../config.mjs';

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function webhookRoutes(app) {
  // POST /api/webhooks/bank/pix-received
  // Original bank webhook (HMAC validated)
  app.post('/api/webhooks/bank/pix-received', {
    preParsing: async (request, reply, payload) => {
      const chunks = [];
      for await (const chunk of payload) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      request.rawBody = rawBody;
      const { Readable } = await import('node:stream');
      return Readable.from([rawBody]);
    },
  }, async (request, reply) => {
    const signature = request.headers['x-webhook-signature'];

    if (!signature || !validateSignature(request.rawBody, signature)) {
      app.log.warn('Webhook signature validation failed');
      return reply.code(200).send({ received: true });
    }

    const result = processPixReceived(app.db, request.body);

    if (result.processed) {
      app.log.info(`Webhook processed: payment ${result.paymentId} -> completed`);
    } else {
      app.log.warn(`Webhook skipped: ${result.reason} (payment: ${result.paymentId || 'unknown'})`);
    }

    return reply.code(200).send({ received: true });
  });

  // POST /api/webhooks/ecp-pay/payment-confirmed
  // ECP Pay callback when a PIX payment is confirmed (internal mode auto-settlement)
  app.post('/api/webhooks/ecp-pay/payment-confirmed', async (request, reply) => {
    // Validate X-API-Key against the shared ECP Pay webhook secret.
    // Without this, anyone on the network could POST a forged payment-confirmed event.
    const providedKey = request.headers['x-api-key'];
    const expectedKey = config.ecpPayWebhookApiKey;
    if (!providedKey || !timingSafeEqualStr(providedKey, expectedKey)) {
      app.log.warn('[ecp-pay-webhook] Rejected: X-API-Key missing or invalid');
      return reply.code(401).send({ received: false, error: 'unauthorized' });
    }

    const payload = request.body;

    app.log.info(`[ecp-pay-webhook] Recebido: event=${payload.event} tx=${payload.transaction_id} status=${payload.status}`);

    // Only process completed payments
    if (payload.status !== 'completed') {
      app.log.info(`[ecp-pay-webhook] Ignorando status=${payload.status}`);
      return reply.code(200).send({ received: true });
    }

    // Find payment by ECP Pay transaction ID
    const payment = app.db.prepare(
      "SELECT * FROM payments WHERE bank_transaction_id = ? AND status = 'pending'"
    ).get(payload.transaction_id);

    if (!payment) {
      // Try already completed (idempotency)
      const existing = app.db.prepare(
        "SELECT status FROM payments WHERE bank_transaction_id = ?"
      ).get(payload.transaction_id);

      if (existing?.status === 'completed') {
        app.log.info(`[ecp-pay-webhook] Já processado: tx=${payload.transaction_id}`);
        return reply.code(200).send({ received: true, already_processed: true });
      }

      app.log.warn(`[ecp-pay-webhook] Payment não encontrado para tx=${payload.transaction_id}`);
      return reply.code(200).send({ received: true });
    }

    // Update payment and order
    app.db.transaction(() => {
      app.db.prepare(`
        UPDATE payments
        SET status = 'completed',
            webhook_received_at = datetime('now'),
            webhook_payload = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(JSON.stringify(payload), payment.id);

      app.db.prepare(`
        UPDATE orders
        SET status = 'confirmed', updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.order_id);
    })();

    app.log.info(`[ecp-pay-webhook] Pagamento confirmado: payment=${payment.id} order=${payment.order_id}`);

    // Notify frontend via SSE
    sseManager.emit(payment.id, 'payment_update', {
      status: 'completed',
      orderId: payment.order_id,
    });
    sseManager.closeAll(payment.id);

    return reply.code(200).send({ received: true, processed: true });
  });
}
