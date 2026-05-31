// ── Salvo — turn-based dodgeball mode ────────────────────────────────────────
// Action points per turn: AP_MAX (3). Movement depletes a pixel budget.
// Jump costs 1 AP. Throwing ends the turn immediately.
// ─────────────────────────────────────────────────────────────────────────────

const AP_MAX   = 3;
const MOVE_BUDGET = 220;   // pixels of walking per turn
const JUMP_AP     = 1;     // AP cost of a jump

// ── Platform draw helpers ─────────────────────────────────────────────────────

function _drawBunkerPlatform(ctx, obs) {
  ctx.fillStyle = '#2E2E3E';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  ctx.fillStyle = '#3E3E50';
  ctx.fillRect(obs.x, obs.y, obs.w, 5);
  ctx.fillStyle = '#1E1E2A';
  ctx.fillRect(obs.x, obs.y + obs.h - 4, obs.w, 4);
  ctx.fillStyle = '#55557A';
  for (let i = 8; i < obs.w - 4; i += 22) {
    ctx.fillRect(obs.x + i, obs.y + 7, 5, 5);
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

// ── Map definitions ───────────────────────────────────────────────────────────

function _makeBunkerMap() {
  const mkP = (x, y, w) => new Obstacle(x, y, w, 18, _drawBunkerPlatform);
  return {
    name: '🏚️ UNDERGROUND BUNKER',
    skyTop: '#0A0A18', skyBot: '#1A1A30',
    groundColor: '#1A1A2E', groundLine: '#2A2A4A',
    p1Start: [80,  150],
    p2Start: [680, 150],
    obstacles: [
      mkP(0,   148, 180),   // P1 start ledge
      mkP(620, 148, 180),   // P2 start ledge
      mkP(280, 148, 240),   // centre top
      mkP(80,  228,  130),  // mid-left
      mkP(590, 228,  130),  // mid-right
      mkP(330, 228,  140),  // mid-centre
      mkP(160, 308,  160),  // lower-left
      mkP(480, 308,  160),  // lower-right
      mkP(340, 295,  120),  // lower-centre (slightly higher)
    ],
  };
}

function _makeForestMap() {
  const mkB = (x, y, w) => new Obstacle(x, y, w, 18, _drawForestBranch);
  return {
    name: '🌲 FOREST CANOPY',
    skyTop: '#0D2A0D', skyBot: '#1A5A1A',
    groundColor: '#3A5A1A', groundLine: '#4A6A2A',
    p1Start: [60,  118],
    p2Start: [686, 118],
    obstacles: [
      mkB(0,   116, 160),   // P1 start (left tree)
      mkB(640, 116, 160),   // P2 start (right tree)
      mkB(310, 126, 180),   // centre top
      mkB(110, 208, 130),   // left mid
      mkB(560, 208, 130),   // right mid
      mkB(290, 196, 220),   // centre mid
      mkB(0,   284,  90),   // far left
      mkB(170, 278, 140),   // left-lower
      mkB(490, 278, 140),   // right-lower
      mkB(710, 284,  90),   // far right
      mkB(330, 308, 140),   // centre low
    ],
  };
}

const WORMS_MAPS = [ _makeBunkerMap(), _makeForestMap() ];

// ── WormsGame ─────────────────────────────────────────────────────────────────

class WormsGame {
  constructor(canvas, mapIndex, p1Data, p2Data) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    const map = WORMS_MAPS[mapIndex % WORMS_MAPS.length];
    this._map = map;

    // Build a lightweight Arena-like object for physics
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
    this.p1.noMidline = true;
    this.p2.noMidline = true;
    this.p1.hordeMode = false;
    this.p2.hordeMode = false;

    // Apply character data if provided
    if (p1Data) { this.p1.signaturePower = p1Data.signaturePower; this.p1.charColors = p1Data.charColors; this.p1.charType = p1Data.charType; this.p1.charName = p1Data.charName; }
    if (p2Data) { this.p2.signaturePower = p2Data.signaturePower; this.p2.charColors = p2Data.charColors; this.p2.charType = p2Data.charType; this.p2.charName = p2Data.charName; }

    this.p1.hitCallback = (victim) => this._onHit(victim);
    this.p2.hitCallback = (victim) => this._onHit(victim);

    // HP
    this.p1.hp = 3; this.p2.hp = 3;

    // Ball
    this.ball  = new Ball();
    this.ball2 = null;

    // Turn state machine
    this.turn      = 0;           // 0 = P1's turn, 1 = P2's turn
    this._phase    = 'intro';     // intro | active | flight | turn_end | end
    this._introTimer  = 2200;
    this._endTimer    = 0;
    this._apLeft      = AP_MAX;
    this._moveBudget  = MOVE_BUDGET;
    this._prevActiveX = 0;

    this._winner = -1;
    this.returnToMenu = false;

    this._giveActiveBall();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get _active()   { return this.turn === 0 ? this.p1 : this.p2; }
  get _inactive() { return this.turn === 0 ? this.p2 : this.p1; }

  _giveActiveBall() {
    this.ball.reset(this.turn);
    const p = this._active;
    p.hasBall = true;
    this._inactive.hasBall = false;
    this.ball2 = null;
    Particles.clear();
  }

  _onHit(victim) {
    victim.hp = Math.max(0, victim.hp - 1);
    Particles.emit(victim.x, victim.y - 22, 20,
      ['#FF4444','#FF8888','#FFD700','#fff'], { upBias:2, maxSpeed:4 });
    if (victim.hp <= 0) {
      this._phase = 'end';
      this._winner = victim.index === 0 ? 1 : 0;
      this._endTimer = 4000;
    } else {
      this._phase = 'turn_end';
      this._endTimer = 1400;
    }
  }

  _nextTurn() {
    this.turn = 1 - this.turn;
    this._phase      = 'intro';
    this._introTimer = 2000;
    this._apLeft     = AP_MAX;
    this._moveBudget = MOVE_BUDGET;
    // Partial reset active player movement
    this._active.vx = 0;
    this._giveActiveBall();
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(dt) {
    if (Input.wasPressed('Escape') && this._phase !== 'end') {
      this.returnToMenu = true; return;
    }

    Particles.update(dt);
    this._arena.update(dt);
    const obs = this._arena.getObstacles();

    switch (this._phase) {
      case 'intro':
        this._introTimer -= dt;
        // Both players do passive physics during intro
        this._physicsOnly(this.p1, obs);
        this._physicsOnly(this.p2, obs);
        if (this._introTimer <= 0) { this._phase = 'active'; this._prevActiveX = this._active.x; }
        break;

      case 'active':
        this._updateActive(dt, obs);
        this._physicsOnly(this._inactive, obs);
        this._updateBallHeld();
        break;

      case 'flight':
        this._physicsOnly(this.p1, obs);
        this._physicsOnly(this.p2, obs);
        this.ball.update(dt, obs);
        if (this.ball2) { this.ball2.update(dt, obs); }

        // Hit detection
        if (!this.ball.dead) {
          for (const [p, other] of [[this.p1,this.p2],[this.p2,this.p1]]) {
            if (this.ball.checkHit(p)) {
              if (p.shieldActive) {
                this.ball.vx *= -1.15; this.ball.vy *= -0.5;
                p.shieldActive = false; p.shieldAvailable = false; p.shieldCooldown = C.SHIELD_RECHARGE;
              } else { p._getHit(this.ball, other); }
              break;
            }
          }
        }
        if (this.ball2 && !this.ball2.dead) {
          for (const [p, other] of [[this.p1,this.p2],[this.p2,this.p1]]) {
            if (this.ball2.checkHit(p)) {
              if (!p.shieldActive) p._getHit(this.ball2, other);
              break;
            }
          }
        }
        if (this.ball2 && this.ball2.dead) this.ball2 = null;

        if (this.ball.dead && this._phase === 'flight') {
          this._phase = 'turn_end'; this._endTimer = 1200;
        }
        break;

      case 'turn_end':
        this._endTimer -= dt;
        this._physicsOnly(this.p1, obs);
        this._physicsOnly(this.p2, obs);
        if (this._endTimer <= 0) this._nextTurn();
        break;

      case 'end':
        this._endTimer -= dt;
        this._physicsOnly(this.p1, obs);
        this._physicsOnly(this.p2, obs);
        if (this._endTimer <= 0 || Input.wasPressed('Enter') || Input.wasPressed('Space')) {
          this.returnToMenu = true;
        }
        break;
    }

    Input.flush();
  }

  // Player gets physics tick but no input
  _physicsOnly(player, obs) {
    // Apply gravity + obstacle collision manually (call player's private method)
    if (!player.onGround) player.vy += C.GRAVITY * (player.gravityMult || 1);
    player.x += player.vx;
    player.y += player.vy;
    player.vx *= C.FRICTION;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
    if (player.y >= C.GROUND) { player.y = C.GROUND; player.vy = 0; player.onGround = true; }
    else player.onGround = false;
    if (player.y < 92) { player.y = 92; player.vy = Math.max(0, player.vy); }
    if (player.x < C.P_W/2)       { player.x = C.P_W/2;       player.vx = 0; }
    if (player.x > C.W - C.P_W/2) { player.x = C.W - C.P_W/2; player.vx = 0; }
    const ph = player.crouching ? C.CROUCH_H : C.P_H;
    for (const obs_ of obs) {
      if (!obs_.ballOnly) player._collideObstacle(obs_.rect, ph);
    }
  }

  _updateActive(dt, obs) {
    const p = this._active;
    const k = p.keys;
    const canMove   = this._moveBudget > 0;
    const canJump   = this._apLeft >= JUMP_AP && p.onGround;

    // Aim when holding throw
    const isThrowing = Input.isDown(k.throw);
    if (p.hasBall && isThrowing) {
      p.throwing = true; p.state = 'throwing';
      p.throwCharge = Math.min(C.THROW_CHARGE_TIME, p.throwCharge + dt);
      if (Input.isDown(k.jump))   { p.aimAngle = Math.min(p.aimAngle + 0.035, Math.PI*0.52); }
      if (Input.isDown(k.crouch)) { p.aimAngle = Math.max(p.aimAngle - 0.035, -Math.PI/5); }
    } else if (p.throwing && !isThrowing && p.hasBall) {
      // Released throw — fire
      p._doThrow(this.ball);
      // Check double power
      if (this.ball2 === null) {
        p.extraThrowCallback = (x, y, vx, vy, ti) => {
          this.ball2 = new Ball();
          this.ball2.throw(x, y, vx, vy, false, false);
          this.ball2.lastThrower = ti;
        };
      }
      this._phase = 'flight';
      return;
    } else {
      p.throwing = false; p.throwCharge = 0;
    }

    // Movement (only if not throwing)
    if (!p.throwing) {
      const left  = Input.isDown(k.left);
      const right = Input.isDown(k.right);
      p.crouching = Input.isDown(k.crouch) && p.onGround;

      if (canMove && !p.crouching) {
        if (left  && !right) { p.vx -= C.WALK_SPEED; p.dir = -1; }
        if (right && !left)  { p.vx += C.WALK_SPEED; p.dir =  1; }
      }
      if (canJump && Input.wasPressed(k.jump) && !p.crouching) {
        p.vy = C.JUMP_FORCE * p.jumpForceMult;
        p.onGround = false;
        this._apLeft = Math.max(0, this._apLeft - JUMP_AP);
      }
    }

    // Shield
    if (Input.wasPressed(k.shield) && p.shieldAvailable && !p.hasBall) p.shieldActive = !p.shieldActive;

    // Deplete move budget based on distance moved
    const dx = Math.abs(p.x - this._prevActiveX);
    if (dx > 0) {
      this._moveBudget = Math.max(0, this._moveBudget - dx);
      if (this._moveBudget <= 0) { p.vx = 0; }
    }
    this._prevActiveX = p.x;

    // Tick timers
    if (p.stunTimer > 0) p.stunTimer -= dt;
    if (!p.shieldAvailable && p.shieldCooldown > 0) {
      p.shieldCooldown -= dt;
      if (p.shieldCooldown <= 0) { p.shieldAvailable = true; p.shieldCooldown = 0; }
    }

    // Physics
    this._physicsOnly(p, this._arena.getObstacles());

    // State string
    if (!p.throwing) {
      p.state = p.crouching ? 'crouch' : !p.onGround ? 'jumping' : Math.abs(p.vx) > 0.3 ? 'running' : 'idle';
    }
  }

  _updateBallHeld() {
    const p = this._active;
    if (!this.ball.inFlight && p.hasBall) {
      this.ball.x = p.x + p.dir * 22;
      this.ball.y = p.y - 34;
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, C.W, C.H);

    // Arena background
    this._arena.draw(ctx);

    // Players
    this.p1.draw(ctx, this.ball);
    this.p2.draw(ctx, this.ball);

    // Ball
    this.ball.draw(ctx);
    if (this.ball2) this.ball2.draw(ctx);

    // Particles
    Particles.draw(ctx);

    // HUD
    this._drawHUD(ctx);

    // Overlays
    if (this._phase === 'intro') this._drawIntro(ctx);
    if (this._phase === 'end')   this._drawEnd(ctx);
    if (this._phase === 'turn_end') this._drawTurnEnd(ctx);
  }

  _drawHUD(ctx) {
    // Top strip
    const strip = ctx.createLinearGradient(0,0,0,68);
    strip.addColorStop(0,'rgba(0,0,0,0.92)'); strip.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle = strip; ctx.fillRect(0,0,C.W,68);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0,67,C.W,1);

    // HP hearts
    ctx.font = '22px serif';
    const p1Name = this.p1.charName || C.P1_NAME;
    const p2Name = this.p2.charName || C.P2_NAME;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(p1Name, 10, 16);
    ctx.font = '20px serif';
    for (let i = 0; i < 3; i++) ctx.fillText(i < this.p1.hp ? '❤️' : '🖤', 10 + i*28, 50);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillText(p2Name, C.W-10, 16);
    ctx.font = '20px serif';
    for (let i = 0; i < 3; i++) ctx.fillText(i < this.p2.hp ? '❤️' : '🖤', C.W-10-(2-i)*28, 50);

    // Whose turn + AP bar
    const ap = this._active;
    const turnCol = this.turn === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    const turnName = (this.turn === 0 ? p1Name : p2Name) + "'s turn";
    ctx.textAlign = 'center';
    ctx.fillStyle = turnCol;
    ctx.font = 'bold 11px "Courier New"';
    ctx.fillText(turnName, C.W/2, 18);

    // AP pips
    const pipW = 18, pipH = 10, pipGap = 5;
    const pipsW = AP_MAX * (pipW + pipGap) - pipGap;
    const pipX0 = C.W/2 - pipsW/2;
    for (let i = 0; i < AP_MAX; i++) {
      ctx.fillStyle = i < this._apLeft ? turnCol : '#333';
      ctx.fillRect(pipX0 + i*(pipW+pipGap), 28, pipW, pipH);
    }

    // Move budget bar
    const barW = 120, barH = 6;
    const barX = C.W/2 - barW/2;
    ctx.fillStyle = '#222'; ctx.fillRect(barX, 44, barW, barH);
    ctx.fillStyle = turnCol;
    ctx.fillRect(barX, 44, Math.max(0, barW * this._moveBudget / MOVE_BUDGET), barH);
    ctx.fillStyle = '#888'; ctx.font = '8px "Courier New"';
    ctx.fillText('MOVE', C.W/2, 58);

    // Phase label
    const phaseLabel = { active: '🎮 Your move', flight: '🏐 Ball in flight!', turn_end: '⏳ Switching…', intro: '' }[this._phase] || '';
    if (phaseLabel) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '9px "Courier New"';
      ctx.fillText(phaseLabel, C.W/2, C.H - 8);
    }

    ctx.textAlign = 'left';
  }

  _drawIntro(ctx) {
    const t = Math.max(0, this._introTimer / 2000);
    ctx.globalAlpha = Math.min(1, t * 5) * 0.7;
    ctx.fillStyle = this.turn === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    ctx.fillRect(0, 0, C.W, C.H);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(C.W/2 - 200, C.H/2 - 44, 400, 72);
    ctx.textAlign = 'center';
    ctx.fillStyle = this.turn === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    ctx.font = 'bold 30px "Courier New"';
    const name = (this.turn === 0 ? (this.p1.charName||C.P1_NAME) : (this.p2.charName||C.P2_NAME));
    ctx.fillText(`${name}'S TURN`, C.W/2, C.H/2 + 12);
    ctx.fillStyle = '#aaa'; ctx.font = '11px "Courier New"';
    ctx.fillText(`${AP_MAX} AP  ·  move, jump & throw`, C.W/2, C.H/2 + 30);
    ctx.textAlign = 'left';
  }

  _drawTurnEnd(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, C.H/2 - 26, C.W, 44);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px "Courier New"';
    ctx.fillText('⏳ Turn ending…', C.W/2, C.H/2 + 8);
    ctx.textAlign = 'left';
  }

  _drawEnd(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0,0,C.W,C.H);
    ctx.textAlign = 'center';
    const wName = this._winner === 0 ? (this.p1.charName||C.P1_NAME) : (this.p2.charName||C.P2_NAME);
    const wCol  = this._winner === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    ctx.fillStyle = wCol;
    ctx.font = 'bold 40px "Courier New"';
    ctx.fillText(`${wName} WINS! 🏆`, C.W/2, C.H/2 - 20);
    ctx.fillStyle = '#888'; ctx.font = '13px "Courier New"';
    ctx.fillText('ENTER / SPACE to return', C.W/2, C.H/2 + 30);
    ctx.textAlign = 'left';
  }
}
