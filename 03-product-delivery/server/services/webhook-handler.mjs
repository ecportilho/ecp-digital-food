import crypto from 'node:crypto';
import * as sseManager from './sse-manager.mjs';
import { config } from '../config.mjs';

const WEBHOOK_SECRET = config.bankWebhookSecret;

/**
 * Validate HMAC-SHA256 signature from the webhook.
 * @param {string} rawBody - Raw body string
 * @param {string} signature - X-Webhook-Signature header value
 * @returns {boolean}
 */
export function validateSignature(rawBody, signature) {
  if (!signature || !WEBHOOK_SECRET) return false;
  try {
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Process PIX received webhook payload.
 * @param {object} db - better-sqlite3 instance
 * @param {object} payload - Parsed webhook body
 * @returns {{ processed: boolean, paymentId?: string, reason?: string }}
 */
export function processPixReceived(db, payload) {
  // 1. Verify event type
  if (payload.event !== 'pix.received') {
    return { processed: false, reason: 'INVALID_EVENT_TYPE' };
  }

  // 2. Verify PIX key matches platform
  if (payload.pixKeyValue !== config.bankPlatformPixKey) {
    return { processed: false, reason: 'PIX_KEY_MISMATCH' };
  }

  // 3. Extract payment_id from description
  const match = payload.description?.match(/ECP Food #(p_\w+)/);
  if (!match) {
    return { processed: false, reason: 'PAYMENT_ID_NOT_FOUND_IN_DESCRIPTION' };
  }
  const paymentId = match[1];

  // 4. Find pending payment
  const payment = db.prepare(
    'SELECT * FROM payments WHERE id = ? AND status = ?'
  ).get(paymentId, 'pending');

  if (!payment) {
    // Idempotency: check if already processed
    const existing = db.prepare('SELECT status FROM payments WHERE id = ?').get(paymentId);
    if (existing?.status === 'completed') {
      return { processed: true, paymentId, reason: 'ALREADY_PROCESSED' };
    }
    return { processed: false, reason: 'PAYMENT_NOT_FOUND_OR_NOT_PENDING' };
  }

  // 5. Verify amount
  if (payload.amountInCents !== payment.amount_cents) {
    return { processed: false, paymentId, reason: 'AMOUNT_MISMATCH' };
  }

  // 6. Update payment and order in a transaction
  const update = db.transaction(() => {
    db.prepare(`
      UPDATE payments
      SET status = 'completed',
          bank_transaction_id = ?,
          webhook_received_at = datetime('now'),
          webhook_payload = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(payload.transactionId, JSON.stringify(payload), paymentId);

    db.prepare(`
      UPDATE orders
      SET status = 'confirmed', updated_at = datetime('now')
      WHERE id = ?
    `).run(payment.order_id);
  });
  update();

  // 7. Notify frontend via SSE
  sseManager.emit(paymentId, 'payment_update', {
    status: 'completed',
    orderId: payment.order_id,
  });
  sseManager.closeAll(paymentId);

  return { processed: true, paymentId };
}
