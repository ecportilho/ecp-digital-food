import { config } from '../config.mjs';

const BANK_API = config.bankApiUrl;
const TIMEOUT_MS = 10_000;

// Circuit breaker state
let circuitState = { failures: 0, openUntil: 0 };
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30_000;

/**
 * Custom error for bank API failures.
 */
export class BankApiError extends Error {
  constructor(code, statusCode, detail) {
    const codeStr = typeof code === 'string' ? code : JSON.stringify(code);
    const detailStr = detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : '';
    super(`Bank API error ${statusCode}: ${codeStr}${detailStr}`);
    this.name = 'BankApiError';
    this.code = codeStr;
    this.statusCode = statusCode;
    this.detail = typeof detail === 'string' ? detail : (detail ? JSON.stringify(detail) : undefined);
  }
}

/**
 * Fetch with timeout and circuit breaker.
 */
async function bankFetch(url, options = {}) {
  // Circuit breaker check
  if (circuitState.failures >= CIRCUIT_THRESHOLD && Date.now() < circuitState.openUntil) {
    throw new BankApiError('BANK_UNAVAILABLE', 503, 'Circuit breaker is open — bank temporarily unavailable');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    // Reset circuit breaker on success
    if (res.ok) {
      circuitState.failures = 0;
    }

    return res;
  } catch (err) {
    circuitState.failures += 1;
    if (circuitState.failures >= CIRCUIT_THRESHOLD) {
      circuitState.openUntil = Date.now() + CIRCUIT_RESET_MS;
    }

    if (err.name === 'AbortError') {
      throw new BankApiError('BANK_TIMEOUT', 504, 'Bank API timeout (>10s)');
    }
    throw new BankApiError('BANK_UNAVAILABLE', 503, err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with automatic 1x retry for 5xx errors.
 */
async function bankFetchWithRetry(url, options = {}) {
  try {
    const res = await bankFetch(url, options);
    if (res.status >= 500) {
      // Retry once after 2s backoff
      await new Promise((r) => setTimeout(r, 2000));
      return bankFetch(url, options);
    }
    return res;
  } catch (err) {
    if (err.code === 'BANK_TIMEOUT' || err.code === 'BANK_UNAVAILABLE') {
      // Retry once after 2s backoff
      await new Promise((r) => setTimeout(r, 2000));
      return bankFetch(url, options);
    }
    throw err;
  }
}

/**
 * Authenticate a user on ecp-digital-bank.
 * Used for both consumers (checkout) and the platform account.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function bankLogin(email, password) {
  const res = await bankFetchWithRetry(`${BANK_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new BankApiError('BANK_AUTH_FAILED', res.status, body);
  }
  return res.json();
}

/**
 * List virtual cards for the authenticated bank user.
 * @param {string} bankJwt - JWT from bankLogin
 * @returns {Promise<Array<{ id, last4, status, type }>>}
 */
export async function bankListCards(bankJwt) {
  const res = await bankFetchWithRetry(`${BANK_API}/cards`, {
    headers: { Authorization: `Bearer ${bankJwt}` },
  });
  if (!res.ok) throw new BankApiError('CARDS_FETCH_FAILED', res.status);
  return res.json();
}

/**
 * Get account balance in cents.
 * @param {string} bankJwt
 * @returns {Promise<{ balance: number }>}
 */
export async function bankGetBalance(bankJwt) {
  const res = await bankFetchWithRetry(`${BANK_API}/accounts/me/balance`, {
    headers: { Authorization: `Bearer ${bankJwt}` },
  });
  if (!res.ok) throw new BankApiError('BALANCE_FETCH_FAILED', res.status);
  return res.json();
}

/**
 * Execute PIX transfer (debit consumer -> platform account).
 * @param {string} bankJwt - Consumer's bank JWT
 * @param {number} amountInCents
 * @param {string} description
 * @returns {Promise<{ transactionId: string, status: string }>}
 */
export async function bankPixTransfer(bankJwt, amountInCents, description) {
  const res = await bankFetchWithRetry(`${BANK_API}/pix/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bankJwt}`,
    },
    body: JSON.stringify({
      pixKeyValue: config.bankPlatformPixKey,
      pixKeyType: config.bankPlatformPixKeyType,
      amountInCents,
      description,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Bank retorna erros no shape { error: { code, message } } — extrair corretamente
    const errCode =
      (typeof body.error === 'object' && body.error?.code) ||
      (typeof body.error === 'string' && body.error) ||
      'PIX_TRANSFER_FAILED';
    const errMsg = body.error?.message || body.message || String(errCode);
    throw new BankApiError(errCode, res.status, errMsg);
  }
  return res.json();
}

/**
 * Generate PIX QR Code for payment collection (platform generates the charge).
 * @param {string} platformJwt - Platform account JWT
 * @param {number} amountInCents
 * @param {string} description
 * @returns {Promise<{ qrcodeData: string, qrcodeImage: string, expiresAt: string }>}
 */
export async function bankGeneratePixQrCode(platformJwt, amountInCents, description) {
  const res = await bankFetchWithRetry(`${BANK_API}/pix/qrcode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${platformJwt}`,
    },
    body: JSON.stringify({ amountInCents, description }),
  });
  if (!res.ok) throw new BankApiError('QRCODE_GENERATION_FAILED', res.status);
  return res.json();
}

/**
 * Process a credit card purchase by card number on ecp-digital-bank.
 * Uses the platform account JWT to authenticate (merchant-side operation).
 * @param {string} platformJwt - Platform account JWT
 * @param {string} cardNumber - Full credit card number
 * @param {number} amountCents - Amount in centavos
 * @param {string} description - Purchase description
 * @param {string} merchantName - Merchant name
 * @param {string} [merchantCategory] - Merchant category
 * @returns {Promise<{ purchaseId, status, availableAfterCents }>}
 */
export async function bankCardPurchaseByNumber(platformJwt, cardNumber, amountCents, description, merchantName, merchantCategory) {
  const res = await bankFetchWithRetry(`${BANK_API}/cards/purchase-by-number`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${platformJwt}`,
    },
    body: JSON.stringify({
      cardNumber,
      amountCents,
      description,
      merchantName,
      merchantCategory: merchantCategory || 'Alimentacao',
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BankApiError(
      body.error?.code || 'CARD_PURCHASE_FAILED',
      res.status,
      body.error?.message || body.message || 'Failed to process card purchase'
    );
  }
  return res.json();
}

/**
 * Get platform bank token. Cached in memory, refreshed every 23h.
 */
let platformTokenCache = { token: null, expiresAt: 0 };

export async function getPlatformBankToken() {
  if (platformTokenCache.token && Date.now() < platformTokenCache.expiresAt) {
    return platformTokenCache.token;
  }
  const result = await bankLogin(
    config.bankPlatformEmail,
    config.bankPlatformPassword
  );
  platformTokenCache = {
    token: result.token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23h
  };
  return platformTokenCache.token;
}
