import { Readable } from 'stream';
import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { ConversationContext } from './ConversationContext';
import { logger } from '../../observability/logger';

export class GroqClient extends Readable {
  private groq: Groq;
  private currentRequestSignal: AbortController | null = null;
  private tokensEmitted = 0;
  private partialResponseText = '';

  constructor() {
    super({
      objectMode: true,
      read() {}, // No-op, push-based
    });
    this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  async prompt(
    text: string,
    context: ConversationContext,
    turnId: string,
    parentAbortSignal?: AbortSignal
  ): Promise<void> {
    // 1. Cancel any in-flight Groq requests
    this.cancelInFlight();

    // Create a new AbortController for this turn
    const abortController = new AbortController();
    this.currentRequestSignal = abortController;

    // Listen to parent abort signal to cancel if needed
    const onParentAbort = () => {
      logger.debug({ turnId }, 'Parent abort signal triggered, canceling Groq request');
      this.cancelInFlight();
    };
    if (parentAbortSignal) {
      parentAbortSignal.addEventListener('abort', onParentAbort);
    }

    this.tokensEmitted = 0;
    this.partialResponseText = '';

    // Add user message to context
    context.addMessage('user', text);

    this.emit('llm_start', { turnId, timestamp: Date.now() });

    try {
      const stream = await this.groq.chat.completions.create(
        {
          messages: context.getMessagesForLlm(),
          model: 'llama-3.1-8b-instant',
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        },
        { signal: this.currentRequestSignal.signal }
      );

      for await (const chunk of stream) {
        if (this.currentRequestSignal.signal.aborted) {
          logger.debug({ turnId }, 'Groq stream iteration stopped due to abort');
          break;
        }

        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          if (this.tokensEmitted === 0) {
            this.emit('llm_ttft', { turnId, timestamp: Date.now() });
          }
          this.tokensEmitted++;
          this.partialResponseText += token;
          
          // Push token downstream
          this.push(token);
          this.emit('token', { token, tokenIndex: this.tokensEmitted - 1, turnId });
        }
      }

      if (!this.currentRequestSignal.signal.aborted) {
        // Save assistant response to context on success
        context.addMessage('assistant', this.partialResponseText);
        
        // Push special end of turn marker to flush downstream streams
        this.push('__END_OF_TURN__');
        this.emit('llm_end', { turnId, fullText: this.partialResponseText });
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || this.currentRequestSignal.signal.aborted) {
        logger.debug({ turnId }, 'Groq request was aborted.');
      } else {
        logger.error({ err, turnId }, 'Error during Groq streaming');
        this.emit('error', err);
      }
    } finally {
      if (parentAbortSignal) {
        parentAbortSignal.removeEventListener('abort', onParentAbort);
      }
      this.currentRequestSignal = null;
    }
  }

  cancelInFlight(): void {
    if (this.currentRequestSignal) {
      this.currentRequestSignal.abort();
      this.currentRequestSignal = null;
    }
  }

  getTokensEmittedCount(): number {
    return this.tokensEmitted;
  }

  getPartialResponseText(): string {
    return this.partialResponseText;
  }
}
