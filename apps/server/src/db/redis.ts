import Redis from 'ioredis';
import { logger } from '../observability/logger';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying
    return Math.min(times * 200, 3000);
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (err) {
    logger.error({ err }, 'Redis connection failed');
    process.exit(1);
  }
}
