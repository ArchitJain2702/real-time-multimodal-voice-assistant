import { WebSocket } from 'ws';
import { pipeline } from 'stream';
import { randomUUID } from 'crypto';
import { AudioIngress } from './AudioIngress';
import { ClauseDetector } from './ClauseDetector';
import { DeepgramClient } from '../services/deepgram/DeepgramClient';
import { GroqClient } from '../services/groq/GroqClient';
import { CartesiaClient } from '../services/cartesia/CartesiaClient';
import { ConversationContext } from '../services/groq/ConversationContext';
import { PipelineStateMachine, PipelineState } from './PipelineStateMachine';
import { logger } from '../observability/logger';
import { LatencyReport } from '@voice-assistant/types';

function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat (PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

export class SessionPipeline {
  public audioIngress: AudioIngress;
  public asrClient: DeepgramClient;
  public llmClient: GroqClient;
  public clauseDetect: ClauseDetector;
  public ttsClient: CartesiaClient;
  
  private ws: WebSocket;
  private context: ConversationContext;
  private stateMachine: PipelineStateMachine;
  
  private abortController: AbortController = new AbortController();
  private currentTurnId = '';
  private playSeq = 0;
  private finalizeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Latency tracking metrics
  private turnMetrics: Partial<LatencyReport> = {};

  constructor(ws: WebSocket, sessionId: string, context: ConversationContext) {
    this.ws = ws;
    this.context = context;
    this.stateMachine = new PipelineStateMachine(sessionId);

    // Initialize all components
    this.audioIngress = new AudioIngress();
    this.asrClient = new DeepgramClient();
    this.llmClient = new GroqClient();
    this.clauseDetect = new ClauseDetector();
    this.ttsClient = new CartesiaClient();

    this.stateMachine.onStateChange((oldState, newState) => {
      logger.info({ oldState, newState, sessionId }, 'State Transition');
      if (oldState === 'IDLE' && newState === 'LISTENING') {
        const newTurnId = randomUUID();
        logger.info({ oldTurnId: this.currentTurnId, newTurnId }, 'New turn started - resetting turnId');
        this.setTurnId(newTurnId);
      }
    });
  }

  async start(): Promise<void> {
    logger.debug('Starting Session Pipeline...');
    
    // Connect live services (pre-warming)
    await Promise.all([
      this.asrClient.connect(),
      this.ttsClient.connect(),
    ]);

    this.wire();
    logger.info('Session Pipeline fully connected and pre-warmed');
  }

  private wire(): void {
    // 1. Audio In -> AudioIngress -> ASR client
    pipeline(this.audioIngress, this.asrClient, (err) => {
      if (err) logger.error({ err }, 'Error in AudioIngress -> ASR pipeline');
    });

    // 2. ASR sequence gap detection -> send ASR_RESET event
    this.audioIngress.on('gap', ({ expected, received }) => {
      logger.warn({ expected, received }, 'Sequence gap found, sending ASR_RESET to client');
      this.sendJson({
        type: 'error',
        code: 'ASR_RESET',
        message: 'Audio packet gap detected. Resetting turn.',
        retryable: true,
      });
      this.resetTurn();
    });

    // 3. ASR intermediate transcripts -> forward to WebSocket client
    this.asrClient.on('transcript_partial', (data) => {
      const currentState = this.stateMachine.getCurrentState();
      if (currentState !== 'IDLE' && currentState !== 'LISTENING') {
        return;
      }
      if (currentState === 'IDLE') {
        this.stateMachine.transition('LISTENING');
      }
      this.sendJson({
        type: 'transcript_partial',
        text: data.text,
        turnId: this.currentTurnId,
        confidence: data.confidence,
      });
    });

    this.asrClient.on('transcript_final', (data) => {
      const currentState = this.stateMachine.getCurrentState();
      if (currentState !== 'IDLE' && currentState !== 'LISTENING' && currentState !== 'TRANSCRIBING') {
        return;
      }
      if (currentState === 'IDLE') {
        this.stateMachine.transition('LISTENING');
      }
      this.stateMachine.transition('TRANSCRIBING');
      this.sendJson({
        type: 'transcript_final',
        text: data.text,
        turnId: this.currentTurnId,
        asrLatencyMs: 0,
      });
    });

    // 4. ASR Speech Final -> trigger Groq LLM prompt
    this.asrClient.on('final', (transcript) => {
      if (this.finalizeTimeout) {
        clearTimeout(this.finalizeTimeout);
        this.finalizeTimeout = null;
      }

      let currentState = this.stateMachine.getCurrentState();
      if (currentState === 'IDLE') {
        this.stateMachine.transition('LISTENING');
        currentState = 'LISTENING';
      }

      if (currentState === 'LISTENING' || currentState === 'TRANSCRIBING') {
        if (!transcript.trim()) {
          logger.info({ turnId: this.currentTurnId }, 'Empty transcript from ASR. Resetting turn to IDLE.');
          this.stateMachine.transition('IDLE');
          this.sendJson({
            type: 'turn_complete',
            turnId: this.currentTurnId,
            latency: {
              turnId: this.currentTurnId,
              micEndMs: Date.now(),
              asrFinalMs: Date.now(),
              llmSentMs: Date.now(),
              llmTtftMs: 0,
              clauseOneMs: 0,
              ttsSentMs: Date.now(),
              ttsTtfbMs: 0,
              playStartMs: Date.now(),
              e2eMs: 0,
            }
          });
          this.resetTurnMetrics();
          return;
        }

        this.stateMachine.transition('GENERATING');
        logger.info({ turnId: this.currentTurnId, transcript }, 'Groq LLM Request Started');
        
        this.turnMetrics = {
          turnId: this.currentTurnId,
          micEndMs: Date.now(),
          asrFinalMs: Date.now(),
        };
        
        this.triggerLlm(transcript);
      } else {
        logger.warn({ currentState, turnId: this.currentTurnId, transcript },
          'ASR Speech Final ignored because pipeline is not in listening/transcribing state');
      }
    });

    // 5. LLM stream -> ClauseDetector -> Cartesia client
    pipeline(this.llmClient, this.clauseDetect, this.ttsClient, (err) => {
      if (err) logger.error({ err }, 'Error in LLM -> ClauseDetector -> TTS pipeline');
    });

    // 6. LLM Token streaming -> forward to WebSocket client
    this.llmClient.on('llm_start', ({ turnId }) => {
      this.turnMetrics.llmSentMs = Date.now();
    });

    this.llmClient.on('llm_ttft', ({ turnId }) => {
      this.turnMetrics.llmTtftMs = Date.now() - (this.turnMetrics.llmSentMs || Date.now());
    });

    this.llmClient.on('token', ({ token, tokenIndex, turnId }) => {
      logger.debug({ token, turnId }, 'Groq LLM Token Generated');
      this.sendJson({
        type: 'llm_token',
        token,
        turnId,
        tokenIndex,
      });
    });

    // 7. TTS Sent chunk -> track metrics
    this.ttsClient.on('tts_sent', ({ turnId }) => {
      if (!this.turnMetrics.ttsSentMs) {
        this.turnMetrics.ttsSentMs = Date.now();
      }
    });

    // 8. TTS Audio output -> send binary frame to client over WebSocket
    this.ttsClient.on('audio', ({ chunk, turnId }) => {
      if (this.stateMachine.getCurrentState() === 'GENERATING') {
        this.stateMachine.transition('SPEAKING');
        this.sendJson({
          type: 'tts_clause_start',
          turnId: this.currentTurnId,
          text: '',
        });
      }

      if (!this.turnMetrics.playStartMs) {
        this.turnMetrics.playStartMs = Date.now();
        this.turnMetrics.ttsTtfbMs = Date.now() - (this.turnMetrics.ttsSentMs || Date.now());
        this.turnMetrics.e2eMs = this.turnMetrics.playStartMs - (this.turnMetrics.micEndMs || Date.now());
        this.turnMetrics.clauseOneMs = Date.now() - (this.turnMetrics.llmSentMs || Date.now());
      }

      // Convert Cartesia PCM (16kHz, mono, 16-bit) to playable WAV
      const wavHeader = createWavHeader(chunk.length, 16000, 1, 16);
      const playableChunk = Buffer.concat([wavHeader, chunk]);

      // Prepend sequence number (4-byte LE uint32) to binary audio chunk
      const frame = Buffer.alloc(4 + playableChunk.length);
      frame.writeUInt32LE(this.playSeq++, 0);
      playableChunk.copy(frame, 4);

      if (this.ws.readyState === WebSocket.OPEN) {
        logger.info({ length: frame.length, turnId }, 'Sending Cartesia Audio Chunk to Flutter Client');
        this.ws.send(frame);
      }
    });

    // 9. TTS Turn End -> send TURN_COMPLETE event
    this.ttsClient.on('turn_end', ({ turnId }) => {
      logger.info({ turnId }, 'Assistant finished speaking, Turn complete');
      
      const report: LatencyReport = {
        turnId: this.currentTurnId,
        micEndMs: this.turnMetrics.micEndMs || Date.now(),
        asrFinalMs: this.turnMetrics.asrFinalMs || Date.now(),
        llmSentMs: this.turnMetrics.llmSentMs || Date.now(),
        llmTtftMs: this.turnMetrics.llmTtftMs || 0,
        clauseOneMs: this.turnMetrics.clauseOneMs || 0,
        ttsSentMs: this.turnMetrics.ttsSentMs || Date.now(),
        ttsTtfbMs: this.turnMetrics.ttsTtfbMs || 0,
        playStartMs: this.turnMetrics.playStartMs || Date.now(),
        e2eMs: this.turnMetrics.e2eMs || 0,
      };

      this.sendJson({
        type: 'turn_complete',
        turnId: this.currentTurnId,
        latency: report,
      });

      this.stateMachine.transition('IDLE');
      this.resetTurnMetrics();
    });
  }

  getTurnId(): string {
    return this.currentTurnId;
  }

  setTurnId(turnId: string): void {
    this.currentTurnId = turnId;
    this.playSeq = 0;
    this.ttsClient.startTurn(turnId);
  }

  private triggerLlm(transcript: string): void {
    this.abortController = new AbortController();
    this.llmClient.prompt(
      transcript,
      this.context,
      this.currentTurnId,
      this.abortController.signal
    );
  }

  finalizeSpeech(): void {
    const currentState = this.stateMachine.getCurrentState();
    logger.info({ turnId: this.currentTurnId, currentState }, '[TRACE][SessionPipeline] finalizeSpeech() called');
    
    if (currentState === 'IDLE') {
      this.stateMachine.transition('LISTENING');
    }
    
    if (this.finalizeTimeout) {
      clearTimeout(this.finalizeTimeout);
      this.finalizeTimeout = null;
    }

    this.asrClient.finalize();

    // Set fallback timeout to trigger LLM if Deepgram doesn't return from_finalize
    this.finalizeTimeout = setTimeout(() => {
      this.finalizeTimeout = null;
      const currentState = this.stateMachine.getCurrentState();
      if (currentState === 'LISTENING' || currentState === 'TRANSCRIBING') {
        const remainingTranscript = this.asrClient.getTranscriptBuffer();
        logger.info({ turnId: this.currentTurnId, remainingTranscript, source: 'fallback_timeout' }, 
          '[TRACE][SessionPipeline] Finalize fallback timeout reached — checking transcript');
        
        if (!remainingTranscript.trim()) {
          logger.info({ turnId: this.currentTurnId }, 'Empty transcript on fallback timeout. Resetting turn to IDLE.');
          this.stateMachine.transition('IDLE');
          this.sendJson({
            type: 'turn_complete',
            turnId: this.currentTurnId,
            latency: {
              turnId: this.currentTurnId,
              micEndMs: Date.now(),
              asrFinalMs: Date.now(),
              llmSentMs: Date.now(),
              llmTtftMs: 0,
              clauseOneMs: 0,
              ttsSentMs: Date.now(),
              ttsTtfbMs: 0,
              playStartMs: Date.now(),
              e2eMs: 0,
            }
          });
          this.asrClient.reset();
          this.resetTurnMetrics();
          return;
        }

        this.stateMachine.transition('GENERATING');
        logger.info({ turnId: this.currentTurnId, transcript: remainingTranscript }, 'Groq LLM Request Started (via fallback)');
        
        this.turnMetrics = {
          turnId: this.currentTurnId,
          micEndMs: Date.now(),
          asrFinalMs: Date.now(),
        };
        
        this.asrClient.reset();
        this.triggerLlm(remainingTranscript);
      }
    }, 2500);
  }

  async handleInterrupt(): Promise<void> {
    logger.info({ turnId: this.currentTurnId }, 'Handling pipeline interruption');

    this.stateMachine.transition('INTERRUPTED');
    this.abortController.abort();
    this.llmClient.cancelInFlight();
    await this.ttsClient.cancelCurrentSynthesis();

    this.audioIngress.reset();
    this.clauseDetect.reset();
    this.asrClient.reset();

    const tokensEmitted = this.llmClient.getTokensEmittedCount();
    const partialText = this.llmClient.getPartialResponseText();
    this.context.markLastTurnInterrupted(tokensEmitted, partialText);

    this.sendJson({
      type: 'interrupt_ack',
      turnId: this.currentTurnId,
    });

    this.stateMachine.transition('IDLE');
    this.resetTurnMetrics();
  }

  private resetTurn(): void {
    if (this.finalizeTimeout) {
      clearTimeout(this.finalizeTimeout);
      this.finalizeTimeout = null;
    }
    this.abortController.abort();
    this.llmClient.cancelInFlight();
    this.ttsClient.cancelCurrentSynthesis();
    this.audioIngress.reset();
    this.clauseDetect.reset();
    this.asrClient.reset();
    this.stateMachine.reset();
    this.resetTurnMetrics();
  }

  private resetTurnMetrics(): void {
    this.turnMetrics = {};
    this.playSeq = 0;
  }

  getState(): PipelineState {
    return this.stateMachine.getCurrentState();
  }

  private sendJson(payload: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  destroy(): void {
    logger.debug('Destroying Session Pipeline');
    this.resetTurn();
    this.asrClient.closeConnection();
    this.ttsClient.closeConnection();
  }
}
export default SessionPipeline;
