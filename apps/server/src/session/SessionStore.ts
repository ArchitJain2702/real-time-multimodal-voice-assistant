import { redis } from '../db/redis';
import { SESSION_CONSTANTS } from '../config/constants';
import { logger } from '../observability/logger';
import { Session } from '../db/models/Session.model';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

export interface SessionData {
  sessionId: string;
  userId: string;
  pipelineState: string;
  turnCount: number;
  wsNodeId: string;
}

const key = (sessionId: string) => `session:${sessionId}`;
const ctxKey = (sessionId: string) => `context:${sessionId}`;

export class SessionStore {
  static async createSession(userId: string): Promise<any> {
    const session = new Session({
      sessionId: randomUUID(),
      userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
    return await session.save();
  }

  static async getSession(id: string): Promise<any> {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const byId = await Session.findById(id);
      if (byId) return byId;
    }
    return await Session.findOne({ sessionId: id });
  }

  static async listUserSessions(userId: string): Promise<any[]> {
    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : { userId };
    return await Session.find(query).sort({ startedAt: -1 });
  }

  static async deleteSession(id: string): Promise<any> {
    if (mongoose.Types.ObjectId.isValid(id)) {
      const byId = await Session.findByIdAndDelete(id);
      if (byId) return byId;
    }
    return await Session.findOneAndDelete({ sessionId: id });
  }

  async create(data: SessionData): Promise<void> {
    await redis.hset(key(data.sessionId), {
      userId: data.userId,
      pipelineState: data.pipelineState,
      turnCount: String(data.turnCount),
      wsNodeId: data.wsNodeId,
    });
    await redis.expire(key(data.sessionId), SESSION_CONSTANTS.SESSION_TTL_SEC);
    logger.debug({ sessionId: data.sessionId }, 'Session created in Redis');
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const raw = await redis.hgetall(key(sessionId));
    if (!raw || !raw.userId) return null;
    return {
      sessionId,
      userId: raw.userId,
      pipelineState: raw.pipelineState,
      turnCount: parseInt(raw.turnCount ?? '0', 10),
      wsNodeId: raw.wsNodeId,
    };
  }

  async update(sessionId: string, fields: Partial<Omit<SessionData, 'sessionId'>>): Promise<void> {
    const updates: Record<string, string> = {};
    if (fields.pipelineState) updates.pipelineState = fields.pipelineState;
    if (fields.turnCount !== undefined) updates.turnCount = String(fields.turnCount);
    if (Object.keys(updates).length > 0) {
      await redis.hset(key(sessionId), updates);
      await redis.expire(key(sessionId), SESSION_CONSTANTS.SESSION_TTL_SEC);
    }
  }

  async delete(sessionId: string): Promise<void> {
    await redis.del(key(sessionId), ctxKey(sessionId));
    logger.debug({ sessionId }, 'Session deleted from Redis');
  }

  async saveContext(sessionId: string, messages: unknown[]): Promise<void> {
    await redis.set(ctxKey(sessionId), JSON.stringify(messages));
    await redis.expire(ctxKey(sessionId), SESSION_CONSTANTS.SESSION_TTL_SEC);
  }

  async loadContext(sessionId: string): Promise<unknown[]> {
    const raw = await redis.get(ctxKey(sessionId));
    if (!raw) return [];
    return JSON.parse(raw);
  }
}

export const sessionStore = new SessionStore();
