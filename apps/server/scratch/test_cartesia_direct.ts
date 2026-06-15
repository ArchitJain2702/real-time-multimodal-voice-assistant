import { CartesiaClient } from '@cartesia/cartesia-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.CARTESIA_API_KEY;
if (!apiKey) {
  console.error('CARTESIA_API_KEY is not set in .env');
  process.exit(1);
}

async function testCartesia() {
  console.log('Initializing CartesiaClient...');
  const client = new CartesiaClient({ apiKey });

  console.log('Connecting to WebSocket...');
  const ws = client.tts.websocket({
    container: 'raw',
    encoding: 'pcm_s16le',
    sampleRate: 16000,
  });

  await ws.connect();
  console.log('Connected!');

  const voiceId = 'e00d0e4c-a5c8-443f-a8a3-473eb9a62355'; // Friendly Sidekick
  const modelId = 'sonic-3.5';

  console.log('Sending synthesis request...');
  const response = await ws.send({
    modelId,
    voice: {
      mode: 'id',
      id: voiceId,
    },
    transcript: 'Hello, this is a test of Cartesia voice assistant.',
    contextId: 'test-context-1234',
  });

  console.log('Listening for events...');
  response.on('message', (messageStr: string) => {
    console.log('--- RECEIVED EVENT "message" ---');
    console.log('Type of message:', typeof messageStr);
    console.log('Message string:', messageStr.substring(0, 150) + (messageStr.length > 150 ? '...' : ''));
    try {
      const parsed = JSON.parse(messageStr);
      console.log('Parsed properties:', Object.keys(parsed));
      console.log('parsed.type:', parsed.type);
      console.log('parsed.done:', parsed.done);
      if (parsed.data) {
        console.log('parsed.data length:', parsed.data.length);
      }
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  });

  // Keep alive for 5 seconds to receive all chunks
  await new Promise((resolve) => setTimeout(resolve, 5000));
  
  console.log('Disconnecting...');
  ws.disconnect();
  console.log('Done!');
}

testCartesia().catch(console.error);
