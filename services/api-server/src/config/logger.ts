import pino from 'pino';
import { env } from './env.js';

const baseLogger = pino({
  level: env.LOG_LEVEL || 'info',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export function createLogger(name: string) {
  const child = baseLogger.child({ module: name });
  return {
    info: (msg: string, data?: Record<string, unknown> | Error | unknown) =>
      data !== undefined ? child.info(data, msg) : child.info(msg),
    error: (msg: string, data?: Record<string, unknown> | Error | unknown) =>
      data !== undefined ? child.error(data, msg) : child.error(msg),
    warn: (msg: string, data?: Record<string, unknown> | Error | unknown) =>
      data !== undefined ? child.warn(data, msg) : child.warn(msg),
    debug: (msg: string, data?: Record<string, unknown> | Error | unknown) =>
      data !== undefined ? child.debug(data, msg) : child.debug(msg),
  };
}

export const logger = baseLogger;
