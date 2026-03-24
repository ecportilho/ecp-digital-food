import { validateSignature, processPixReceived } from '../services/webhook-handler.mjs';

export async function webhookRoutes(app) {
  // POST /api/webhooks/bank/pix-received
  // We use preParsing hook to capture raw body for HMAC validation
  app.post('/api/webhooks/bank/pix-received', {
    preParsing: async (request, reply, payload) => {
      // Collect raw body from stream
      const chunks = [];
      for await (const chunk of payload) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      request.rawBody = rawBody;

      // Return a new readable stream for Fastify to parse
      const { Readable } = await import('node:stream');
      return Readable.from([rawBody]);
    },
  }, async (request, reply) => {
    const signature = request.headers['x-webhook-signature'];

    // Validate HMAC signature
    if (!signature || !validateSignature(request.rawBody, signature)) {
      app.log.warn('Webhook signature validation failed');
      // Always return 200 to avoid retries from the bank
      return reply.code(200).send({ received: true });
    }

    // Process the webhook
    const result = processPixReceived(app.db, request.body);

    if (result.processed) {
      app.log.info(`Webhook processed: payment ${result.paymentId} -> completed`);
    } else {
      app.log.warn(`Webhook skipped: ${result.reason} (payment: ${result.paymentId || 'unknown'})`);
    }

    // Always return 200 to avoid retries
    return reply.code(200).send({ received: true });
  });
}
