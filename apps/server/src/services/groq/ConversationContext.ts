import { ChatMessage } from '@voice-assistant/types';
import { logger } from '../../observability/logger';

export class ConversationContext {
  private messages: ChatMessage[] = [];
  private systemPrompt: string;
  private maxTurns = 20; // Sliding window: keep last 20 turns (40 messages) + system prompt

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt || 'You are a helpful, real-time voice assistant. Respond concisely in 1-2 sentences. Avoid markdown formatting, lists, or symbols as your response will be read aloud.';
  }

  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
    this.applySlidingWindow();
  }

  getMessagesForLlm(): { role: 'user' | 'assistant' | 'system'; content: string }[] {
    return [
      { role: 'system', content: this.systemPrompt },
      ...this.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    ];
  }

  /**
   * Resets the conversation state on interruption.
   * If tokens were emitted, appends a synthetic assistant response [interrupted]
   * to keep the dialogue alternate structure valid.
   */
  markLastTurnInterrupted(tokensEmittedCount: number, partialText?: string): void {
    logger.debug({ tokensEmittedCount, partialText }, 'Marking conversation context as interrupted');
    
    // Check if the last message in history is already an assistant message.
    // If not, and we have emitted tokens, we should append the partial text plus a marker.
    const lastMsg = this.messages[this.messages.length - 1];
    
    if (tokensEmittedCount > 0) {
      const content = partialText ? `${partialText} [interrupted]` : '[interrupted]';
      this.messages.push({
        role: 'assistant',
        content,
        timestamp: Date.now(),
      });
    } else {
      // No tokens were emitted. We can either remove the last user message or just leave it.
      // Typically, removing the last user message is correct if it didn't get answered,
      // or we can leave it but we shouldn't insert a blank assistant turn.
      // Let's remove the last user message if it's the last message, so the next turn starts fresh,
      // or keep it and add a placeholder. The blueprint says "removes the incomplete assistant turn entirely".
      // If we didn't add any assistant message, there is no incomplete assistant turn to remove.
      // So doing nothing is correct since we haven't appended the assistant message yet.
      logger.debug('No tokens were emitted, no assistant turn is appended');
    }
    
    this.applySlidingWindow();
  }

  clear(): void {
    this.messages = [];
  }

  private applySlidingWindow(): void {
    const maxMessages = this.maxTurns * 2;
    if (this.messages.length > maxMessages) {
      // Remove oldest messages but ensure we keep the dialogue structure starting with user
      this.messages = this.messages.slice(this.messages.length - maxMessages);
      if (this.messages[0] && this.messages[0].role === 'assistant') {
        this.messages.shift(); // Remove the leading assistant message to keep user/assistant pairs
      }
    }
  }
}
