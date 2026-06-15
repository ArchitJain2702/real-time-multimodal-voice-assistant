import { BACKOFF_CONSTANTS } from '../config/constants';

/**
 * Returns the delay in milliseconds for attempt N (0-indexed).
 * attempt=0 → ~500ms, attempt=1 → ~1s, ... max ~30s + jitter.
 */
export function backoffDelay(attempt: number): number {
  const exp = Math.min(
    BACKOFF_CONSTANTS.BACKOFF_MAX_MS,
    BACKOFF_CONSTANTS.BACKOFF_BASE_MS * Math.pow(2, attempt)
  );
  const jitter = exp * BACKOFF_CONSTANTS.JITTER_FACTOR * Math.random();
  return Math.floor(exp + jitter);
}

/**
 * Sleep for `ms` milliseconds (abortable via AbortSignal).
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Sleep aborted'));
    });
  });
}
