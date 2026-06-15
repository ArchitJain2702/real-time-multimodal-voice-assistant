import { Transform, TransformCallback } from 'stream';
import { logger } from '../observability/logger';

export class AudioIngress extends Transform {
  private lastSeq: number | null = null;

  // Trace counters
  private framesIn = 0;
  private bytesIn = 0;
  private framesOut = 0;
  private bytesOut = 0;
  private framesDropped = 0;

  constructor() {
    super({
      readableObjectMode: false,
      writableObjectMode: false,
      highWaterMark: 256 * 1024, // 256 KB
    });
    this.setMaxListeners(0);
  }

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback): void {
    this.framesIn++;
    this.bytesIn += chunk.length;

    if (chunk.length < 4) {
      logger.warn({ chunkLength: chunk.length, framesIn: this.framesIn },
        '[TRACE][AudioIngress] Discarding malformed audio frame (too short for sequence header)');
      this.framesDropped++;
      return callback();
    }

    try {
      const seq = chunk.readUInt32LE(0);
      const pcmBytes = chunk.subarray(4);

      if (this.lastSeq === null) {
        // First chunk — accept unconditionally
        logger.info({ seq, pcmBytes: pcmBytes.length, framesIn: this.framesIn },
          '[TRACE][AudioIngress] First chunk received — sequence initialised');
        this.lastSeq = seq;
        this.framesOut++;
        this.bytesOut += pcmBytes.length;
        this.push(pcmBytes);

      } else if (seq === this.lastSeq + 1) {
        // In-order chunk
        this.lastSeq = seq;
        this.framesOut++;
        this.bytesOut += pcmBytes.length;
        logger.debug({ seq, pcmBytes: pcmBytes.length, framesOut: this.framesOut, bytesOut: this.bytesOut },
          '[TRACE][AudioIngress] In-order chunk — pushing to Deepgram');
        this.push(pcmBytes);

      } else if (seq > this.lastSeq + 1) {
        // Gap detected — reset and still forward this chunk so audio is not lost
        const gapSize = seq - (this.lastSeq + 1);
        logger.warn({ lastSeq: this.lastSeq, receivedSeq: seq, gapSize },
          '[TRACE][AudioIngress] Sequence gap detected — forwarding chunk, emitting gap event');
        this.emit('gap', { expected: this.lastSeq + 1, received: seq });
        this.lastSeq = seq;
        this.framesOut++;
        this.bytesOut += pcmBytes.length;
        this.push(pcmBytes);

      } else {
        // Duplicate or out-of-order — discard
        this.framesDropped++;
        logger.debug({ lastSeq: this.lastSeq, receivedSeq: seq, framesDropped: this.framesDropped },
          '[TRACE][AudioIngress] Discarding out-of-order/duplicate chunk');
      }

      callback();
    } catch (err: any) {
      logger.error({ err }, '[TRACE][AudioIngress] Error in Transform stream');
      callback(err);
    }
  }

  reset(): void {
    logger.info({
      framesIn: this.framesIn,
      bytesIn: this.bytesIn,
      framesOut: this.framesOut,
      bytesOut: this.bytesOut,
      framesDropped: this.framesDropped,
    }, '[TRACE][AudioIngress] reset() called — lifetime stats');
    this.lastSeq = null;
    this.framesIn = 0;
    this.bytesIn = 0;
    this.framesOut = 0;
    this.bytesOut = 0;
    this.framesDropped = 0;
  }
}
