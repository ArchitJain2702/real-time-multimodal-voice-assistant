import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './observability/logger';
import { connectMongo } from './db/mongo';
import { connectRedis } from './db/redis';
import authRoutes from './routes/auth.routes';
import sessionRoutes from './routes/session.routes';
import { handleConnection } from './ws/connectionHandler';
import { metricsRegistry } from './observability/metrics';

const app = express();
app.use(cors({ origin: '*', methods: ['GET','POST','DELETE','OPTIONS'] }));
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sessions', sessionRoutes);

const server = http.createServer(app);

// WebSocket server runs on same port, path /ws
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  try {
    handleConnection(ws);
  } catch (err) {
    logger.error({ err }, 'WebSocket connection handling failed');
    ws.close(1011, 'Internal error');
  }
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await Promise.all([connectMongo(), connectRedis()]);
  server.listen(PORT, () => {
    logger.info(`Server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
