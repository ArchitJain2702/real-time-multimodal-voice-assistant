import client from 'prom-client';

// Initialise default Node.js process metrics (heap, GC, event loop lag)
client.collectDefaultMetrics();

// ── Histograms (latency distributions) ────────────────────────────────────
export const asrLatencyHist = new client.Histogram({
  name: 'asr_final_latency_ms',
  help: 'Time from mic chunk to Deepgram speech_final event (ms)',
  buckets: [50, 100, 150, 200, 300, 500],
});

export const llmTtftHist = new client.Histogram({
  name: 'llm_ttft_ms',
  help: 'Time to first LLM token (ms)',
  buckets: [50, 80, 100, 150, 200, 500],
});

export const ttsTtfbHist = new client.Histogram({
  name: 'tts_ttfb_ms',
  help: 'Time to first audio byte from Cartesia (ms)',
  buckets: [30, 60, 100, 150, 200, 500],
});

export const e2eLatencyHist = new client.Histogram({
  name: 'e2e_latency_ms',
  help: 'End-to-end latency: mic end → first audio sent to client (ms)',
  buckets: [300, 500, 800, 1200, 2000],
});

// ── Counters ──────────────────────────────────────────────────────────────
export const interruptCounter = new client.Counter({
  name: 'interruptions_total',
  help: 'Number of VAD-triggered interruptions',
});

export const pipelineErrorCounter = new client.Counter({
  name: 'pipeline_errors_total',
  help: 'Number of pipeline errors by service and code',
  labelNames: ['service', 'code'],
});

// ── Gauges ────────────────────────────────────────────────────────────────
export const activeSessionsGauge = new client.Gauge({
  name: 'active_sessions',
  help: 'Current number of open WebSocket sessions',
});

export const metricsRegistry = client.register;
