import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env file manually (no dotenv dependency)
const envPath = path.join(ROOT, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  jwtExpiresIn: '24h',
  jwtRefreshExpiresIn: '7d',

  dbPath: path.resolve(ROOT, process.env.DB_PATH || './data/foodflow.db'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',

  // ECP Digital Bank
  bankApiUrl: process.env.ECP_BANK_API_URL || 'https://bank.ecportilho.com',
  bankPlatformEmail: process.env.ECP_BANK_PLATFORM_EMAIL || 'foodflow@ecportilho.com',
  bankPlatformPassword: process.env.ECP_BANK_PLATFORM_PASSWORD || '',
  bankPlatformPixKey: process.env.ECP_BANK_PLATFORM_PIX_KEY || 'foodflow@ecportilho.com',
  bankPlatformPixKeyType: process.env.ECP_BANK_PLATFORM_PIX_KEY_TYPE || 'email',
  bankPixExpirationMinutes: parseInt(process.env.ECP_BANK_PIX_EXPIRATION_MINUTES || '10', 10),
  bankWebhookSecret: process.env.ECP_BANK_WEBHOOK_SECRET || 'dev-webhook-secret',
  publicUrl: process.env.FOODFLOW_PUBLIC_URL || 'http://localhost:3000',

  root: ROOT,
};
