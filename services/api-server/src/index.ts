import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env.js';
import { logger, createLogger } from './config/logger.js';
import { pool } from './db/pool.js';
import { studentAuth, staffAuth } from './modules/auth/auth.middleware.js';
import { VaultService } from './modules/vault/vault.service.js';
import { CheckinService } from './modules/checkin/checkin.service.js';
import { TripsService } from './modules/trips/trips.service.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { vaultRoutes } from './modules/vault/vault.routes.js';
import { checkinRoutes } from './modules/checkin/checkin.routes.js';
import { tripsRoutes } from './modules/trips/trips.routes.js';
import { policeRoutes } from './modules/police/police.routes.js';
import { initBroadcaster } from './ws/broadcaster.js';
import { initCheckinWorker } from './modules/checkin/checkin.worker.js';
import { initTripsWorker } from './modules/trips/trips.worker.js';

const log = createLogger('server');

export async function buildApp() {
  const app = Fastify({
    logger: false, // We use custom pino logger
  });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : [env.CORS_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // JWT
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  // Attach auth decorators
  app.decorate('studentAuth', studentAuth);
  app.decorate('staffAuth', staffAuth);
  app.decorate('verifyStaffJwt', async (token: string) => {
    const decoded = app.jwt.verify<{ sub: string; type: string; role?: string }>(token);
    if (decoded.type !== 'staff') {
      throw new Error('Not a staff token');
    }
    return { staffId: decoded.sub, role: decoded.role ?? 'DISPATCHER' };
  });

  // Services
  const vaultService = new VaultService(pool);
  const checkinService = new CheckinService(pool, vaultService);
  const tripsService = new TripsService(pool, vaultService);

  // Health check
  app.get('/health', async () => ({
    status: 'OK',
    service: 'campus-shield-api',
    timestamp: new Date().toISOString(),
  }));

  // Register route modules
  await app.register(authRoutes, { pool, vaultService });
  await app.register(vaultRoutes, { vaultService });
  await app.register(checkinRoutes, { checkinService });
  await app.register(tripsRoutes, { tripsService });
  await app.register(policeRoutes);

  return { app, vaultService, checkinService, tripsService };
}

async function start() {
  const { app, vaultService } = await buildApp();

  // Socket.IO on top of Fastify raw HTTP server
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  initBroadcaster(io, pool, app.verifyStaffJwt);

  // Initialize background workers
  initCheckinWorker(pool, vaultService);
  initTripsWorker(pool, vaultService);

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    log.info(`CampusShield API running on http://${env.API_HOST}:${env.API_PORT}`);
  } catch (err) {
    logger.error({ error: (err as Error).message }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      await app.close();
      await pool.end();
      log.info('Server and DB pool closed successfully.');
      process.exit(0);
    } catch (err) {
      log.error('Error during shutdown', { error: (err as Error).message });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
