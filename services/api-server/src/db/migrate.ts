import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { createLogger } from '../config/logger.js';

const log = createLogger('db-migrate');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    log.info('Running database migrations...');
    // Look for migration files in infra/db/migrations relative to repo root or dist
    const possiblePaths = [
      path.resolve(__dirname, '../../../../infra/db/migrations'),
      path.resolve(__dirname, '../../../infra/db/migrations'),
      path.resolve(process.cwd(), 'infra/db/migrations'),
      path.resolve(process.cwd(), '../../infra/db/migrations'),
    ];

    let migrationsDir = possiblePaths.find((p) => fs.existsSync(p));
    if (!migrationsDir) {
      throw new Error(`Could not find migrations directory in: ${possiblePaths.join(', ')}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      log.info(`Executing migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      log.info(`Migration ${file} executed successfully.`);
    }

    log.info('All migrations completed.');
  } catch (err) {
    log.error('Migration failed:', { error: (err as Error).message });
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct execution: node dist/db/migrate.js
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
