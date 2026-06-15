import { logger } from '../observability/logger';

export type PipelineState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'GENERATING'
  | 'SPEAKING'
  | 'INTERRUPTED';

export class PipelineStateMachine {
  private state: PipelineState = 'IDLE';
  private sessionId: string;
  private onStateChangeCallback: ((oldState: PipelineState, newState: PipelineState) => void) | null = null;

  private static readonly ALLOWED_TRANSITIONS: Record<PipelineState, PipelineState[]> = {
    IDLE: ['LISTENING', 'INTERRUPTED'],
    LISTENING: ['TRANSCRIBING', 'INTERRUPTED', 'IDLE', 'GENERATING'],
    TRANSCRIBING: ['GENERATING', 'INTERRUPTED', 'IDLE'],
    GENERATING: ['SPEAKING', 'INTERRUPTED', 'IDLE'],
    SPEAKING: ['IDLE', 'INTERRUPTED'],
    INTERRUPTED: ['IDLE', 'LISTENING'],
  };

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  getCurrentState(): PipelineState {
    return this.state;
  }

  onStateChange(callback: (oldState: PipelineState, newState: PipelineState) => void): void {
    this.onStateChangeCallback = callback;
  }

  transition(to: PipelineState): void {
    const from = this.state;
    if (from === to) return;

    const allowed = PipelineStateMachine.ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      const errorMsg = `Illegal state machine transition in session ${this.sessionId}: ${from} -> ${to}`;
      logger.error({ from, to, sessionId: this.sessionId }, errorMsg);
      throw new Error(errorMsg);
    }

    logger.debug({ from, to, sessionId: this.sessionId }, 'Pipeline state transition success');
    this.state = to;

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(from, to);
    }
  }

  reset(): void {
    logger.debug({ sessionId: this.sessionId }, 'Resetting pipeline state machine to IDLE');
    this.state = 'IDLE';
  }
}
