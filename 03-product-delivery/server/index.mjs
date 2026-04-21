import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.mjs';
import { initDb } from './database.mjs';
import * as sseManager from './services/sse-manager.mjs';

// Route imports
import { authRoutes } from './routes/auth.routes.mjs';
import { consumerRoutes } from './routes/consumer.routes.mjs';
import { restaurantRoutes } from './routes/restaurant.routes.mjs';
import { categoryRoutes } from './routes/category.routes.mjs';
import { cartRoutes } from './routes/cart.routes.mjs';
import { orderRoutes } from './routes/order.routes.mjs';
import { favoriteRoutes } from './routes/favorite.routes.mjs';
import { couponRoutes } from './routes/coupon.routes.mjs';
import { paymentRoutes } from './routes/payment.routes.mjs';
import { webhookRoutes } from './routes/webhook.routes.mjs';
import { adminRoutes } from './routes/admin.routes.mjs';
import { restaurantAdminRoutes } from './routes/restaurant-admin.routes.mjs';
import { creditCardRoutes } from './routes/credit-card.routes.mjs';
import { chatRoutes } from './routes/chat.routes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  // Initialize database
  const db = initDb();

  // Create Fastify instance
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
    // Behind an nginx reverse proxy every request arrives from 127.0.0.1, which made the
    // IP-keyed rate limit shared across all real users. Honor X-Forwarded-For so
    // request.ip is the real client address.
    trustProxy: true,
  });

  // Decorate app with db
  app.decorate('db', db);

  // --- Plugins ---

  // CORS
  await app.register(cors, {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map(s => s.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Helmet (security headers)
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disabled for development; enable in production
  });

  // Global rate limiting — per-IP. With trustProxy above, request.ip honors
  // X-Forwarded-For and individual users get their own bucket instead of sharing
  // the nginx proxy's 127.0.0.1.
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });

  // --- Routes ---

  // API routes
  await app.register(authRoutes);
  await app.register(consumerRoutes);
  await app.register(restaurantRoutes);
  await app.register(categoryRoutes);
  await app.register(cartRoutes);
  await app.register(orderRoutes);
  await app.register(favoriteRoutes);
  await app.register(couponRoutes);
  await app.register(paymentRoutes);
  await app.register(adminRoutes);
  await app.register(restaurantAdminRoutes);
  await app.register(creditCardRoutes);
  await app.register(webhookRoutes);
  await app.register(chatRoutes);

  // --- Static files (production) ---
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  try {
    await app.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback: serve index.html for non-API routes
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
        });
      }
      return reply.sendFile('index.html');
    });
  } catch {
    // Client dist not built yet — just handle 404 for API
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
        });
      }
      return reply.code(200).send({ message: 'ECP Food API is running. Build the client for the full app.' });
    });
  }

  // --- Global error handler ---
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    // Fastify validation errors
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.validation,
        },
      });
    }

    // Rate limit exceeded
    if (error.statusCode === 429) {
      return reply.code(429).send({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
      });
    }

    // Default server error
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: config.nodeEnv === 'production' ? 'Internal server error' : error.message,
      },
    });
  });

  // --- PIX Expiration Worker ---
  function startExpirationWorker() {
    setInterval(() => {
      try {
        const expired = db.prepare(`
          SELECT id, order_id FROM payments
          WHERE status = 'pending'
            AND method = 'pix_qrcode'
            AND pix_expiration < datetime('now')
        `).all();

        for (const payment of expired) {
          db.prepare(`
            UPDATE payments SET status = 'expired', updated_at = datetime('now') WHERE id = ?
          `).run(payment.id);

          db.prepare(`
            UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?
          `).run(payment.order_id);

          sseManager.emit(payment.id, 'payment_update', { status: 'expired' });
          sseManager.closeAll(payment.id);
        }

        if (expired.length > 0) {
          app.log.info(`Expiration worker: ${expired.length} payment(s) expired`);
        }
      } catch (err) {
        app.log.error('Expiration worker error:', err);
      }
    }, 30_000); // Every 30 seconds
  }

  // --- Health check ---
  app.get('/api/health', async () => {
    return { success: true, data: { status: 'ok', timestamp: new Date().toISOString() } };
  });

  // --- Start server ---
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`ECP Food server running on http://${config.host}:${config.port}`);

    // Start expiration worker
    startExpirationWorker();
    app.log.info('PIX expiration worker started (30s interval)');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
