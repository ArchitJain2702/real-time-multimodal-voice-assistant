import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'token',
      'JWT_SECRET',
      'DEEPGRAM_API_KEY',
      'GROQ_API_KEY',
      'CARTESIA_API_KEY',
      'req.headers.authorization',
    ],
    censor: '[REDACTED]',
  },
  transport: env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});
export default logger;
