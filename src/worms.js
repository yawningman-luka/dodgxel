// ── Salvo — turn-based dodgeball mode ────────────────────────────────────────
// 3 actions per turn. Movement = preview → commit. Jump = 1 AP instant.
// Throw = free, always ends the turn.
// World is 3× canvas width with horizontal camera scroll.
// ─────────────────────────────────────────────────────────────────────────────

const WORMS_WORLD_W = C.W * 3;   // 2400px
const AP_MAX        = 3;
const STEP_DIST     = 100;        // pixels per committed step

// ── Platform draw helpers ─────────────────────────────────────────────────────

function _drawBunkerPlatform(ctx, obs) {
  ctx.fillStyle = '#2E2E3E';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  ctx.fillStyle = '#3E3E50';
  ctx.fillRect(obs.x, obs.y, obs.w, 5);
  ctx.fillStyle = '#1E1E2A';
  ctx.fillRect(obs.x, obs.y + obs.h - 4, obs.w, 4);
  ctx.fillStyle = '#55557A';
  for (let i = 8; i < obs.w - 4; i += 22) ctx.fillRect(obs.x + i, obs.y + 7, 5, 5);
}

function _drawDesertRock(ctx, obs) {
  // Sandstone base
  ctx.fillStyle = '#B8863A';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  // Worn sun-bleached top
  ctx.fillStyle = '#D4A85A';
  ctx.fillRect(obs.x, obs.y, obs.w, 5);
  // Shadow underside
  ctx.fillStyle = '#7A5518';
  ctx.fillRect(obs.x, obs.y + obs.h - 4, obs.w, 4);
  // Horizontal strata lines
  ctx.fillStyle = '#8B6220';
  for (let i = 8; i < obs.h - 5; i += 8) {
    ctx.fillRect(obs.x + 3, obs.y + i, obs.w - 6, 1);
  }
  // Vertical crack (deterministic from position)
  ctx.fillStyle = '#6A4010';
  if (obs.w > 40) {
    const cx = obs.x + ((obs.x * 7 + obs.y * 13) % Math.max(1, obs.w - 24)) + 12;
    ctx.fillRect(cx, obs.y + 5, 1, obs.h - 9);
  }
}

function _drawForestBranch(ctx, obs) {
  ctx.fillStyle = '#5A3310';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  ctx.fillStyle = '#7A4A20';
  ctx.fillRect(obs.x, obs.y, obs.w, 5);
  ctx.fillStyle = '#2A6A2A';
  for (let i = 4; i < obs.w - 12; i += 26) {
    ctx.beginPath();
    ctx.ellipse(obs.x + i + 14, obs.y - 5, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1A5A1A';
  for (let i = 14; i < obs.w - 8; i += 26) {
    ctx.beginPath();
    ctx.ellipse(obs.x + i + 6, obs.y - 9, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Map definitions (2400px wide) ─────────────────────────────────────────────

function _makeBunkerMap() {
  const mk = (x, y, w) => new Obstacle(x, y, w, 18, _drawBunkerPlatform);
  const W = WORMS_WORLD_W;
  return {
    name: '🏚️ UNDERGROUND BUNKER',
    skyTop: '#0E0E30', skyBot: '#1C2060',
    groundColor: '#1A1A2E', groundLine: '#2A2A4A',
    p1Start: [90,  148],
    p2Start: [W - 90, 148],
    obstacles: [
      // Left flank
      mk(0,    148, 200),   mk(250, 220, 150),  mk(120, 300, 170),
      mk(420,  148, 140),   mk(390, 240, 160),
      // Centre-left
      mk(620,  175, 160),   mk(750, 268, 140),  mk(880, 140, 120),
      // Centre
      mk(1050, 200, 300),   mk(1100,300, 170),
      // Centre-right (mirror)
      mk(W-1040, 140, 120), mk(W-890, 268, 140), mk(W-780, 175, 160),
      // Right flank (mirror of left)
      mk(W-560, 240, 160),  mk(W-560, 148, 140),
      mk(W-290, 300, 170),  mk(W-400, 220, 150),
      mk(W-200, 148, 200),
    ],
  };
}

function _makeForestMap() {
  const mk = (x, y, w) => new Obstacle(x, y, w, 18, _drawForestBranch);
  const W = WORMS_WORLD_W;
  return {
    name: '🌲 FOREST CANOPY',
    skyTop: '#0D2A0D', skyBot: '#1A5A1A',
    groundColor: '#3A5A1A', groundLine: '#4A6A2A',
    p1Start: [70,  118],
    p2Start: [W - 70, 118],
    obstacles: [
      // Left
      mk(0,   116, 180),  mk(220, 190, 130),  mk(70,  265, 140),
      mk(420, 130, 120),  mk(360, 218, 150),  mk(560, 168, 130),
      // Centre-left
      mk(720, 142, 160),  mk(670, 245, 140),  mk(870, 192, 120),
      // Centre
      mk(1050, 160, 300), mk(1100, 275, 180),
      // Centre-right
      mk(W-990, 192, 120), mk(W-810, 245, 140), mk(W-880, 142, 160),
      // Right (mirror)
      mk(W-690, 168, 130), mk(W-510, 218, 150), mk(W-540, 130, 120),
      mk(W-210, 265, 140), mk(W-350, 190, 130), mk(W-180, 116, 180),
    ],
  };
}

function _makeDesertMap() {
  const rock = (x, y, w, h = 22) => new Obstacle(x, y, w, h, _drawDesertRock);
  const W = WORMS_WORLD_W;
  return {
    name: '🏜️ SCORCHED DESERT',
    skyTop: '#5B8FCA', skyBot: '#E8A83A',
    groundColor: '#C4903A', groundLine: '#A07028',
    p1Start: [90,  148],
    p2Start: [W - 90, 148],
    obstacles: [
      // Left flank — tall pillar cluster
      rock(0,    148, 210, 26), rock(30,   106, 150, 22), rock(80,   72,  90, 18),
      rock(250,  200, 140, 22), rock(120,  285, 170, 18),
      // Left-centre formations
      rock(420,  148, 130, 26), rock(460,  104, 65,  22),
      rock(620,  175, 155, 22), rock(660,  133, 80,  18),
      rock(790,  260, 130, 18), rock(870,  152, 110, 22),
      // Centre mesa — layered sandstone butte
      rock(1040, 195, 320, 26), rock(1060, 153, 190, 22), rock(1100, 113, 100, 18),
      // Centre-right (mirror)
      rock(W - 1360, 195, 320, 26), rock(W - 1250, 153, 190, 22), rock(W - 1200, 113, 100, 18),
      // Right-centre
      rock(W - 980, 152, 110, 22), rock(W - 920,  260, 130, 18),
      rock(W - 815, 133, 80,  18), rock(W - 775,  175, 155, 22),
      // Right flank — mirror of left
      rock(W - 550, 104, 65,  22), rock(W - 550,  148, 130, 26),
      rock(W - 290, 285, 170, 18), rock(W - 390,  200, 140, 22),
      rock(W - 210, 148, 210, 26), rock(W - 180,  106, 150, 22), rock(W - 170, 72, 90, 18),
    ],
  };
}

const WORMS_MAPS = [ _makeBunkerMap(), _makeForestMap(), _makeDesertMap() ];

// ── WormsGame ─────────────────────────────────────────────────────────────────

class WormsGame {
  constructor(canvas, mapIndex, p1Data, p2Data) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    const map = WORMS_MAPS[mapIndex % WORMS_MAPS.length];
    this._map = map;

    this._arena = new Arena({
      name: map.name,
      skyTop: map.skyTop, skyBot: map.skyBot,
      groundColor: map.groundColor, groundLine: map.groundLine,
      obstacles: map.obstacles,
    });

    // Players
    this.p1 = new Player(0, map.p1Start[0], Controls.p1);
    this.p2 = new Player(1, map.p2Start[0], Controls.p2);
    this.p1.y = map.p1Start[1];
    this.p2.y = map.p2Start[1];
    this.p1.noMidline = true; this.p2.noMidline = true;
    this.p1.hordeMode = false; this.p2.hordeMode = false;

    if (p1Data) { this.p1.signaturePower=p1Data.signaturePower; this.p1.charColors=p1Data.charColors; this.p1.charType=p1Data.charType; this.p1.charName=p1Data.charName; }
    if (p2Data) { this.p2.signaturePower=p2Data.signaturePower; this.p2.charColors=p2Data.charColors; this.p2.charType=p2Data.charType; this.p2.charName=p2Data.charName; }

    this.p1.hitCallback = (v) => this._onHit(v);
    this.p2.hitCallback = (v) => this._onHit(v);

    this.p1.hp = 3; this.p2.hp = 3;

    this.ball  = new Ball();
    this.ball2 = null;

    // Camera
    this.camX  = 0;
    this._camTarget = 0;

    // Turn state
    this.turn      = 0;
    this._phase    = 'intro';
    this._introTimer = 900;
    this._endTimer   = 0;
    this._apLeft     = AP_MAX;
    this._preview    = null; // { dir, destX } or null

    this._winner = -1;
    this.returnToMenu = false;

    this._giveActiveBall();
    this._snapCamera();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get _active()   { return this.turn === 0 ? this.p1 : this.p2; }
  get _inactive() { return this.turn === 0 ? this.p2 : this.p1; }

  _snapCamera() {
    this.camX = this._clampCam(this._active.x - C.W / 2);
    this._camTarget = this.camX;
  }

  _clampCam(x) { return Math.max(0, Math.min(WORMS_WORLD_W - C.W, x)); }

  _giveActiveBall() {
    this.ball.reset(this.turn);
    this.ball.worldW = WORMS_WORLD_W;
    const p = this._active;
    p.hasBall = true; this._inactive.hasBall = false;
    this.ball2 = null; Particles.clear();
  }

  _onHit(victim) {
    victim.hp = Math.max(0, victim.hp - 1);
    Particles.emit(victim.x, victim.y - 22, 20,
      ['#FF4444','#FF8888','#FFD700','#fff'], { upBias:2, maxSpeed:4 });
    this._phase = victim.hp <= 0 ? 'end' : 'turn_end';
    this._endTimer = victim.hp <= 0 ? 4000 : 1400;
    if (victim.hp <= 0) this._winner = victim.index === 0 ? 1 : 0;
  }

  _nextTurn() {
    this.turn = 1 - this.turn;
    this._phase = 'intro'; this._introTimer = 2000;
    this._apLeft = AP_MAX; this._preview = null;
    this._active.vx = 0;
    this._giveActiveBall();
    this._snapCamera();
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (Input.wasPressed('Escape') && this._phase !== 'end') {
      this.returnToMenu = true; return;
    }

    Particles.update(dt);
    this._arena.update(dt);

    // Smooth camera toward active player
    this._camTarget = this._clampCam(this._active.x - C.W / 2);
    this.camX += (this._camTarget - this.camX) * Math.min(1, dt * 0.008);

    const obs = this._arena.getObstacles();

    switch (this._phase) {
      case 'intro':
        this._introTimer -= dt;
        this._physicsOnly(this.p1, obs); this._physicsOnly(this.p2, obs);
        if (this._introTimer <= 0) this._phase = 'active';
        break;

      case 'active':
        this._updateActive(dt, obs);
        this._physicsOnly(this._inactive, obs);
        this._updateBallHeld();
        break;

      case 'flight':
        this._physicsOnly(this.p1, obs); this._physicsOnly(this.p2, obs);
        this.ball.update(dt, obs);
        if (this.ball2) this.ball2.update(dt, obs);
        if (!this.ball.dead) this._checkBallHits();
        if (this.ball2 && this.ball2.dead) this.ball2 = null;
        if (this.ball.dead && this._phase === 'flight') {
          this._phase = 'turn_end'; this._endTimer = 1200;
        }
        break;

      case 'turn_end':
        this._endTimer -= dt;
        this._physicsOnly(this.p1, obs); this._physicsOnly(this.p2, obs);
        if (this._endTimer <= 0) this._nextTurn();
        break;

      case 'end':
        this._endTimer -= dt;
        this._physicsOnly(this.p1, obs); this._physicsOnly(this.p2, obs);
        if (this._endTimer <= 0 || Input.wasPressed('Enter') || Input.wasPressed('Space'))
          this.returnToMenu = true;
        break;
    }

    Input.flush();
  }

  // ── Physics helper (no input) ─────────────────────────────────────────────

  _physicsOnly(p, obs) {
    if (!p.onGround) p.vy += C.GRAVITY * (p.gravityMult || 1);
    p.x += p.vx; p.y += p.vy;
    p.vx *= C.FRICTION;
    if (Math.abs(p.vx) < 0.1) p.vx = 0;
    if (p.y >= C.GROUND)  { p.y = C.GROUND; p.vy = 0; p.onGround = true; }
    else p.onGround = false;
    if (p.y < 92)          { p.y = 92; p.vy = Math.max(0, p.vy); }
    // World bounds (3× wide)
    if (p.x < C.P_W / 2)                 { p.x = C.P_W / 2;                 p.vx = 0; }
    if (p.x > WORMS_WORLD_W - C.P_W / 2) { p.x = WORMS_WORLD_W - C.P_W / 2; p.vx = 0; }
    const ph = p.crouching ? C.CROUCH_H : C.P_H;
    for (const o of obs) if (!o.ballOnly) p._collideObstacle(o.rect, ph);
  }

  // ── Active player input ───────────────────────────────────────────────────

  _updateActive(dt, obs) {
    const p    = this._active;
    const k    = p.keys;
    const canAct = this._apLeft > 0;

    // ── Throwing (free — ends turn) ───────────────────────────────────────
    const isThrowing = Input.isDown(k.throw);
    if (p.hasBall && isThrowing) {
      this._preview = null;   // cancel any move preview while charging
      p.throwing = true; p.state = 'throwing';
      p.throwCharge = Math.min(C.THROW_CHARGE_TIME, p.throwCharge + dt);
      const aimSpeed = 0.035;
      if (Input.isDown(k.jump))   p.aimAngle = Math.min(p.aimAngle + aimSpeed, Math.PI * 0.52);
      if (Input.isDown(k.crouch)) p.aimAngle = Math.max(p.aimAngle - aimSpeed, -Math.PI / 5);
    } else if (p.throwing && !isThrowing && p.hasBall) {
      p.extraThrowCallback = null;
      p._doThrow(this.ball);
      this.ball.worldW = WORMS_WORLD_W;
      if (this.ball.seeker) this.ball._seekerTargetFn = () => this._inactive.x;
      this._phase = 'flight';
      return;
    } else {
      p.throwing = false; p.throwCharge = 0;
    }

    // ── Movement preview & commit ─────────────────────────────────────────
    if (!p.throwing && !p.hasBall) { /* no movement without ball */ }

    if (!p.throwing) {
      const pressLeft  = Input.wasPressed(k.left);
      const pressRight = Input.wasPressed(k.right);

      if (canAct && (pressLeft || pressRight)) {
        const dir = pressLeft ? -1 : 1;
        // If we already have a preview in the same direction → COMMIT
        if (this._preview && this._preview.dir === dir) {
          p.x = this._preview.destX;
          p.vx = 0;
          this._apLeft--;
          this._preview = null;
          if (this._apLeft === 0) this._setStatus('No AP left — aim and throw!');
        } else {
          // New direction → set preview
          const destX = Math.max(C.P_W / 2, Math.min(WORMS_WORLD_W - C.P_W / 2, p.x + dir * STEP_DIST));
          this._preview = { dir, destX };
          p.dir = dir;
        }
      }

      // Confirm preview with Enter/Space
      if (this._preview && (Input.wasPressed('Enter') || Input.wasPressed('Space'))) {
        p.x = this._preview.destX;
        p.vx = 0;
        this._apLeft--;
        this._preview = null;
        if (this._apLeft === 0) this._setStatus('No AP left — aim and throw!');
      }

      // Cancel preview
      if (this._preview && Input.wasPressed('Escape')) {
        // ESC while preview: cancel preview (not exit game)
        this._preview = null;
        Input.justPressed['Escape'] = false; // consume so we don't exit
      }

      // Jump (1 AP, instant, no preview)
      if (canAct && Input.wasPressed(k.jump) && p.onGround && !p.crouching) {
        p.vy = C.JUMP_FORCE * p.jumpForceMult;
        p.onGround = false;
        this._apLeft--;
        this._preview = null;
      }

      // Crouch (free)
      p.crouching = Input.isDown(k.crouch) && p.onGround;
    }

    // Shield (free)
    if (Input.wasPressed(k.shield) && p.shieldAvailable && !p.hasBall)
      p.shieldActive = !p.shieldActive;

    // Tick timers
    if (p.stunTimer > 0) p.stunTimer -= dt;
    if (!p.shieldAvailable && p.shieldCooldown > 0) {
      p.shieldCooldown -= dt;
      if (p.shieldCooldown <= 0) { p.shieldAvailable = true; p.shieldCooldown = 0; }
    }

    this._physicsOnly(p, obs);

    // Update facing based on inactive player position
    if (!p.throwing && this._preview === null) {
      p.dir = this._inactive.x > p.x ? 1 : -1;
    }

    p.state = p.throwing ? 'throwing'
            : p.crouching ? 'crouch'
            : !p.onGround ? 'jumping'
            : Math.abs(p.vx) > 0.3 ? 'running'
            : 'idle';
  }

  _setStatus(msg) {
    this._statusMsg = msg; this._statusTimer = 1800;
  }

  _updateBallHeld() {
    const p = this._active;
    if (!this.ball.inFlight && p.hasBall) {
      this.ball.x = p.x + p.dir * 22;
      this.ball.y = p.y - 34;
    }
  }

  _checkBallHits() {
    for (const [player, other] of [[this.p1, this.p2], [this.p2, this.p1]]) {
      if (!this.ball.checkHit(player)) continue;
      if (player.shieldActive) {
        this.ball.vx = -this.ball.vx * 1.15; this.ball.vy *= -0.5;
        player.shieldActive = false; player.shieldAvailable = false;
        player.shieldCooldown = C.SHIELD_RECHARGE;
      } else {
        player._getHit(this.ball, other);
      }
      break;
    }
    if (this.ball2 && !this.ball2.dead) {
      for (const [player, other] of [[this.p1, this.p2], [this.p2, this.p1]]) {
        if (this.ball2.checkHit(player)) { player._getHit(this.ball2, other); break; }
      }
    }
  }

  // ── Draw helpers ──────────────────────────────────────────────────────────

  _drawScaledPlayer(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(0.1, 0.1);
    ctx.translate(-p.x, -p.y);
    p.draw(ctx, this.ball);
    ctx.restore();
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, C.W, C.H);

    // Apply camera offset for world drawing
    ctx.save();
    ctx.translate(-Math.round(this.camX), 0);

    this._drawBg(ctx);
    for (const obs of this._arena.getObstacles()) obs.draw(ctx);

    // Preview ghost (scaled 1/10)
    if (this._preview && this._phase === 'active') {
      const p = this._active;
      ctx.globalAlpha = 0.35;
      const drawFn = (p.charType === 'girl' || (!p.charType && p.isGirl))
        ? Sprites.drawGirl.bind(Sprites) : Sprites.drawBoy.bind(Sprites);
      ctx.save();
      ctx.translate(this._preview.destX, p.y);
      ctx.scale(0.1, 0.1);
      ctx.translate(-this._preview.destX, -p.y);
      drawFn(ctx, this._preview.destX, p.y, 'idle', this._preview.dir, Math.PI/8, false, p.charColors);
      ctx.restore();
      ctx.globalAlpha = 1;
      // Cost label above ghost
      const lx = this._preview.destX;
      const ly = p.y - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(lx - 28, ly - 12, 56, 18);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('-1 AP  · ENTER', lx, ly);
      ctx.textAlign = 'left';
    }

    this._drawScaledPlayer(ctx, this.p1);
    this._drawScaledPlayer(ctx, this.p2);
    this.ball.draw(ctx);
    if (this.ball2) this.ball2.draw(ctx);
    Particles.draw(ctx);

    ctx.restore(); // end camera offset

    // HUD and overlays drawn in screen space
    this._drawHUD(ctx);
    if (this._phase === 'intro')    this._drawIntro(ctx);
    if (this._phase === 'turn_end') this._drawTurnEnd(ctx);
    if (this._phase === 'end')      this._drawEnd(ctx);

    // Status message (screen space, bottom)
    if (this._statusTimer > 0) {
      this._statusTimer -= 16;
      ctx.globalAlpha = Math.min(1, this._statusTimer / 300);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(C.W/2-140, C.H-30, 280, 20);
      ctx.fillStyle = '#FFD700'; ctx.font = '9px "Courier New"'; ctx.textAlign = 'center';
      ctx.fillText(this._statusMsg || '', C.W/2, C.H-17);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
  }

  _drawBg(ctx) {
    const map = this._map;
    // Sky gradient across the visible strip + a bit extra
    const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
    g.addColorStop(0, map.skyTop); g.addColorStop(1, map.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(this.camX, 0, C.W, C.GROUND);
    // Ground
    ctx.fillStyle = map.groundColor;
    ctx.fillRect(this.camX, C.GROUND, C.W, C.H - C.GROUND);
    ctx.fillStyle = map.groundLine;
    ctx.fillRect(this.camX, C.GROUND, C.W, 6);
  }

  _drawHUD(ctx) {
    const strip = ctx.createLinearGradient(0,0,0,68);
    strip.addColorStop(0,'rgba(0,0,0,0.92)'); strip.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle = strip; ctx.fillRect(0,0,C.W,68);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0,67,C.W,1);

    const p1Name = this.p1.charName || C.P1_NAME;
    const p2Name = this.p2.charName || C.P2_NAME;

    // P1 HP (left)
    ctx.textAlign = 'left'; ctx.fillStyle = C.COL.P1_HUD; ctx.font = 'bold 9px "Courier New"';
    ctx.fillText(p1Name, 10, 14);
    ctx.font = '18px serif';
    for (let i = 0; i < 3; i++) ctx.fillText(i < this.p1.hp ? '❤️' : '🖤', 10 + i*24, 44);

    // P2 HP (right)
    ctx.textAlign = 'right'; ctx.fillStyle = C.COL.P2_HUD; ctx.font = 'bold 9px "Courier New"';
    ctx.fillText(p2Name, C.W-10, 14);
    ctx.font = '18px serif';
    for (let i = 0; i < 3; i++) ctx.fillText(i < this.p2.hp ? '❤️' : '🖤', C.W-10-(2-i)*24, 44);

    // Whose turn + AP pips (centre)
    const turnCol = this.turn === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    const tName   = (this.turn === 0 ? p1Name : p2Name);
    ctx.textAlign = 'center';
    ctx.fillStyle = turnCol; ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(tName + "'s turn", C.W/2, 14);

    // AP pips
    const PW = 22, PH = 12, PG = 6;
    const px0 = C.W/2 - (AP_MAX*(PW+PG) - PG)/2;
    for (let i = 0; i < AP_MAX; i++) {
      const lit = i < this._apLeft;
      ctx.fillStyle = lit ? turnCol : '#2a2a2a';
      ctx.fillRect(px0 + i*(PW+PG), 22, PW, PH);
      if (lit) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(px0 + i*(PW+PG), 22, PW, 4);
      }
      // AP number
      ctx.fillStyle = lit ? '#fff' : '#555'; ctx.font = 'bold 8px "Courier New"';
      ctx.fillText(i+1, px0 + i*(PW+PG) + PW/2, 22 + PH - 2);
    }

    // Action hints
    ctx.fillStyle = this._apLeft > 0 ? '#aaa' : '#444';
    ctx.font = '8px "Courier New"';
    const hint = this._preview
      ? '← → same dir = commit  ·  ENTER commit  ·  ESC cancel'
      : this._apLeft > 0
        ? `← → move preview (-1 AP)  ·  ${Controls.p1.jump.slice(-1)} jump (-1 AP)  ·  hold throw`
        : 'No AP — hold throw to end turn';
    ctx.fillText(hint, C.W/2 - ctx.measureText(hint).width/2, 50);

    // Minimap position indicator
    const mmW = 120, mmH = 5, mmX = C.W/2 - mmW/2, mmY = 60;
    ctx.fillStyle = '#1a1a2a'; ctx.fillRect(mmX, mmY, mmW, mmH);
    const p1mm = mmX + (this.p1.x / WORMS_WORLD_W) * mmW;
    const p2mm = mmX + (this.p2.x / WORMS_WORLD_W) * mmW;
    ctx.fillStyle = C.COL.P1_HUD; ctx.fillRect(p1mm-2, mmY-1, 4, mmH+2);
    ctx.fillStyle = C.COL.P2_HUD; ctx.fillRect(p2mm-2, mmY-1, 4, mmH+2);
    // Camera view indicator
    const camPct  = this.camX / WORMS_WORLD_W;
    const viewPct = C.W / WORMS_WORLD_W;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
    ctx.strokeRect(mmX + camPct*mmW, mmY, viewPct*mmW, mmH);

    ctx.textAlign = 'left';
  }

  _drawIntro(ctx) {
    const t = Math.max(0, this._introTimer / 2200);
    // Subtle dark vignette — no full-screen color fill
    ctx.fillStyle = `rgba(0,0,0,${0.5 * Math.min(1, t * 4)})`;
    ctx.fillRect(0, 0, C.W, C.H);

    const col = this.turn === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(C.W/2-220, C.H/2-52, 440, 92);
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.strokeRect(C.W/2-220, C.H/2-52, 440, 92);
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.font = 'bold 26px "Courier New"';
    const nm = this.turn === 0 ? (this.p1.charName||C.P1_NAME) : (this.p2.charName||C.P2_NAME);
    ctx.fillText(`${nm}'S TURN 💣`, C.W/2, C.H/2 + 2);
    ctx.fillStyle = '#aaa'; ctx.font = '10px "Courier New"';
    ctx.fillText(`${AP_MAX} AP  ·  A/D preview move  ·  ENTER commit  ·  hold F to throw`, C.W/2, C.H/2 + 22);
    ctx.textAlign = 'left';
  }

  _drawTurnEnd(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, C.H/2-28, C.W, 48);
    ctx.textAlign = 'center'; ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px "Courier New"';
    ctx.fillText('⏳ Turn ending…', C.W/2, C.H/2+8); ctx.textAlign = 'left';
  }

  _drawEnd(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0,0,C.W,C.H);
    ctx.textAlign = 'center';
    const wN = this._winner===0 ? (this.p1.charName||C.P1_NAME) : (this.p2.charName||C.P2_NAME);
    ctx.fillStyle = this._winner===0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    ctx.font = 'bold 38px "Courier New"';
    ctx.fillText(`${wN} WINS! 🏆`, C.W/2, C.H/2-16);
    ctx.fillStyle = '#888'; ctx.font = '13px "Courier New"';
    ctx.fillText('ENTER / SPACE to return', C.W/2, C.H/2+28);
    ctx.textAlign = 'left';
  }
}
