const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/ws');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'dev-placeholder-token',
    sessionId: '123',
    clientVersion: '1.0.0'
  }));
});
ws.on('error', console.error);
ws.on('close', console.log);
