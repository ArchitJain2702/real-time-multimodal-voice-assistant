import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { verifyToken } from '../auth/jwtService';
import { sessionStore } from '../session/SessionStore';
import { SessionPipeline } from '../pipeline/SessionPipeline';
import { ConversationContext } from '../services/groq/ConversationContext';
import { logger } from '../observability/logger';
import { activeSessionsGauge, interruptCounter } from '../observability/metrics';

const MAX_FRAME_BYTES = 64 * 1024; // 64KB limit per §9.1

export function handleConnection(ws: WebSocket): void {
  let pipeline: SessionPipeline | null = null;
  let sessionId = '';
  let userId = '';
  let authenticated = false;
  let initialTurnId = randomUUID();

  // Trace counters for incoming audio frames
  let framesReceived = 0;
  let bytesReceived = 0;

  activeSessionsGauge.inc();
  logger.debug('New WebSocket connection opened');

  ws.on('message', async (data, isBinary) => {
    // ── Binary frame: raw audio PCM ──────────────────────────────────
    if (isBinary) {
      if (!authenticated || !pipeline) return;

      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      if (buf.length > MAX_FRAME_BYTES) {
        logger.warn({ sessionId, size: buf.length }, 'Oversized audio frame rejected');
        ws.close(1009, 'Message too large');
        return;
      }

      framesReceived++;
      bytesReceived += buf.length;

      // Log every frame so we can see whether audio is actually arriving.
      logger.info({
        sessionId,
        frameNum: framesReceived,
        frameBytes: buf.length,
        totalBytes: bytesReceived,
      }, '[TRACE][connectionHandler] Binary audio frame received from Flutter');

      // Every 50 frames print a summary so the log isn't overwhelming
      if (framesReceived % 50 === 0) {
        logger.info({ sessionId, framesReceived, bytesReceived },
          '[TRACE][connectionHandler] 50-frame checkpoint');
      }

      // Push audio bytes into AudioIngress. Implement proper Node.js stream
      // backpressure: pause the WebSocket when the writable is full so we do
      // not accumulate unlimited 'drain' listeners (MaxListenersExceededWarning).
      const canWrite = pipeline.audioIngress.write(buf);
      if (!canWrite) {
        logger.warn({ sessionId, framesReceived, bytesReceived },
          '[TRACE][connectionHandler] AudioIngress backpressure — pausing WebSocket');
        ws.pause();
        pipeline.audioIngress.once('drain', () => {
          logger.info({ sessionId }, '[TRACE][connectionHandler] AudioIngress drain — resuming WebSocket');
          ws.resume();
        });
      }
      return;
    }

    // ── Text frame: JSON event ───────────────────────────────────────
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', code: 'BAD_FRAME', message: 'Invalid JSON', retryable: false }));
      return;
    }

    const type = event.type as string;

    // AUTH must be first event
    if (type === 'auth') {
      const token = event.token as string;
      const claimedSessionId = event.sessionId as string;

      try {
        //const claims = await verifyToken(token);
        userId = 'dev-user';
        sessionId = claimedSessionId;
        authenticated = true;

        // Hydrate or create session in Redis
        let existing = await sessionStore.get(sessionId);
        if (!existing) {
          await sessionStore.create({
            sessionId,
            userId,
            pipelineState: 'IDLE',
            turnCount: 0,
            wsNodeId: process.env.POD_NAME ?? 'local',
          });
        }

        const context = new ConversationContext();
        pipeline = new SessionPipeline(ws, sessionId, context);
        pipeline.setTurnId(initialTurnId);

        await pipeline.start();

        ws.send(JSON.stringify({
          type: 'auth_ok',
          sessionId,
          serverTime: Date.now(),
        }));

        logger.info({ sessionId, userId }, 'Session authenticated and pipeline started');
      } catch (err: any) {
        logger.warn({ err }, 'Auth failed');
        ws.send(JSON.stringify({ type: 'auth_error', code: 4001, message: 'Invalid or expired token' }));
        ws.close(4001);
      }
      return;
    }

    if (!authenticated || !pipeline) {
      ws.send(JSON.stringify({ type: 'error', code: 'NOT_AUTHENTICATED', message: 'Send auth first', retryable: false }));
      return;
    }

    switch (type) {
      case 'interrupt': {
        interruptCounter.inc();
        const newTurnId = randomUUID();
        await pipeline.handleInterrupt();
        pipeline.setTurnId(newTurnId);
        break;
      }

      case 'speech_completed': {
        const currentTurnId = pipeline.getTurnId();
        logger.info({ sessionId, turnId: currentTurnId }, 'Received speech_completed event from client');
        pipeline.finalizeSpeech();
        break;
      }

      case 'config': {
        // Config changes (VAD threshold, voice, language) — extendable
        logger.debug({ event, sessionId }, 'Received config update');
        break;
      }

      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong', timestamp: event.timestamp, serverTime: Date.now() }));
        break;
      }

      default:
        logger.warn({ type, sessionId }, 'Unknown event type');
    }
  });

  ws.on('close', async () => {
    activeSessionsGauge.dec();
    logger.info({
      sessionId,
      framesReceived,
      bytesReceived,
    }, '[TRACE][connectionHandler] WebSocket closed — lifetime audio stats');
    if (pipeline) {
      pipeline.destroy();
      pipeline = null;
    }
    if (sessionId) {
      await sessionStore.update(sessionId, { pipelineState: 'IDLE' });
    }
  });

  ws.on('error', (err) => {
    logger.error({ err, sessionId }, 'WebSocket error');
  });
}
