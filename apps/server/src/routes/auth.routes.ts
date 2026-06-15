import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { signToken } from '../auth/jwtService';
import { sessionStore } from '../session/SessionStore';
import { logger } from '../observability/logger';

const router = Router();

/**
 * POST /api/v1/auth/session
 * Creates a new session and returns a signed JWT.
 * Body: { apiKey: string }  (simplified; production: verify bcrypt hash)
 */
router.post('/session', async (req: Request, res: Response) => {
  const { apiKey } = req.body as { apiKey?: string };

  // Simplified key check for dev — in production compare bcrypt hash
  if (!apiKey) {
    return res.status(401).json({ error: 'apiKey required' });
  }

  const sessionId = randomUUID();
  const userId = `user_${randomUUID().slice(0, 8)}`; // Replace with real user lookup

  try {
    const token = await signToken({ userId, sessionId });

    await sessionStore.create({
      sessionId,
      userId,
      pipelineState: 'IDLE',
      turnCount: 0,
      wsNodeId: process.env.POD_NAME ?? 'local',
    });

    logger.info({ sessionId, userId }, 'Session created via REST');
    return res.status(201).json({ token, sessionId });
  } catch (err) {
    logger.error({ err }, 'Error creating session');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/auth/session/:id
 */
router.delete('/session/:id', async (req: Request, res: Response) => {
  await sessionStore.delete(req.params.id);
  return res.status(204).send();
});

export default router;
