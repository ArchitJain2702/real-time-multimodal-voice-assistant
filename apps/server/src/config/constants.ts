export const SESSION_CONSTANTS = {
  // Session TTL in seconds – matches the 30‑minute sliding window §4.2
  SESSION_TTL_SEC: 30 * 60,
  // JWT expires in 60‑minute window (string accepted by jose)
  JWT_EXPIRY_STR: '1h',
};

export const BACKOFF_CONSTANTS = {
  BACKOFF_BASE_MS: 500,
  BACKOFF_MAX_MS: 30_000,
  JITTER_FACTOR: 0.2,
};

export const CLAUSE_CONSTANTS = {
  CLAUSE_REGEX: /[^.!?,;:]+[.!?,;:]+/g,
  ABBREVIATIONS: ['dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'vs', 'etc', 'eg', 'ie'],
};
