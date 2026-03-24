import {
  bankLogin,
  bankListCards,
  bankGetBalance,
  bankPixTransfer,
  bankGeneratePixQrCode,
  getPlatformBankToken,
  BankApiError,
} from './bank-integration.mjs';
import * as sseManager from './sse-manager.mjs';
import { config } from '../config.mjs';

/**
 * Proxy: authenticate consumer on ecp-digital-bank.
 */
export async function bankAuth(db, userId, { email, password }) {
  try {
    const result = await bankLogin(email, password);
    return {
      success: true,
      data: {
        bank_token: result.token,
        bank_user: result.user,
      },
    };
  } catch (err) {
    if (err instanceof BankApiError) {
      return {
        success: false,
        error: { code: err.code, message: 'Invalid bank credentials' },
        statusCode: 401,
      };
    }
    throw err;
  }
}

/**
 * Proxy: list consumer's bank cards.
 */
export async function bankCards(db, { bank_token }) {
  try {
    const cards = await bankListCards(bank_token);
    // Filter out blocked cards
    const data = Array.isArray(cards) ? cards : (cards.data || cards.cards || []);
    const activeCards = data.filter(c => c.status !== 'blocked');
    return { success: true, data: activeCards };
  } catch (err) {
    if (err instanceof BankApiError) {
      return { success: false, error: { code: err.code, message: 'Failed to fetch bank cards' }, statusCode: err.statusCode };
    }
    throw err;
  }
}

/**
 * Proxy: get consumer's bank balance.
 */
export async function bankBalance(db, { bank_token }) {
  try {
    const result = await bankGetBalance(bank_token);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof BankApiError) {
      return { success: false, error: { code: err.code, message: 'Failed to fetch balance' }, statusCode: err.statusCode };
    }
    throw err;
  }
}

/**
 * Pay with ECP card (debit via PIX transfer to platform).
 */
export async function payWithCard(db, userId, { order_id, bank_token, card_last4 }) {
  // 1. Verify order
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?').get(order_id, userId, 'pending_payment');
  if (!order) {
    return { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or not pending payment' } };
  }

  const amountCents = Math.round(order.total * 100);

  // 2. Create payment record
  const paymentStmt = db.prepare(`
    INSERT INTO payments (order_id, user_id, method, status, amount_cents, bank_jwt_token, card_last4)
    VALUES (?, ?, 'card_ecp', 'processing', ?, ?, ?)
  `);
  const paymentResult = paymentStmt.run(order_id, userId, amountCents, bank_token, card_last4 || null);
  const payment = db.prepare('SELECT * FROM payments WHERE rowid = ?').get(paymentResult.lastInsertRowid);

  try {
    // 3. Check balance
    const balanceResult = await bankGetBalance(bank_token);
    const balance = balanceResult.balance || balanceResult.data?.balance || 0;
    if (balance < amountCents) {
      db.prepare("UPDATE payments SET status = 'failed', error_message = 'Insufficient balance', bank_jwt_token = NULL, updated_at = datetime('now') WHERE id = ?").run(payment.id);
      db.prepare("UPDATE orders SET status = 'payment_failed', updated_at = datetime('now') WHERE id = ?").run(order_id);
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient balance. Available: R$ ${(balance / 100).toFixed(2)}`,
        },
        statusCode: 422,
      };
    }

    // 4. Execute PIX transfer
    const description = `ECP Food Pedido #${order_id}`;
    const transferResult = await bankPixTransfer(bank_token, amountCents, description);

    // 5. Update payment and order
    db.prepare(`
      UPDATE payments
      SET status = 'completed', bank_transaction_id = ?, bank_jwt_token = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(transferResult.transactionId || transferResult.id, payment.id);

    db.prepare("UPDATE orders SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(order_id);

    return {
      success: true,
      data: {
        payment_id: payment.id,
        order_id: order_id,
        status: 'completed',
        amount: order.total,
      },
    };
  } catch (err) {
    // Clean up bank token and mark as failed
    const errorMsg = err instanceof BankApiError ? err.detail || err.code : err.message;
    db.prepare("UPDATE payments SET status = 'failed', error_message = ?, bank_jwt_token = NULL, updated_at = datetime('now') WHERE id = ?").run(errorMsg, payment.id);
    db.prepare("UPDATE orders SET status = 'payment_failed', updated_at = datetime('now') WHERE id = ?").run(order_id);

    if (err instanceof BankApiError) {
      return {
        success: false,
        error: { code: err.code, message: errorMsg },
        statusCode: err.statusCode,
      };
    }
    throw err;
  }
}

/**
 * Generate PIX QR Code for payment.
 */
export async function payWithPix(db, userId, { order_id }) {
  // 1. Verify order
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?').get(order_id, userId, 'pending_payment');
  if (!order) {
    return { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or not pending payment' } };
  }

  const amountCents = Math.round(order.total * 100);

  // 2. Create payment record
  const paymentStmt = db.prepare(`
    INSERT INTO payments (order_id, user_id, method, status, amount_cents)
    VALUES (?, ?, 'pix_qrcode', 'pending', ?)
  `);
  const paymentResult = paymentStmt.run(order_id, userId, amountCents);
  const payment = db.prepare('SELECT * FROM payments WHERE rowid = ?').get(paymentResult.lastInsertRowid);

  try {
    // 3. Get platform bank token
    const platformToken = await getPlatformBankToken();

    // 4. Generate QR Code
    const description = `ECP Food #${payment.id}`;
    const qrResult = await bankGeneratePixQrCode(platformToken, amountCents, description);

    // 5. Calculate expiration
    const expirationMinutes = config.bankPixExpirationMinutes;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 6. Update payment with QR Code data
    db.prepare(`
      UPDATE payments
      SET pix_qrcode_data = ?, pix_qrcode_image = ?, pix_expiration = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      qrResult.qrcodeData || qrResult.qrcode_data || qrResult.data,
      qrResult.qrcodeImage || qrResult.qrcode_image || qrResult.image,
      expiresAt,
      payment.id
    );

    return {
      success: true,
      data: {
        payment_id: payment.id,
        order_id: order_id,
        qrcode_data: qrResult.qrcodeData || qrResult.qrcode_data || qrResult.data,
        qrcode_image: qrResult.qrcodeImage || qrResult.qrcode_image || qrResult.image,
        expires_at: expiresAt,
        amount: order.total,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof BankApiError ? err.detail || err.code : err.message;
    db.prepare("UPDATE payments SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?").run(errorMsg, payment.id);

    if (err instanceof BankApiError) {
      return {
        success: false,
        error: { code: err.code, message: errorMsg },
        statusCode: err.statusCode,
      };
    }
    throw err;
  }
}

/**
 * Get payment by ID for SSE endpoint.
 */
export function getPayment(db, paymentId, userId) {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ? AND user_id = ?').get(paymentId, userId);
  if (!payment) {
    return null;
  }
  return payment;
}
