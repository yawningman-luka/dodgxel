// ── Dodgxel WebSocket Relay Server ────────────────────────────────────────────
// Serves the game files over HTTP AND manages real-time relay rooms.
// Run:  node server.js        (default port 8080)
//       PORT=3000 node server.js
//
// How rooms work:
//   1. P1 connects → sends { type:'create' } → receives { type:'created', code:'ABCD', player:0 }
//   2. P2 connects → sends { type:'join', code:'ABCD' } → receives { type:'joined', code:'ABCD', player:1 }
//   3. P1 receives { type:'opponent_joined' }
//   4. Each frame both clients send { type:'relay', type:'input', inp:{...} }
//   5. Server relays every 'relay' packet to the opponent
//   6. On disconnect, opponent receives { type:'opponent_left' }
// ─────────────────────────────────────────────────────────────────────────────

const WebSocket = require('ws');
const http      = require('http');
const fs        = require('fs');
const path      = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;   // serve static files from same directory

// ── Static file server ────────────────────────────────────────────────────────
const MIME = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon',
};

const httpServer = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);
  // Security: don't allow path traversal
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain',
                         'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ── Room registry ─────────────────────────────────────────────────────────────
const rooms = {};  // code → { p1: ws|null, p2: ws|null }

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function uniqueCode() {
  let c; let tries = 0;
  do { c = makeCode(); tries++; } while (rooms[c] && tries < 50);
  return c;
}

// ── WebSocket server ──────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', ws => {
  ws._room  = null;
  ws._pIdx  = -1;

  function send(obj) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function getOpponent() {
    const r = rooms[ws._room];
    if (!r) return null;
    const other = ws._pIdx === 0 ? r.p2 : r.p1;
    return other && other.readyState === WebSocket.OPEN ? other : null;
  }

  function relay(obj) {
    const opp = getOpponent();
    if (opp) opp.send(JSON.stringify(obj));
  }

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'create': {
        const code = uniqueCode();
        rooms[code] = { p1: ws, p2: null };
        ws._room = code;
        ws._pIdx = 0;
        send({ type: 'created', code, player: 0 });
        console.log(`[+] Room ${code} created`);
        break;
      }

      case 'join': {
        const code = (msg.code || '').toUpperCase().trim();
        const room = rooms[code];
        if (!room)       { send({ type: 'error', msg: `Room "${code}" not found` }); return; }
        if (room.p2)     { send({ type: 'error', msg: 'Room is already full' });     return; }
        room.p2  = ws;
        ws._room = code;
        ws._pIdx = 1;
        send({ type: 'joined', code, player: 1 });
        room.p1.send(JSON.stringify({ type: 'opponent_joined' }));
        console.log(`[+] Room ${code} P2 joined`);
        break;
      }

      case 'relay': {
        // Forward anything relay-tagged to the opponent (strip outer 'relay' wrapper)
        const { type: _t, ...payload } = msg;  // eslint-disable-line no-unused-vars
        relay({ ...payload, from: ws._pIdx });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!ws._room) return;
    console.log(`[-] Room ${ws._room} P${ws._pIdx + 1} disconnected`);
    relay({ type: 'opponent_left' });
    delete rooms[ws._room];
  });

  ws.on('error', () => {});
});

// ── Heartbeat: clean up dead sockets every 30s ───────────────────────────────
setInterval(() => {
  for (const [code, room] of Object.entries(rooms)) {
    const dead = (ws) => !ws || ws.readyState === WebSocket.CLOSED;
    if (dead(room.p1) && dead(room.p2)) {
      delete rooms[code];
      console.log(`[~] Room ${code} cleaned up`);
    }
  }
}, 30_000);

httpServer.listen(PORT, () => {
  console.log(`🏐 Dodgxel server  →  http://localhost:${PORT}`);
  console.log(`🔌 WebSocket       →  ws://localhost:${PORT}`);
  console.log('   (share your LAN IP for local multiplayer)');
});
