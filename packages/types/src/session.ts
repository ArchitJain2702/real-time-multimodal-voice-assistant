export interface LatencyReport {
  turnId: string;
  micEndMs: number;       // epoch ms when VAD detected end-of-speech
  asrFinalMs: number;     // epoch ms of Deepgram final event
  llmSentMs: number;      // epoch ms LLM request sent
  llmTtftMs: number;      // ms from llmSentMs to first token
  clauseOneMs: number;    // ms from llmSentMs to first clause ready
  ttsSentMs: number;      // epoch ms first clause sent to Cartesia
  ttsTtfbMs: number;      // ms from ttsSentMs to first audio byte
  playStartMs: number;    // epoch ms first audio sent to client
  e2eMs: number;          // playStartMs - micEndMs
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}
