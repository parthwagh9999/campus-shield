import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('redis');

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  log.warn('Redis connection warning', { error: err.message });
});

redis.on('connect', () => {
  log.info('Connected to Redis');
});
