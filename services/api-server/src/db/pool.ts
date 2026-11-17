import pg from 'pg';
import { env } from '../config/env.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('db-pool');

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  log.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});
