import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  
  DEEPGRAM_API_KEY: z.string({
    required_error: 'DEEPGRAM_API_KEY is required',
  }),
  GROQ_API_KEY: z.string({
    required_error: 'GROQ_API_KEY is required',
  }),
  CARTESIA_API_KEY: z.string({
    required_error: 'CARTESIA_API_KEY is required',
  }),
  
  MONGODB_URI: z.string().default('mongodb://localhost:27017/va_dev'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long').default('dev-secret-32-chars-minimum-key-length-is-32'),
  MAX_SESSIONS_PER_USER: z.coerce.number().default(5),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
