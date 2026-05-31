// ── Arena Builder ──────────────────────────────────────────────────────────────

const B_GRID_W  = 40;   // tile width  (px)
const B_GRID_H  = 20;   // tile height (px)
const B_TOP_Y   = 90;   // where tiles start (just below HUD)
const B_COLS    = Math.floor(C.W / B_GRID_W);                     // 20
const B_ROWS    = Math.floor((C.GROUND - B_TOP_Y) / B_GRID_H);    // 14

const B_SKY = [
  { top: '#1a1a2e', bot: '#0f3460', label: 'NIGHT'  },
  { top: '#87CEEB', bot: '#C8F0FF', label: 'DAY'    },
  { top: '#FF6B35', bot: '#FF9500', label: 'DUSK'   },
  { top: '#000008', bot: '#000828', label: 'SPACE'  },
  { top: '#0D2A0D', bot: '#1A5C1A', label: 'FOREST' },
  { top: '#2d1b00', bot: '#5a3600', label: 'DESERT' },
];

const B_GND = [
  { color: '#4A3728', line: '#5A4A38', label: 'DIRT'  },
  { color: '#C2A068', line: '#D4B87A', label: 'SAND'  },
  { color: '#3A5A3A', line: '#4A6A4A', label: 'GRASS' },
  { color: '#888888', line: '#999999', label: 'STONE' },
  { color: '#1A1A3A', line: '#2A2A5A', label: 'DARK'  },
];

// Draw function for a platform tile
function _drawPlatformTile(ctx, obs) {
  ctx.fillStyle = '#7B4A18';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  ctx.fillStyle = '#C8854A';
  ctx.fillRect(obs.x, obs.y, obs.w, 4);
  ctx.fillStyle = '#5A3410';
  ctx.fillRect(obs.x, obs.y + obs.h - 3, obs.w, 3);
}

// Draw function for an absorb tile
function _drawAbsorbTile(ctx, obs) {
  ctx.fillStyle = '#1A4A1A';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  ctx.fillStyle = '#3A9A3A';
  ctx.fillRect(obs.x, obs.y, obs.w, 4);
  ctx.fillStyle = '#00CC00';
  for (let i = 6; i < obs.w - 4; i += 9) {
    ctx.fillRect(obs.x + i, obs.y + 5, 4, 4);
  }
}

// Convert a saved slot to a live Arena object
function slotToArena(slot) {
  const sky = B_SKY[slot.skyIdx] || B_SKY[0];
  const gnd = B_GND[slot.gndIdx] || B_GND[0];
  const obstacles = [];

  for (const [key, type] of Object.entries(slot.tiles || {})) {
    const [col, row] = key.split(',').map(Number);
    const px = col * B_GRID_W;
    const py = B_TOP_Y + row * B_GRID_H;
    const drawFn = type === 'absorb' ? _drawAbsorbTile : _drawPlatformTile;
    obstacles.push(new Obstacle(px, py, B_GRID_W, B_GRID_H, drawFn,
      type === 'absorb' ? { absorb: true } : {}));
  }

  return new Arena({
    name: slot.name || 'CUSTOM',
    skyTop: sky.top,
    skyBot: sky.bot,
    groundColor: gnd.color,
    groundLine: gnd.line,
    obstacles,
    badge: '★ CUSTOM',
    badgeColor: 'rgba(255,215,0,0.9)',
    badgeTextColor: '#333',
    _custom: true,   // flag so we can remove them on reload
  });
}

// Refresh the tail of the ARENAS array with current saved custom arenas
function reloadCustomArenas() {
  while (ARENAS.length > 0 && ARENAS[ARENAS.length - 1]._custom) ARENAS.pop();
  try {
    const slots = JSON.parse(localStorage.getItem('dodgxel_builder_slots') || '[]');
    for (const slot of slots) ARENAS.push(slotToArena(slot));
  } catch {}
}

// ── ArenaBuilder class ────────────────────────────────────────────────────────
class ArenaBuilder {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.skyIdx   = 0;
    this.gndIdx   = 0;
    this.tiles    = {};   // "col,row" → 'platform' | 'absorb'
    this.tool     = 'platform';
    this._md      = false;   // mouse down
    this._erase   = false;   // right-click erase mode
    this.returnToMenu = false;
    this._msg     = '';      // status message
    this._msgTimer = 0;

    this._loadSlots();
    this._setupMouse();
  }

  // ── Mouse ────────────────────────────────────────────────────────────────
  _setupMouse() {
    this._onDown  = e => this._mouseDown(e);
    this._onMove  = e => this._mouseMove(e);
    this._onUp    = () => { this._md = false; };
    this._onCtx   = e => e.preventDefault();
    this.canvas.addEventListener('mousedown',   this._onDown);
    this.canvas.addEventListener('mousemove',   this._onMove);
    this.canvas.addEventListener('mouseup',     this._onUp);
    this.canvas.addEventListener('contextmenu', this._onCtx);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown',   this._onDown);
    this.canvas.removeEventListener('mousemove',   this._onMove);
    this.canvas.removeEventListener('mouseup',     this._onUp);
    this.canvas.removeEventListener('contextmenu', this._onCtx);
  }

  _cpos(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (C.W / r.width),
      y: (e.clientY - r.top)  * (C.H / r.height),
    };
  }

  _mouseDown(e) {
    const { x, y } = this._cpos(e);
    this._md    = true;
    this._erase = e.button === 2;

    if (y >= C.GROUND) {
      this._hitToolbar(x, y);
      this._md = false;
      return;
    }
    this._paint(x, y);
  }

  _mouseMove(e) {
    if (!this._md) return;
    const { x, y } = this._cpos(e);
    if (y < B_TOP_Y || y >= C.GROUND) return;
    this._paint(x, y);
  }

  _paint(x, y) {
    if (y < B_TOP_Y || y >= C.GROUND) return;
    const col = Math.floor(x / B_GRID_W);
    const row = Math.floor((y - B_TOP_Y) / B_GRID_H);
    if (col < 0 || col >= B_COLS || row < 0 || row >= B_ROWS) return;
    const key = `${col},${row}`;
    if (this._erase || this.tool === 'erase') delete this.tiles[key];
    else this.tiles[key] = this.tool;
  }

  // ── Toolbar hit-testing ───────────────────────────────────────────────────
  _hitToolbar(x, y) {
    const ty = y - C.GROUND;   // 0-80 within toolbar

    // ── Section 1: Tools (x 0-210) ──
    if (x < 210) {
      if (x < 70)        this.tool = 'platform';
      else if (x < 140)  this.tool = 'absorb';
      else               this.tool = 'erase';
      return;
    }

    // ── Section 2: Sky (x 210-400) ──
    if (x >= 210 && x < 400) {
      if (ty < 40) {
        // top half = sky ◄►
        if (x < 305) this.skyIdx = (this.skyIdx - 1 + B_SKY.length) % B_SKY.length;
        else         this.skyIdx = (this.skyIdx + 1) % B_SKY.length;
      } else {
        // bottom half = ground ◄►
        if (x < 305) this.gndIdx = (this.gndIdx - 1 + B_GND.length) % B_GND.length;
        else         this.gndIdx = (this.gndIdx + 1) % B_GND.length;
      }
      return;
    }

    // ── Section 3: Actions (x 400-800) ──
    if (x >= 400 && x < 540)  { this._clear(); return; }
    if (x >= 540 && x < 670)  { this._save();  return; }
    if (x >= 670 && x < 760)  { this._loadLast(); return; }
    if (x >= 760)              { this.destroy(); this.returnToMenu = true; }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  _clear() {
    this.tiles = {};
    this._flash('Cleared!');
  }

  _save() {
    const rawName = prompt('Name your arena (max 18 chars):', 'MY ARENA');
    if (!rawName) return;
    const name = rawName.toUpperCase().slice(0, 18) || 'MY ARENA';
    const slot = {
      name,
      skyIdx: this.skyIdx,
      gndIdx: this.gndIdx,
      tiles: { ...this.tiles },
    };
    this._slots.push(slot);
    if (this._slots.length > 6) this._slots.shift();
    this._saveSlots();
    reloadCustomArenas();
    this._flash(`"${name}" saved!`);
  }

  _loadLast() {
    if (!this._slots.length) { this._flash('No saved arenas yet.'); return; }
    const slot = this._slots[this._slots.length - 1];
    this.skyIdx = slot.skyIdx ?? 0;
    this.gndIdx = slot.gndIdx ?? 0;
    this.tiles  = { ...slot.tiles };
    this._flash(`Loaded "${slot.name}"`);
  }

  _flash(msg) {
    this._msg      = msg;
    this._msgTimer = 2200;
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  _loadSlots() {
    try { this._slots = JSON.parse(localStorage.getItem('dodgxel_builder_slots') || '[]'); }
    catch { this._slots = []; }
  }
  _saveSlots() {
    try { localStorage.setItem('dodgxel_builder_slots', JSON.stringify(this._slots)); }
    catch {}
  }

  // ── Update ───────────────────────────────────────────────────────────────
  update(dt) {
    if (this._msgTimer > 0) this._msgTimer -= dt;
    if (Input.wasPressed('Escape')) { this.destroy(); this.returnToMenu = true; }
  }

  // ── Draw ─────────────────────────────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, C.W, C.H);
    this._drawBg(ctx);
    this._drawGrid(ctx);
    this._drawTiles(ctx);
    this._drawPlayerMarkers(ctx);
    this._drawToolbar(ctx);
    if (this._msgTimer > 0) this._drawMsg(ctx);
  }

  _drawBg(ctx) {
    const sky = B_SKY[this.skyIdx];
    const gnd = B_GND[this.gndIdx];
    const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.W, C.GROUND);
    ctx.fillStyle = gnd.color;
    ctx.fillRect(0, C.GROUND, C.W, C.H - C.GROUND);
    ctx.fillStyle = gnd.line;
    ctx.fillRect(0, C.GROUND, C.W, 6);
  }

  _drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= B_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * B_GRID_W, B_TOP_Y);
      ctx.lineTo(c * B_GRID_W, C.GROUND);
      ctx.stroke();
    }
    for (let r = 0; r <= B_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, B_TOP_Y + r * B_GRID_H);
      ctx.lineTo(C.W, B_TOP_Y + r * B_GRID_H);
      ctx.stroke();
    }
  }

  _drawTiles(ctx) {
    for (const [key, type] of Object.entries(this.tiles)) {
      const [col, row] = key.split(',').map(Number);
      const px = col * B_GRID_W, py = B_TOP_Y + row * B_GRID_H;
      const fakeObs = { x: px, y: py, w: B_GRID_W, h: B_GRID_H };
      if (type === 'platform') _drawPlatformTile(ctx, fakeObs);
      else                     _drawAbsorbTile(ctx, fakeObs);
    }
  }

  _drawPlayerMarkers(ctx) {
    // Ghost outlines showing where players will start
    ctx.globalAlpha = 0.18;
    Sprites.drawBoy( ctx, 130,  C.GROUND, 'idle',  1, Math.PI / 8, false);
    Sprites.drawGirl(ctx, 670, C.GROUND, 'idle', -1, Math.PI / 8, false);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.COL.P1_HUD;
    ctx.font = '8px "Courier New"'; ctx.textAlign = 'center';
    ctx.fillText('P1', 130, C.GROUND - 50);
    ctx.fillStyle = C.COL.P2_HUD;
    ctx.fillText('P2', 670, C.GROUND - 50);
    ctx.textAlign = 'left';
  }

  _drawToolbar(ctx) {
    const ty = C.GROUND;  // toolbar top y
    const th = C.H - ty;  // toolbar height (~80)

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, ty, C.W, th);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, ty, C.W, 1);

    ctx.textAlign = 'center';

    // ── Tools (x 0-210) ──
    const toolDefs = [
      { key: 'platform', label: 'PLATFORM', col: '#C8854A', x: 35 },
      { key: 'absorb',   label: 'ABSORB',   col: '#3A9A3A', x: 105 },
      { key: 'erase',    label: 'ERASE',    col: '#888888', x: 175 },
    ];
    for (const t of toolDefs) {
      const sel = this.tool === t.key;
      ctx.fillStyle = sel ? t.col : '#1A1A1A';
      ctx.fillRect(t.x - 32, ty + 8, 64, th - 16);
      ctx.strokeStyle = sel ? t.col : '#333';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(t.x - 32, ty + 8, 64, th - 16);
      ctx.fillStyle = sel ? '#fff' : '#666';
      ctx.font = `${sel ? 'bold ' : ''}9px "Courier New"`;
      ctx.fillText(t.label, t.x, ty + th / 2 + 4);
      if (sel) {
        ctx.fillStyle = t.col; ctx.font = '6px "Courier New"';
        ctx.fillText('ACTIVE', t.x, ty + th - 10);
      }
    }

    // Divider
    ctx.fillStyle = '#333';
    ctx.fillRect(212, ty + 6, 1, th - 12);

    // ── Sky / Ground (x 214-398) ──
    const sky = B_SKY[this.skyIdx];
    const gnd = B_GND[this.gndIdx];
    const mid = 306;

    // Sky row (top half)
    ctx.fillStyle = '#111'; ctx.fillRect(214, ty + 4, 184, th / 2 - 6);
    const sg = ctx.createLinearGradient(222, 0, 290, 0);
    sg.addColorStop(0, sky.top); sg.addColorStop(1, sky.bot);
    ctx.fillStyle = sg; ctx.fillRect(222, ty + 8, 68, th / 2 - 14);
    ctx.fillStyle = '#aaa'; ctx.font = '9px "Courier New"';
    ctx.fillText('SKY: ' + sky.label, mid + 22, ty + th / 4 + 4);
    ctx.fillStyle = '#555';
    ctx.fillText('◄', 218, ty + th / 4 + 4);
    ctx.fillText('►', mid + 76, ty + th / 4 + 4);

    // Ground row (bottom half)
    ctx.fillStyle = '#111'; ctx.fillRect(214, ty + th / 2 + 2, 184, th / 2 - 6);
    ctx.fillStyle = gnd.color; ctx.fillRect(222, ty + th / 2 + 6, 68, th / 2 - 14);
    ctx.fillStyle = '#aaa'; ctx.font = '9px "Courier New"';
    ctx.fillText('GND: ' + gnd.label, mid + 22, ty + 3 * th / 4 + 4);
    ctx.fillStyle = '#555';
    ctx.fillText('◄', 218, ty + 3 * th / 4 + 4);
    ctx.fillText('►', mid + 76, ty + 3 * th / 4 + 4);

    // Divider
    ctx.fillStyle = '#333'; ctx.fillRect(400, ty + 6, 1, th - 12);

    // ── Action buttons (x 402-800) ──
    const actions = [
      { label: 'CLEAR',    x: 470, col: '#442222' },
      { label: 'SAVE',     x: 605, col: '#224422' },
      { label: 'LOAD',     x: 717, col: '#222244' },
      { label: '← BACK',  x: 780, col: '#333333' },
    ];
    // Recalculate widths to fit
    const actionData = [
      { label: 'CLEAR',   x: 402, w: 130, col: '#442222' },
      { label: 'SAVE',    x: 534, w: 130, col: '#1A3A1A' },
      { label: 'LOAD',    x: 666, w: 68,  col: '#1A1A3A' },
      { label: '← BACK', x: 736, w: 62,  col: '#2A2A2A' },
    ];
    for (const a of actionData) {
      ctx.fillStyle = a.col;
      ctx.fillRect(a.x + 2, ty + 8, a.w - 4, th - 16);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
      ctx.strokeRect(a.x + 2, ty + 8, a.w - 4, th - 16);
      ctx.fillStyle = '#ccc'; ctx.font = 'bold 10px "Courier New"';
      ctx.fillText(a.label, a.x + a.w / 2, ty + th / 2 + 4);
    }

    // Builder title
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 8px "Courier New"';
    ctx.fillText('ARENA BUILDER  ·  click/drag to place  ·  right-click to erase', C.W / 2, ty - 4);

    ctx.textAlign = 'left';
  }

  _drawMsg(ctx) {
    const alpha = Math.min(1, this._msgTimer / 400);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(C.W / 2 - 160, C.H / 2 - 20, 320, 40);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(this._msg, C.W / 2, C.H / 2 + 5);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
