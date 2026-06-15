import { Transform, TransformCallback, TransformOptions } from 'stream';
import { CLAUSE_CONSTANTS } from '../config/constants';
import { logger } from '../observability/logger';

export class ClauseDetector extends Transform {
  private buffer = '';

  constructor(options?: TransformOptions) {
    super({
      ...options,
      readableObjectMode: true,
      writableObjectMode: true,
    });
  }

  _transform(token: any, encoding: string, callback: TransformCallback): void {
    if (typeof token !== 'string') {
      // Handle buffer inputs if any
      token = token.toString();
    }

    if (token === '__END_OF_TURN__') {
      try {
        if (this.buffer.trim()) {
          this.push(this.buffer.trim());
        }
        this.buffer = '';
        this.push('__END_OF_TURN__'); // Forward to downstream
        callback();
      } catch (err: any) {
        logger.error({ err }, 'Error in ClauseDetector flushing turn');
        callback(err);
      }
      return;
    }
    
    this.buffer += token;
    
    try {
      const clauses = this.extractClauses();
      for (const clause of clauses) {
        if (clause.trim().length > 0) {
          this.push(clause);
        }
      }
      callback();
    } catch (err: any) {
      logger.error({ err }, 'Error in ClauseDetector transform');
      callback(err);
    }
  }

  private extractClauses(): string[] {
    // Normalize multiple dots (ellipsis) to a single unicode character
    const normalized = this.buffer.replace(/\.{2,}/g, '…');
    
    const matches = [...normalized.matchAll(CLAUSE_CONSTANTS.CLAUSE_REGEX)];
    if (matches.length === 0) {
      return [];
    }

    const clauses: string[] = [];
    let lastIndex = 0;
    let currentClause = '';

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i][0];
      const matchIndex = matches[i].index!;
      const candidate = currentClause + match;

      // Check if we should suppress splitting on this candidate
      // We look at the remaining buffer after this candidate to resolve digits for decimals/commas
      const remainingContext = normalized.slice(matchIndex + match.length);
      
      if (this.shouldSuppressSplit(candidate, remainingContext)) {
        currentClause = candidate;
      } else {
        clauses.push(candidate);
        currentClause = '';
        lastIndex = matchIndex + match.length;
      }
    }

    // Retain the unsplit rest in the buffer
    this.buffer = normalized.slice(lastIndex);
    return clauses;
  }

  private shouldSuppressSplit(clause: string, remainingText: string): boolean {
    const trimmed = clause.trim();
    if (!trimmed) return false;

    // 1. Abbreviation check (e.g. "Dr.", "Mr.")
    // Split the clause into words to examine the last word
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase();
    
    if (lastWord && lastWord.endsWith('.')) {
      const baseWord = lastWord.slice(0, -1);
      if (CLAUSE_CONSTANTS.ABBREVIATIONS.includes(baseWord)) {
        return true;
      }
    }

    // 2. Decimal check (e.g. "3.14" split at ".")
    if (trimmed.match(/\d\.$/)) {
      // Suppress if the next characters in the remaining text start with a digit
      if (remainingText && /^\d/.test(remainingText)) {
        return true;
      }
    }

    // 3. Numeric comma check (e.g. "1,000" split at ",")
    if (trimmed.match(/\d,$/)) {
      // Suppress if the next characters in the remaining text start with a digit
      if (remainingText && /^\d/.test(remainingText)) {
        return true;
      }
    }

    return false;
  }

  _flush(callback: TransformCallback): void {
    if (this.buffer.trim()) {
      this.push(this.buffer.trim());
    }
    this.buffer = '';
    callback();
  }

  reset(): void {
    this.buffer = '';
  }
}
