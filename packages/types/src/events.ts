import { LatencyReport } from './session';

// ==========================================
// Client -> Server Event Payloads
// ==========================================

export interface ClientAuthEvent {
  type: 'auth';
  token: string;
  sessionId: string;
  clientVersion: string;
}

export interface ClientInterruptEvent {
  type: 'interrupt';
  turnId: string;
  timestamp: number;
}

export interface ClientConfigEvent {
  type: 'config';
  vadThreshold?: number;
  language?: string;
  voice?: string;
}

export interface ClientPingEvent {
  type: 'ping';
  timestamp: number;
}

export type ClientEvent =
  | ClientAuthEvent
  | ClientInterruptEvent
  | ClientConfigEvent
  | ClientPingEvent;

// ==========================================
// Server -> Client Event Payloads
// ==========================================

export interface ServerAuthOkEvent {
  type: 'auth_ok';
  sessionId: string;
  serverTime: number;
}

export interface ServerAuthErrorEvent {
  type: 'auth_error';
  code: 4001 | 4002;
  message: string;
}

export interface ServerTranscriptPartialEvent {
  type: 'transcript_partial';
  text: string;
  turnId: string;
  confidence: number;
}

export interface ServerTranscriptFinalEvent {
  type: 'transcript_final';
  text: string;
  turnId: string;
  asrLatencyMs: number;
}

export interface ServerLlmTokenEvent {
  type: 'llm_token';
  token: string;
  turnId: string;
  tokenIndex: number;
}

export interface ServerTtsClauseStartEvent {
  type: 'tts_clause_start';
  clauseId: string;
  turnId: string;
  text: string;
}

export interface ServerTtsClauseEndEvent {
  type: 'tts_clause_end';
  clauseId: string;
  audioLengthMs: number;
}

export interface ServerTurnCompleteEvent {
  type: 'turn_complete';
  turnId: string;
  latency: LatencyReport;
}

export interface ServerInterruptAckEvent {
  type: 'interrupt_ack';
  turnId: string;
}

export interface ServerErrorEvent {
  type: 'error';
  code: string;
  message: string;
  retryable: boolean;
}

export interface ServerPongEvent {
  type: 'pong';
  timestamp: number;
  serverTime: number;
}

export type ServerEvent =
  | ServerAuthOkEvent
  | ServerAuthErrorEvent
  | ServerTranscriptPartialEvent
  | ServerTranscriptFinalEvent
  | ServerLlmTokenEvent
  | ServerTtsClauseStartEvent
  | ServerTtsClauseEndEvent
  | ServerTurnCompleteEvent
  | ServerInterruptAckEvent
  | ServerErrorEvent
  | ServerPongEvent;
