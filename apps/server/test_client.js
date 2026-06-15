const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'auth', token: 'dev', sessionId: '123', clientVersion: '1' }));
  
  // Send fake PCM
  setInterval(() => {
    const buf = Buffer.alloc(100);
    // write seq
    buf.writeUInt32LE(1, 0);
    // rest is zeroes
    ws.send(buf);
  }, 100);
});
ws.on('message', (data) => console.log('msg', data.toString()));
