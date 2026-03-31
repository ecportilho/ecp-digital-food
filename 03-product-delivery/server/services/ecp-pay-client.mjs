import crypto from 'crypto';

const ECP_PAY_URL = process.env.ECP_PAY_URL || 'http://localhost:3335';
const ECP_PAY_API_KEY = process.env.ECP_PAY_API_KEY || 'ecp-food-dev-key';
const SOURCE_APP = 'ecp-food';

async function ecpPayRequest(method, path, body) {
  const idempotencyKey = method !== 'GET' ? crypto.randomUUID() : null;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': ECP_PAY_API_KEY,
    'X-Source-App': SOURCE_APP,
  };

  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  console.log(`[ecp-pay] ${method} ${ECP_PAY_URL}${path} | app=${SOURCE_APP}${idempotencyKey ? ` | idempotency=${idempotencyKey}` : ''}`);

  const start = Date.now();
  const response = await fetch(`${ECP_PAY_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const elapsed = Date.now() - start;

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'ECP Pay request failed' }));
    console.error(`[ecp-pay] FALHA ${response.status} em ${elapsed}ms | ${error.message}`);
    throw new Error(error.message || `ECP Pay HTTP ${response.status}`);
  }

  const result = await response.json();
  console.log(`[ecp-pay] OK ${response.status} em ${elapsed}ms | transaction_id=${result.transaction_id || '-'}`);
  return result;
}

export async function createPixCharge(amount, customerName, customerDocument, description, metadata) {
  const callbackUrl = metadata?.callback_url || undefined;
  return ecpPayRequest('POST', '/pay/pix', {
    amount,
    customer_name: customerName,
    customer_document: customerDocument,
    description,
    callback_url: callbackUrl,
    metadata,
  });
}

export async function createCardCharge(amount, customerName, customerDocument, cardToken, cardNumber, cardExpiry, cardCvv, cardHolderName, saveCard, installments) {
  return ecpPayRequest('POST', '/pay/card', {
    amount,
    customer_name: customerName,
    customer_document: customerDocument,
    card_token: cardToken,
    card_number: cardNumber,
    card_expiry: cardExpiry,
    card_cvv: cardCvv,
    card_holder_name: cardHolderName,
    save_card: saveCard,
    installments,
  });
}

export async function getTransaction(transactionId) {
  return ecpPayRequest('GET', `/pay/transactions/${transactionId}`);
}

export async function refund(transactionId, amount) {
  return ecpPayRequest('POST', `/pay/transactions/${transactionId}/refund`, { amount });
}

export async function createSplits(transactionId, splits) {
  return ecpPayRequest('POST', `/pay/transactions/${transactionId}/splits`, { splits });
}
