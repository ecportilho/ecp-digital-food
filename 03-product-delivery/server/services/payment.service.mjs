import {
  bankLogin,
  bankListCards,
  bankGetBalance,
  bankPixTransfer,
  bankGeneratePixQrCode,
  bankCardPurchaseByNumber,
  getPlatformBankToken,
  BankApiError,
} from './bank-integration.mjs';
import {
  createPixCharge,
  createCardCharge,
  getTransaction as ecpPayGetTransaction,
  refund as ecpPayRefund,
  createSplits,
} from './ecp-pay-client.mjs';
import { calculateOrderSplits } from './split-calculator.mjs';
import * as sseManager from './sse-manager.mjs';
import { config } from '../config.mjs';

/**
 * Process splits for a completed payment.
 * Wrapped in try/catch so payment succeeds even if split registration fails.
 */
async function processOrderSplits(db, order, transactionId) {
  try {
    if (!transactionId) {
      console.warn('[splits] No transaction ID available, skipping split registration');
      return null;
    }

    const orderItems = db.prepare(
      'SELECT restaurant_id, restaurant_name, item_price, quantity FROM order_items WHERE order_id = ?'
    ).all(order.id);

    if (!orderItems.length) {
      console.warn('[splits] No order items found for order', order.id);
      return null;
    }

    const splits = calculateOrderSplits(order, orderItems, db);
    console.log(`[splits] Order ${order.id} | ${splits.length} splits calculated:`,
      splits.map(s => `${s.account_name}: R$ ${(s.amount / 100).toFixed(2)}`).join(', ')
    );

    const result = await createSplits(transactionId, splits);
    console.log(`[splits] Splits registered on ECP Pay for transaction ${transactionId}`);
    return result;
  } catch (err) {
    console.error('[splits] Failed to process splits (payment still valid):', err.message);
    return null;
  }
}

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
    const bankTxId = transferResult.transactionId || transferResult.id;
    db.prepare(`
      UPDATE payments
      SET status = 'completed', bank_transaction_id = ?, bank_jwt_token = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(bankTxId, payment.id);

    db.prepare("UPDATE orders SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(order_id);

    // 6. Process splits (non-blocking — payment already succeeded)
    await processOrderSplits(db, order, bankTxId);

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
 * Pay with a registered credit card.
 * Calls ecp-digital-bank to register the purchase on the card's invoice.
 */
export async function payWithCreditCard(db, userId, { order_id, credit_card_id }) {
  // 1. Verify order
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?').get(order_id, userId, 'pending_payment');
  if (!order) {
    return { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found or not pending payment' } };
  }

  // 2. Verify credit card belongs to user
  const card = db.prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?').get(credit_card_id, userId);
  if (!card) {
    return { success: false, error: { code: 'CARD_NOT_FOUND', message: 'Credit card not found' } };
  }

  const amountCents = Math.round(order.total * 100);

  // 3. Create payment record as processing
  const paymentStmt = db.prepare(`
    INSERT INTO payments (order_id, user_id, method, status, amount_cents, card_last4)
    VALUES (?, ?, 'credit_card', 'processing', ?, ?)
  `);
  const paymentResult = paymentStmt.run(order_id, userId, amountCents, card.card_last4);
  const payment = db.prepare('SELECT * FROM payments WHERE rowid = ?').get(paymentResult.lastInsertRowid);

  try {
    // 4. Get user info for ECP Pay
    const user = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(userId);
    const customerName = user?.name || 'Cliente FoodFlow';
    const userForDoc = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    const customerDocument = userForDoc?.email || '00000000000';
    const description = `FoodFlow Pedido #${order_id}`;
    let transactionId = null;

    try {
      const ecpPayResult = await createCardCharge(
        amountCents,
        customerName,
        customerDocument,
        null, // cardToken
        card.card_number,
        card.card_expiry || null,
        null, // cardCvv — not stored
        card.card_holder || customerName,
        false, // saveCard
        1     // installments
      );
      transactionId = ecpPayResult.transaction_id || ecpPayResult.id || null;
    } catch (ecpPayErr) {
      // ECP Pay failed — fall back to direct bank integration
      console.warn('[payWithCreditCard] ECP Pay failed, falling back to bank integration:', ecpPayErr.message);
      const platformToken = await getPlatformBankToken();
      const purchaseResult = await bankCardPurchaseByNumber(
        platformToken,
        card.card_number,
        amountCents,
        description,
        'FoodFlow Delivery',
        'Alimentacao'
      );
      transactionId = purchaseResult.purchaseId || purchaseResult.id || null;
    }

    // 5. Update payment as completed
    db.prepare(`
      UPDATE payments
      SET status = 'completed', bank_transaction_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(transactionId, payment.id);

    // 6. Update order status to confirmed
    db.prepare("UPDATE orders SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?").run(order_id);

    // 7. Process splits (non-blocking — payment already succeeded)
    await processOrderSplits(db, order, transactionId);

    return {
      success: true,
      data: {
        payment_id: payment.id,
        order_id: order_id,
        status: 'completed',
        amount: order.total,
        card_last4: card.card_last4,
      },
    };
  } catch (err) {
    // Payment call failed — mark payment as failed
    const errorMsg = err instanceof BankApiError ? err.detail || err.code : err.message;
    db.prepare("UPDATE payments SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?").run(errorMsg, payment.id);
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
    // 3. Get user info for ECP Pay
    const user = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(userId);
    const customerName = user?.name || 'Cliente FoodFlow';
    const customerDocument = '00000000000'; // CPF placeholder
    const description = `ECP Food #${payment.id}`;
    let qrResult;
    let usedEcpPay = false;

    try {
      // Callback URL para o ECP Pay notificar quando o Pix for confirmado
      const callbackUrl = `http://127.0.0.1:${config.port || 3000}/api/webhooks/ecp-pay/payment-confirmed`;

      const ecpPayResult = await createPixCharge(
        amountCents,
        customerName,
        customerDocument,
        description,
        { order_id, payment_id: payment.id, source: 'ecp-food', callback_url: callbackUrl }
      );

      // ECP Pay retorna qr_code (imagem) e qr_code_text (copia e cola)
      qrResult = {
        qrcodeData: ecpPayResult.qr_code_text || ecpPayResult.qr_code || '',
        qrcodeImage: ecpPayResult.qr_code || '',
        pixCopyPaste: ecpPayResult.qr_code_text || '',
      };
      usedEcpPay = true;

      // Store ECP Pay transaction ID
      const ecpPayTxId = ecpPayResult.transaction_id || null;
      if (ecpPayTxId) {
        db.prepare("UPDATE payments SET bank_transaction_id = ?, updated_at = datetime('now') WHERE id = ?")
          .run(ecpPayTxId, payment.id);

        // Pre-register splits on ECP Pay (they will be executed when PIX is confirmed)
        await processOrderSplits(db, order, ecpPayTxId);
      }
    } catch (ecpPayErr) {
      // ECP Pay failed — fall back to direct bank integration
      console.warn('[payWithPix] ECP Pay failed, falling back to bank integration:', ecpPayErr.message);
      const platformToken = await getPlatformBankToken();
      const bankResult = await bankGeneratePixQrCode(platformToken, amountCents, description);
      qrResult = {
        qrcodeData: bankResult.qrcodeData || bankResult.qrcode_data || '',
        qrcodeImage: bankResult.qrcodeImage || bankResult.qrcode_image || '',
        pixCopyPaste: '',
      };
    }

    // 4. Calculate expiration
    const expirationMinutes = config.bankPixExpirationMinutes;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 5. Update payment with QR Code data
    db.prepare(`
      UPDATE payments
      SET pix_qrcode_data = ?, pix_qrcode_image = ?, pix_expiration = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      qrResult.qrcodeData,
      qrResult.qrcodeImage,
      expiresAt,
      payment.id
    );

    return {
      success: true,
      data: {
        payment_id: payment.id,
        order_id: order_id,
        qrcode_data: qrResult.qrcodeData,
        qrcode_image: qrResult.qrcodeImage,
        pix_copy_paste: qrResult.pixCopyPaste || qrResult.qrcodeData,
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
