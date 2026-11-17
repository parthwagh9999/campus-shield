import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://campusshield:changeme@localhost:5432/campusshield'),
  POSTGRES_USER: z.string().default('campusshield'),
  POSTGRES_PASSWORD: z.string().default('changeme'),
  POSTGRES_DB: z.string().default('campusshield'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),

  JWT_SECRET: z.string().min(16).default('development-jwt-secret-at-least-32-chars-long-123456789'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  VAULT_ENCRYPTION_KEY: z.string().length(64).default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  OVERPASS_API_URL: z.string().url().default('https://overpass-api.de/api/interpreter'),

  GRACE_PERIOD_SECONDS: z.coerce.number().default(60),
  DEFAULT_CHECKIN_INTERVAL_HOURS: z.coerce.number().default(48),

  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment variable validation failed');
}

export const env = parsed.data;
