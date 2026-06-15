import { Router, Request, Response } from 'express';
import { SessionStore } from '../session/SessionStore';

const router = Router();

// Create a new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const session = await SessionStore.createSession(userId);
    res.status(201).json(session);
  } catch (err) {
    console.error('Failed to create session', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get a session by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await SessionStore.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    console.error('Failed to get session', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List all sessions for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const sessions = await SessionStore.listUserSessions(req.params.userId);
    res.json(sessions);
  } catch (err) {
    console.error('Failed to list sessions', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a session
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await SessionStore.deleteSession(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('Failed to delete session', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
