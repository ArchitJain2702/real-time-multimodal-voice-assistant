import { Writable } from 'stream';
import { CartesiaClient as SDKCartesiaClient } from '@cartesia/cartesia-js';
import { env } from '../../config/env';
import { logger } from '../../observability/logger';

export class CartesiaClient extends Writable {
  private sdkClient: SDKCartesiaClient;
  private ws: any = null;
  private voiceId = 'e00d0e4c-a5c8-443f-a8a3-473eb9a62355'; // default voice ID (Friendly Sidekick)
  private modelId = 'sonic-3.5';
  
  private bufferedClause: string | null = null;
  private currentTurnId: string | null = null;
  private isConnected = false;
  private activeEmitters: Array<() => void> = [];
  private isFirstClause = true;

  constructor() {
    super({
      objectMode: true, // Receives string clauses
    });
    this.sdkClient = new SDKCartesiaClient({ apiKey: env.CARTESIA_API_KEY });
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.ws) return;
    
    logger.debug('Connecting to Cartesia Live TTS WebSocket...');
    try {
      this.ws = this.sdkClient.tts.websocket({
        container: 'raw',
        encoding: 'pcm_s16le',
        sampleRate: 16000,
      });

      const callbacks = await this.ws.connect();
      this.isConnected = true;
      logger.info('Successfully connected to Cartesia Live WebSocket');
      
      // Handle close
      callbacks.off('close', () => {}); // emittery cleanup placeholder
    } catch (err) {
      logger.error({ err }, 'Failed to connect to Cartesia WebSocket');
      this.isConnected = false;
      throw err;
    }
  }

  startTurn(turnId: string, voiceId?: string): void {
    this.currentTurnId = turnId;
    this.bufferedClause = null;
    
    // Stop all active emitter listeners locally
    for (const stop of this.activeEmitters) {
      try {
        stop();
      } catch (err) {
        // Ignore errors
      }
    }
    this.activeEmitters = [];
    this.isFirstClause = true;

    // Clear all leaked Cartesia SDK WebSocket message listeners to prevent duplication
    if (this.ws && this.ws.socket && this.ws.socket._listeners) {
      this.ws.socket._listeners.message = [];
    }

    if (voiceId) {
      this.voiceId = voiceId;
    }
    logger.debug({ turnId, voiceId: this.voiceId }, 'Starting Cartesia Turn');
  }

  _write(chunk: string, encoding: string, callback: (error?: Error | null) => void): void {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cartesia is not connected. Attempting to connect now...');
      this.connect()
        .then(() => {
          this.handleClause(chunk);
          callback();
        })
        .catch((err) => {
          callback(new Error(`Cartesia write failed, connection error: ${err.message}`));
        });
      return;
    }

    try {
      this.handleClause(chunk);
      callback();
    } catch (err: any) {
      callback(err);
    }
  }

  private handleClause(chunk: string): void {
    if (chunk === '__END_OF_TURN__') {
      logger.debug({ turnId: this.currentTurnId }, 'Received __END_OF_TURN__ marker');
      if (this.bufferedClause) {
        // Send last buffered clause with continue: false
        this.sendToCartesia(this.bufferedClause, false);
        this.bufferedClause = null;
      }
      this.emit('turn_end', { turnId: this.currentTurnId });
    } else {
      if (this.bufferedClause) {
        // Send previous clause with continue: true
        this.sendToCartesia(this.bufferedClause, true);
      }
      this.bufferedClause = chunk;
    }
  }

  private sendToCartesia(text: string, isContinue: boolean): void {
    const turnId = this.currentTurnId;
    if (!turnId) {
      logger.error('Cannot send to Cartesia: currentTurnId is not set');
      return;
    }

    logger.info(
      { text, isContinue, turnId, isFirstClause: this.isFirstClause },
      'Sending clause to Cartesia synthesis'
    );

    this.emit('tts_sent', { turnId, timestamp: Date.now() });

    try {
      if (this.isFirstClause) {
        this.isFirstClause = false;
        this.ws.send({
          modelId: this.modelId,
          voice: {
            mode: 'id',
            id: this.voiceId,
          },
          transcript: text,
          continue: isContinue,
          contextId: turnId,
        }).then((response: any) => {
          // Track the stop trigger to cancel if interrupted
          this.activeEmitters.push(response.stop);

          // Listen for base64 audio responses
          response.on('message', (rawJson: string) => {
            try {
              const data = JSON.parse(rawJson);
              if (data.type === 'chunk') {
                const audioBuffer = Buffer.from(data.data, 'base64');
                this.emit('audio', { chunk: audioBuffer, turnId });
              } else if (data.type === 'error') {
                logger.error({ data, turnId }, 'Cartesia returned error event');
              } else if (data.done) {
                logger.debug({ turnId }, 'Cartesia synthesis chunk marked done');
              }
            } catch (e) {
              logger.error({ err: e }, 'Error parsing Cartesia message');
            }
          });
        }).catch((err: any) => {
          logger.error({ err, turnId }, 'Error sending first clause to Cartesia');
        });
      } else {
        this.ws.continue({
          modelId: this.modelId,
          voice: {
            mode: 'id',
            id: this.voiceId,
          },
          transcript: text,
          continue: isContinue,
          contextId: turnId,
        }).catch((err: any) => {
          logger.error({ err, turnId }, 'Error continuing clause to Cartesia');
        });
      }
    } catch (err: any) {
      logger.error({ err, turnId }, 'Error calling Cartesia WebSocket');
    }
  }

  async cancelCurrentSynthesis(): Promise<void> {
    logger.debug({ turnId: this.currentTurnId }, 'Canceling Cartesia synthesis context');
    
    // Stop all active emitter listeners locally
    for (const stop of this.activeEmitters) {
      try {
        stop();
      } catch (err) {
        // Ignore errors
      }
    }
    this.activeEmitters = [];
    this.bufferedClause = null;

    // Send cancel control message to Cartesia if WS socket is open
    if (this.ws && this.ws.socket && this.isConnected && this.currentTurnId) {
      try {
        const cancelPayload = JSON.stringify({
          context_id: this.currentTurnId,
          cancel: true,
        });
        this.ws.socket.send(cancelPayload);
        logger.info({ turnId: this.currentTurnId }, 'Sent cancel frame to Cartesia');
      } catch (err) {
        logger.error({ err }, 'Failed to send cancel frame to Cartesia');
      }
    }
  }

  closeConnection(): void {
    this.bufferedClause = null;
    this.activeEmitters = [];
    if (this.ws) {
      try {
        this.ws.disconnect();
      } catch (err) {
        logger.debug({ err }, 'Error disconnecting Cartesia WebSocket');
      }
      this.ws = null;
    }
    this.isConnected = false;
  }
}
export default CartesiaClient;
