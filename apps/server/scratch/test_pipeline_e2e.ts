import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const WS_URL = 'ws://localhost:3000/ws';
const WAV_PATH = path.join(__dirname, 'speech_16000_mono.wav');

function resample8kTo16k(pcm8k: Buffer): Buffer {
  const pcm16k = Buffer.alloc(pcm8k.length * 2);
  for (let i = 0; i < pcm8k.length; i += 2) {
    if (i + 1 >= pcm8k.length) break;
    const sample = pcm8k.readInt16LE(i);
    pcm16k.writeInt16LE(sample, i * 2);
    pcm16k.writeInt16LE(sample, i * 2 + 2);
  }
  return pcm16k;
}

async function runTest() {
  console.log(`[Test] Reading WAV file: ${WAV_PATH}`);
  const wavBuffer = fs.readFileSync(WAV_PATH);
  
  // Skip WAV header (44 bytes)
  const rawPcm8k = wavBuffer.subarray(44);
  console.log(`[Test] Original 8kHz PCM Data length: ${rawPcm8k.length} bytes`);

  // Resample to 16kHz
  const pcmData = resample8kTo16k(rawPcm8k);
  console.log(`[Test] Resampled 16kHz PCM Data length: ${pcmData.length} bytes`);

  console.log(`[Test] Connecting to WebSocket: ${WS_URL}`);
  const ws = new WebSocket(WS_URL);

  let seq = 0;
  let timer: NodeJS.Timeout | null = null;
  const chunkSize = 3200; // 100ms at 16kHz 16-bit mono PCM

  ws.on('open', () => {
    console.log(`[Test][${new Date().toISOString()}] WebSocket connection opened`);
    // Send auth
    const authMsg = {
      type: 'auth',
      token: 'dev-placeholder-token',
      sessionId: 'test-session-e2e-1234',
      clientVersion: '1.0.0'
    };
    console.log(`[Test][${new Date().toISOString()}] Sending auth message:`, authMsg);
    ws.send(JSON.stringify(authMsg));
  });

  let turnCount = 0;
  let firstTurnId = '';
  let secondTurnId = '';
  let binaryCounts: Record<string, number> = {};
  let isStreaming = false;
  let hasCompletedFirstTurn = false;

  ws.on('message', (data, isBinary) => {
    const timestamp = new Date().toISOString();
    if (isBinary) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      const outSeq = buf.readUInt32LE(0);
      const activeTurn = !hasCompletedFirstTurn ? 'turn_1' : 'turn_2';
      binaryCounts[activeTurn] = (binaryCounts[activeTurn] || 0) + 1;
      console.log(`[Test][${timestamp}] [BINARY AUDIO RECEIVED] Turn: ${activeTurn}, Seq: ${outSeq}, Size: ${buf.length - 4} bytes (total including header: ${buf.length} bytes)`);
    } else {
      const text = data.toString();
      try {
        const json = JSON.parse(text);
        console.log(`[Test][${timestamp}] [JSON EVENT RECEIVED] Type: ${json.type}`, JSON.stringify(json, null, 2));

        if (json.type === 'auth_ok') {
          console.log(`[Test][${timestamp}] Auth successful. Starting Turn 1 real-time PCM stream...`);
          startStreaming();
        } else if (json.type === 'turn_complete') {
          if (!isStreaming) {
            if (!hasCompletedFirstTurn) {
              hasCompletedFirstTurn = true;
              firstTurnId = json.turnId;
              console.log(`[Test][${timestamp}] Turn 1 Complete! ID: ${firstTurnId}`);
              console.log(`[Test][${timestamp}] Waiting 2000ms before starting Turn 2 real-time PCM stream...`);
              setTimeout(() => {
                console.log(`[Test][${timestamp}] Starting Turn 2 real-time PCM stream...`);
                startStreaming();
              }, 2000);
            } else if (json.turnId !== firstTurnId && !secondTurnId) {
              secondTurnId = json.turnId;
              console.log(`[Test][${timestamp}] Turn 2 Complete! ID: ${secondTurnId}`);
              console.log(`[Test][${timestamp}] Both turns complete!`);
              console.log(`[Test] Turn 1 ID: ${firstTurnId}, Chunks received: ${binaryCounts['turn_1'] || 0}`);
              console.log(`[Test] Turn 2 ID: ${secondTurnId}, Chunks received: ${binaryCounts['turn_2'] || 0}`);
              setTimeout(() => {
                console.log(`[Test] Closing WebSocket connection.`);
                ws.close();
              }, 1000);
            }
          } else {
            console.log(`[Test][${timestamp}] Ignored turn_complete event because stream is still in-progress`);
          }
        }
      } catch (err) {
        console.log(`[Test][${timestamp}] [TEXT RECEIVED (non-JSON)]`, text);
      }
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[Test][${new Date().toISOString()}] WebSocket closed. Code: ${code}, Reason: ${reason}`);
    if (timer) clearInterval(timer);
  });

  ws.on('error', (err) => {
    console.error(`[Test][${new Date().toISOString()}] WebSocket error:`, err);
  });

  function startStreaming() {
    let offset = 0;
    isStreaming = true;
    
    timer = setInterval(() => {
      if (offset >= pcmData.length) {
        clearInterval(timer!);
        timer = null;
        console.log(`[Test][${new Date().toISOString()}] Finished streaming PCM. Waiting 1000ms before sending speech_completed...`);
        setTimeout(() => {
          const completedMsg = {
            type: 'speech_completed',
            turnId: 'test-turn-e2e-1234'
          };
          console.log(`[Test][${new Date().toISOString()}] Sending speech_completed message:`, completedMsg);
          ws.send(JSON.stringify(completedMsg));
          isStreaming = false;
        }, 1000);
        return;
      }

      // Read chunk
      const pcmChunk = pcmData.subarray(offset, Math.min(offset + chunkSize, pcmData.length));
      offset += pcmChunk.length;

      // Create packet: [4-byte seq][PCM bytes]
      const packet = Buffer.alloc(4 + pcmChunk.length);
      packet.writeUInt32LE(seq, 0);
      pcmChunk.copy(packet, 4);

      ws.send(packet);
      console.log(`[Test][${new Date().toISOString()}] Sent PCM chunk #${seq} (${pcmChunk.length} bytes PCM)`);
      seq++;
    }, 100);
  }
}

runTest().catch(console.error);
