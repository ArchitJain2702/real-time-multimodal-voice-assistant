import { Writable } from 'stream';
import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';
import { env } from '../../config/env';
import { logger } from '../../observability/logger';

export class DeepgramClient extends Writable {
  private deepgramSDK;
  private liveConn: LiveClient | null = null;
  private transcriptBuffer = '';
  private isConnected = false;
  private isConnecting = false;
  private connectPromise: Promise<void> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  // Trace counters
  private writeCount = 0;
  private bytesWritten = 0;
  private keepAliveCount = 0;
  private transcriptPartialCount = 0;
  private transcriptFinalCount = 0;

  constructor() {
    super({
      objectMode: false,
    });
    this.deepgramSDK = createClient(env.DEEPGRAM_API_KEY);
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    if (this.isConnecting) return this.connectPromise || Promise.resolve();

    this.isConnecting = true;
    logger.info('[TRACE][DeepgramClient] connect() called');

    this.connectPromise = new Promise<void>((resolve, reject) => {
      try {
        const live = this.deepgramSDK.listen.live({
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          // Flutter Web with AudioEncoder.pcm16bits uses AudioWorklet which
          // outputs raw uncompressed PCM — there is no container/header for
          // Deepgram to auto-detect. These three params are REQUIRED.
          encoding: 'linear16',
          sample_rate: 16000,
          channels: 1,
          endpointing: 330,
          interim_results: true,
        });

        this.liveConn = live;

        live.on(LiveTranscriptionEvents.Open, () => {
          logger.info('[TRACE][DeepgramClient] Deepgram Live WebSocket OPEN');
          this.isConnected = true;
          this.isConnecting = false;

          // Keepalive every 8 s to prevent idle-timeout disconnect
          this.keepAliveTimer = setInterval(() => {
            if (this.liveConn && this.isConnected) {
              this.keepAliveCount++;
              logger.info({ keepAliveCount: this.keepAliveCount },
                '[TRACE][DeepgramClient] Sending keepalive ping');
              this.liveConn.keepAlive();
            }
          }, 8000);

          resolve();
        });

        live.on(LiveTranscriptionEvents.Close, (event) => {
          logger.warn({
            event,
            writeCount: this.writeCount,
            bytesWritten: this.bytesWritten,
            keepAliveCount: this.keepAliveCount,
            transcriptPartialCount: this.transcriptPartialCount,
            transcriptFinalCount: this.transcriptFinalCount,
          }, '[TRACE][DeepgramClient] Deepgram Live WebSocket CLOSED — lifetime stats');
          if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); this.keepAliveTimer = null; }
          this.isConnected = false;
          this.isConnecting = false;
          this.emit('close');
        });

        live.on(LiveTranscriptionEvents.Error, (err) => {
          logger.error({ err }, '[TRACE][DeepgramClient] Deepgram Live WebSocket ERROR');
          this.isConnected = false;
          this.isConnecting = false;
          this.emit('error', err);
          reject(err);
        });

        live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
          const alt = data.channel.alternatives[0];
          const text = alt ? alt.transcript : '';
          const isFinal = data.is_final;
          const speechFinal = data.speech_final;
          const fromFinalize = data.from_finalize;

          logger.info({ text, isFinal, speechFinal, fromFinalize },
            '[TRACE][DeepgramClient] Transcript callback fired');

          if (!text.trim() && !speechFinal && !fromFinalize) return;

          if (isFinal || fromFinalize) {
            this.transcriptFinalCount++;
            if (text.trim()) {
              this.transcriptBuffer = (this.transcriptBuffer + ' ' + text).trim();
            }

            logger.info({ text: this.transcriptBuffer, transcriptFinalCount: this.transcriptFinalCount },
              '[TRACE][DeepgramClient] transcript_final emitted');
            this.emit('transcript_final', {
              text: this.transcriptBuffer,
              confidence: alt?.confidence || 0,
            });

            if (speechFinal || fromFinalize) {
              const finalTranscript = this.transcriptBuffer;
              logger.info({ finalTranscript, speechFinal, fromFinalize }, '[TRACE][DeepgramClient] ASR Speech Final — triggering LLM');
              this.transcriptBuffer = '';
              this.emit('final', finalTranscript);
            }
          } else {
            this.transcriptPartialCount++;
            const partialText = (this.transcriptBuffer + ' ' + text).trim();
            logger.info({ partialText, transcriptPartialCount: this.transcriptPartialCount },
              '[TRACE][DeepgramClient] transcript_partial emitted');
            this.emit('transcript_partial', {
              text: partialText,
              confidence: alt?.confidence || 0,
            });
          }
        });
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });

    return this.connectPromise;
  }

  _write(chunk: Buffer, encoding: string, callback: (error?: Error | null) => void): void {
    this.writeCount++;
    this.bytesWritten += chunk.length;

    logger.info({
      writeCount: this.writeCount,
      chunkBytes: chunk.length,
      totalBytesWritten: this.bytesWritten,
      isConnected: this.isConnected,
    }, '[TRACE][DeepgramClient] _write() called');

    if (!this.isConnected || !this.liveConn) {
      logger.warn({ isConnected: this.isConnected, hasConn: !!this.liveConn },
        '[TRACE][DeepgramClient] Not connected — attempting reconnect before sending');
      this.connect()
        .then(() => {
          this.sendAudio(chunk);
          callback();
        })
        .catch((err) => {
          callback(new Error(`Deepgram write failed, connection error: ${err.message}`));
        });
      return;
    }

    try {
      this.sendAudio(chunk);
      callback();
    } catch (err: any) {
      callback(err);
    }
  }

  private sendAudio(pcm: Buffer): void {
    if (this.liveConn && this.isConnected) {
      logger.debug({ bytes: pcm.length }, '[TRACE][DeepgramClient] Sending bytes to Deepgram socket');
      this.liveConn.send(pcm as any);
    } else {
      logger.warn({ isConnected: this.isConnected, hasConn: !!this.liveConn },
        '[TRACE][DeepgramClient] sendAudio called but not ready — bytes DROPPED');
    }
  }

  getTranscriptBuffer(): string {
    return this.transcriptBuffer;
  }

  finalize(): void {
    if (this.liveConn && this.isConnected) {
      logger.info('[TRACE][DeepgramClient] finalize() called — sending Finalize message');
      this.liveConn.finalize();
    } else {
      logger.warn({ isConnected: this.isConnected, hasConn: !!this.liveConn },
        '[TRACE][DeepgramClient] finalize() called but not ready');
    }
  }

  reset(): void {
    logger.info('[TRACE][DeepgramClient] reset() called — clearing transcript buffer');
    this.transcriptBuffer = '';
  }

  closeConnection(): void {
    logger.info({
      writeCount: this.writeCount,
      bytesWritten: this.bytesWritten,
      keepAliveCount: this.keepAliveCount,
    }, '[TRACE][DeepgramClient] closeConnection() called — final stats');
    this.reset();
    if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); this.keepAliveTimer = null; }
    if (this.liveConn) {
      try {
        this.liveConn.finish();
      } catch (err) {
        logger.debug({ err }, '[TRACE][DeepgramClient] Error calling finish()');
      }
      this.liveConn = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.connectPromise = null;
  }
}
export default DeepgramClient;
