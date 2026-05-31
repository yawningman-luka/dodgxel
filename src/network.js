// ── Dodgxel NetworkManager ────────────────────────────────────────────────────
// Relay-based online: both clients send semantic input; server relays to the
// opponent. Both clients run the same deterministic physics simulation.
// ─────────────────────────────────────────────────────────────────────────────

const NetworkManager = {
  ws:            null,
  connected:     false,
  connecting:    false,
  roomCode:      null,
  playerIndex:   -1,        // 0 = host (P1), 1 = joiner (P2)
  opponentReady: false,

  // Semantic input received from opponent this frame
  _oppCurr: { left:false, right:false, jump:false, crouch:false,
               throw:false, catch:false, shield:false, aimUp:false, aimDown:false },
  _oppPrev: {},

  // Callbacks
  onConnected:      null,  // ()
  onRoomCreated:    null,  // (code)
  onRoomJoined:     null,  // (code)
  onOpponentJoined: null,  // ()
  onOpponentLeft:   null,  // ()
  onError:          null,  // (msg)

  // ── Connection ────────────────────────────────────────────────────────────
  connect(serverUrl) {
    if (this.ws) this.disconnect();
    this.connecting = true;
    try {
      this.ws = new WebSocket(serverUrl);
    } catch(e) {
      this.connecting = false;
      if (this.onError) this.onError('Could not reach server');
      return;
    }
    this.ws.onopen  = () => { this.connected = true; this.connecting = false; if (this.onConnected) this.onConnected(); };
    this.ws.onclose = () => { this.connected = false; this.connecting = false; };
    this.ws.onerror = () => { this.connecting = false; if (this.onError) this.onError('Connection failed'); };
    this.ws.onmessage = e => {
      let msg; try { msg = JSON.parse(e.data); } catch { return; }
      this._handle(msg);
    };
  },

  disconnect() {
    if (this.ws) { try { this.ws.close(); } catch {} this.ws = null; }
    this.connected = false; this.connecting = false;
    this.roomCode = null; this.playerIndex = -1; this.opponentReady = false;
    this._oppCurr = {}; this._oppPrev = {};
  },

  // ── Room management ───────────────────────────────────────────────────────
  createRoom() { this._send({ type: 'create' }); },
  joinRoom(code) { this._send({ type: 'join', code: code.toUpperCase().trim() }); },

  // ── Per-frame: send our semantic input ────────────────────────────────────
  sendInput() {
    if (!this.opponentReady) return;
    const k1 = Controls.p1;  // our local binding
    const inp = {
      left:    Input.isDown(k1.left),
      right:   Input.isDown(k1.right),
      jump:    Input.wasPressed(k1.jump),
      crouch:  Input.isDown(k1.crouch),
      throw:   Input.isDown(k1.throw),
      catch:   Input.wasPressed(k1.catch),
      shield:  Input.wasPressed(k1.shield),
      aimUp:   Input.isDown(k1.jump),   // same key used for aim when throwing
      aimDown: Input.isDown(k1.crouch),
    };
    this._relay({ type: 'input', inp });
  },

  // ── Advance frame: swap prev/curr so wasPressed works ─────────────────────
  tick() {
    this._oppPrev = { ...this._oppCurr };
  },

  // ── Remote player input accessor (used by Player) ─────────────────────────
  get remoteInput() {
    const c = this._oppCurr, p = this._oppPrev;
    return {
      left:    c.left,
      right:   c.right,
      crouch:  c.crouch,
      throw:   c.throw,
      aimUp:   c.aimUp,
      aimDown: c.aimDown,
      jump:    c.jump   && !p.jump,
      catch:   c.catch  && !p.catch,
      shield:  c.shield && !p.shield,
    };
  },

  // ── Internals ─────────────────────────────────────────────────────────────
  _relay(msg) { this._send({ type: 'relay', ...msg }); },
  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(msg));
  },

  _handle(msg) {
    switch (msg.type) {
      case 'created':
        this.roomCode = msg.code; this.playerIndex = 0;
        if (this.onRoomCreated) this.onRoomCreated(msg.code);
        break;
      case 'joined':
        this.roomCode = msg.code; this.playerIndex = 1;
        if (this.onRoomJoined) this.onRoomJoined(msg.code);
        break;
      case 'opponent_joined':
        this.opponentReady = true;
        if (this.onOpponentJoined) this.onOpponentJoined();
        break;
      case 'opponent_left':
        this.opponentReady = false;
        if (this.onOpponentLeft) this.onOpponentLeft();
        break;
      case 'input':
        this._oppPrev = { ...this._oppCurr };
        this._oppCurr = msg.inp || {};
        break;
      case 'error':
        if (this.onError) this.onError(msg.msg || 'Server error');
        break;
    }
  },
};
