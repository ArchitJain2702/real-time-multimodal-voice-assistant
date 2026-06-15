import mongoose from 'mongoose';
import { logger } from '../observability/logger';
import { env } from '../config/env';

export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info({ uri: env.MONGODB_URI.replace(/\/\/.*@/, '//***@') }, 'MongoDB connected');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}
