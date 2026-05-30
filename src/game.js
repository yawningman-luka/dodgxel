class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    Controls.load();

    this.state = C.STATE.MENU;
    this.arenaIndex = 0;
    this.arena = ARENAS[0];

    this.p1 = new Player(0, 130, Controls.p1);
    this.p2 = new Player(1, 670, Controls.p2);

    this.p1.hitCallback = (victim, attacker) => this._onHit(victim, attacker);
    this.p2.hitCallback = (victim, attacker) => this._onHit(victim, attacker);

    this.ball = new Ball();
    this.ball.holder = 0;
    this.p1.hasBall = true;
    this.ball2 = null; // second ball from double power

    this.roundDelay = 0;
    this.roundWinner = -1;
    this.roundOver = false;
    this.menuCursor = 0;
    this._p1ScoreFlash = 0;
    this._p2ScoreFlash = 0;

    // Controls screen state
    this._ctrlCursor = { col: 0, row: 0 };
    this._ctrlEditing = false;
  }

  _onHit(victim, attacker) {
    if (this.roundOver || this.state !== C.STATE.PLAYING) return;
    if (attacker) attacker.score++;
    else (this.ball.lastThrower === 0 ? this.p1 : this.p2).score++;
    this.roundOver = true;
    this.roundWinner = attacker ? attacker.index : this.ball.lastThrower;
    this.state = C.STATE.ROUND_END;
    this.roundDelay = C.ROUND_DELAY;

    // Score flash
    const FLASH_DUR = 700;
    if (this.roundWinner === 0) this._p1ScoreFlash = FLASH_DUR;
    else if (this.roundWinner === 1) this._p2ScoreFlash = FLASH_DUR;

    // Hit particles from victim + confetti from scorer
    const wCol = this.roundWinner === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    const scorer = this.roundWinner === 0 ? this.p1 : this.p2;
    Particles.emit(scorer.x, scorer.y - 30, 28,
      [wCol, '#FFD700', '#FFFFFF', '#FF6600'],
      { upBias: 3, maxSpeed: 6, minSize: 2, maxSize: 4 });
    Particles.emit(victim.x, victim.y - 22, 16,
      ['#FF4444', '#FF8888', '#FFFFFF'],
      { upBias: 1, maxSpeed: 3.5 });
  }

  update(dt) {
    dt = Math.min(dt, 50);
    switch (this.state) {
      case C.STATE.MENU:         this._updateMenu(); break;
      case C.STATE.ARENA_SELECT: this._updateArenaSelect(); break;
      case C.STATE.CONTROLS:     this._updateControls(); break;
      case C.STATE.PLAYING:      this._updatePlaying(dt); break;
      case C.STATE.ROUND_END:    this._updateRoundEnd(dt); break;
      case C.STATE.GAME_OVER:    this._updateGameOver(); break;
      case C.STATE.HORDE:
        this._hordeGame.update(dt);
        if (this._hordeGame.returnToMenu) {
          this._hordeGame = null;
          this.state = C.STATE.MENU;
        }
        break;
    }
    Input.flush();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, C.W, C.H);
    switch (this.state) {
      case C.STATE.MENU:         this._drawMenu(ctx); break;
      case C.STATE.ARENA_SELECT: this._drawArenaSelect(ctx); break;
      case C.STATE.CONTROLS:     this._drawControls(ctx); break;
      case C.STATE.PLAYING:
      case C.STATE.ROUND_END:    this._drawGame(ctx); break;
      case C.STATE.GAME_OVER:    this._drawGame(ctx); this._drawGameOver(ctx); break;
      case C.STATE.HORDE:        if (this._hordeGame) this._hordeGame.draw(); break;
    }
  }

  // ---- Menu ----
  _updateMenu() {
    if (Input.wasPressed('ArrowUp')   || Input.wasPressed('KeyW')) this.menuCursor = (this.menuCursor + 2) % 3;
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) this.menuCursor = (this.menuCursor + 1) % 3;
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      if      (this.menuCursor === 0) { this.state = C.STATE.ARENA_SELECT; this.menuCursor = 0; }
      else if (this.menuCursor === 1) { this._startHorde(); }
      else                            { this.state = C.STATE.CONTROLS; }
    }
    if (Input.wasPressed('KeyH')) this._startHorde();
    if (Input.wasPressed('KeyC')) this.state = C.STATE.CONTROLS;
  }

  _drawMenu(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, C.H);
    g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#0f3460');
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 70; i++) {
      ctx.beginPath();
      ctx.arc((i * 137.5) % C.W, (i * 71.3) % (C.H * 0.8), 0.5 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,80,0,0.45)';
    ctx.font = 'bold 62px "Courier New"';
    ctx.fillText('DODGXEL', C.W / 2 + 3, 103);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('DODGXEL', C.W / 2, 100);
    ctx.fillStyle = '#666';
    ctx.font = '12px "Courier New"';
    ctx.fillText('Catch · Shield · Superpowers · First to 11', C.W / 2, 120);

    // Buttons
    const btns = [
      { label: 'CLASSIC MATCH', sub: '1v1 arena battle · pick your stage', col: C.COL.P1_HUD },
      { label: 'HORDE MODE',    sub: 'co-op wave survival · 10 waves',      col: '#FF6600'    },
      { label: 'CONTROLS',      sub: 'remap keys for both players',          col: '#888888'    },
    ];
    const bw = 310, bh = 50, gap = 8, bx = C.W / 2 - bw / 2, by0 = 138;

    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const by = by0 + i * (bh + gap);
      const sel = i === this.menuCursor;
      const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 280);

      // Background
      ctx.fillStyle = sel ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx, by, bw, bh);

      // Left accent bar
      ctx.fillStyle = sel ? b.col : '#333';
      ctx.fillRect(bx, by, 4, bh);

      // Border
      ctx.strokeStyle = sel ? b.col : '#2a2a2a';
      ctx.lineWidth = sel ? 1.5 : 1;
      if (sel) ctx.globalAlpha = pulse;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.globalAlpha = 1;

      // Label
      ctx.textAlign = 'left';
      ctx.fillStyle = sel ? '#fff' : '#888';
      ctx.font = `bold 15px "Courier New"`;
      ctx.fillText(b.label, bx + 18, by + 20);

      // Sub-label
      ctx.fillStyle = sel ? b.col : '#444';
      ctx.font = '10px "Courier New"';
      ctx.fillText(b.sub, bx + 18, by + 36);

      // Arrow indicator
      if (sel) {
        ctx.fillStyle = b.col;
        ctx.font = 'bold 13px "Courier New"';
        ctx.textAlign = 'right';
        ctx.fillText('▶  ENTER', bx + bw - 8, by + bh / 2 + 5);
      }
    }

    // Nav hint
    ctx.textAlign = 'center';
    ctx.fillStyle = '#383838';
    ctx.font = '11px "Courier New"';
    ctx.fillText('↑ ↓  navigate', C.W / 2, by0 + btns.length * (bh + gap) + 4);

    // Animated characters: hold ball → wind up → throw → arc → catch → hold
    const boyX = C.W / 2 - 105, girlX = C.W / 2 + 105, charY = C.H - 44;
    const cycleDur = 2600;
    const cyclePos = Date.now() % (cycleDur * 2);
    const boyThrows = cyclePos < cycleDur; // which half of the loop
    const p = (cyclePos % cycleDur) / cycleDur; // 0→1 per half

    // Ball is in the air between p=0.20 and p=0.80
    const inFlight = p > 0.20 && p < 0.80;
    const fp = inFlight ? (p - 0.20) / 0.60 : 0; // 0→1 during flight

    const fromX = boyThrows ? boyX : girlX;
    const toX   = boyThrows ? girlX : boyX;

    let boyHasBall, girlHasBall, boyState, girlState;
    if (inFlight) {
      // Ball in the air — both hands empty
      boyHasBall = girlHasBall = false;
      boyState  = boyThrows && fp < 0.25 ? 'throwing' : 'idle';
      girlState = !boyThrows && fp < 0.25 ? 'throwing' : 'idle';
      const bx = fromX + (toX - fromX) * fp;
      const by = charY - 44 - Math.sin(fp * Math.PI) * 68;
      Sprites.drawBall(ctx, bx, by, true, false);
    } else if (p <= 0.20) {
      // Holder winds up with ball in hand
      boyHasBall  =  boyThrows;
      girlHasBall = !boyThrows;
      boyState  = boyThrows  && p > 0.08 ? 'throwing' : 'idle';
      girlState = !boyThrows && p > 0.08 ? 'throwing' : 'idle';
    } else {
      // Receiver just caught — holds the ball briefly
      boyHasBall  = !boyThrows;
      girlHasBall =  boyThrows;
      boyState = girlState = 'idle';
    }

    Sprites.drawBoy( ctx, boyX,  charY, boyState,  1, Math.PI / 5, boyHasBall);
    Sprites.drawGirl(ctx, girlX, charY, girlState, -1, Math.PI / 5, girlHasBall);

    ctx.textAlign = 'left';
  }

  // ---- Arena Select ----
  _updateArenaSelect() {
    const COLS = 4;
    if (Input.wasPressed('ArrowLeft')  || Input.wasPressed('KeyA')) {
      this.menuCursor = (this.menuCursor - 1 + ARENAS.length) % ARENAS.length;
    }
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) {
      this.menuCursor = (this.menuCursor + 1) % ARENAS.length;
    }
    if (Input.wasPressed('ArrowUp')    || Input.wasPressed('KeyW')) {
      this.menuCursor = (this.menuCursor - COLS + ARENAS.length) % ARENAS.length;
    }
    if (Input.wasPressed('ArrowDown')  || Input.wasPressed('KeyS')) {
      this.menuCursor = (this.menuCursor + COLS) % ARENAS.length;
    }
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      this._startGame(this.menuCursor);
    }
    if (Input.wasPressed('Escape')) this.state = C.STATE.MENU;
  }

  _drawArenaSelect(ctx) {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, C.W, C.H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px "Courier New"';
    ctx.fillText('SELECT ARENA', C.W / 2, 52);

    const COLS = 4;
    const cardW = 145, cardH = 116, gap = 10;
    const totalW = COLS * cardW + (COLS - 1) * gap;
    const startX = (C.W - totalW) / 2;

    for (let i = 0; i < ARENAS.length; i++) {
      const a = ARENAS[i];
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = startX + col * (cardW + gap);
      const cy = 68 + row * (cardH + 28); // 28px gap between rows
      const sel = i === this.menuCursor;

      if (sel) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18; }
      ctx.fillStyle = sel ? '#222240' : '#161628';
      ctx.strokeStyle = sel ? '#FFD700' : '#333';
      ctx.lineWidth = sel ? 3 : 1;
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeRect(cx, cy, cardW, cardH);
      ctx.shadowBlur = 0;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(cx + 4, cy + 4, cx + 4, cy + 4 + cardH * 0.55);
      skyGrad.addColorStop(0, a.skyTop);
      skyGrad.addColorStop(1, a.skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(cx + 4, cy + 4, cardW - 8, cardH * 0.55);
      ctx.fillStyle = a.groundColor;
      ctx.fillRect(cx + 4, cy + cardH * 0.55, cardW - 8, cardH - cardH * 0.55 - 4);

      // Stylized scene
      Sprites.drawArenaIcon(ctx, i, cx + 4, cy + 4, cardW - 8, Math.round(cardH * 0.55));

      // Feature badge
      const badgeLabel = a.badge ?? (a.ballGroundBounce === 0 ? 'SAND — ball sticks!' : null);
      if (badgeLabel) {
        ctx.fillStyle = a.badgeColor ?? 'rgba(210,180,140,0.85)';
        ctx.fillRect(cx + 4, cy + cardH * 0.55 - 16, cardW - 8, 16);
        ctx.fillStyle = a.badgeTextColor ?? '#663';
        ctx.font = '9px "Courier New"';
        ctx.fillText(badgeLabel, cx + cardW / 2, cy + cardH * 0.55 - 4);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(cx + 4, cy + cardH * 0.5, cardW - 8, 22);
      ctx.fillStyle = sel ? '#FFD700' : '#ccc';
      ctx.font = `${sel ? 'bold ' : ''}13px "Courier New"`;
      ctx.fillText(a.name, cx + cardW / 2, cy + cardH * 0.5 + 15);

      ctx.fillStyle = '#888';
      ctx.font = '10px "Courier New"';
      ctx.fillText(`${a.obstacles.length} obstacles`, cx + cardW / 2, cy + cardH - 8);

      if (sel) {
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 250);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#FFD700';
        ctx.font = '22px serif';
        ctx.fillText('▼', cx + cardW / 2, cy + cardH + 28);
        ctx.globalAlpha = 1;
      }
    }

    const rows = Math.ceil(ARENAS.length / COLS);
    const navY = 68 + rows * (cardH + 28) + 10;
    const pulse2 = 0.6 + 0.4 * Math.sin(Date.now() / 350);
    ctx.globalAlpha = pulse2;
    ctx.fillStyle = '#fff';
    ctx.font = '13px "Courier New"';
    ctx.fillText('← → ↑ ↓  choose · ENTER play · ESC back', C.W / 2, navY);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ---- Controls Editor ----
  _updateControls() {
    const actions = C.CTRL_ACTIONS;

    if (this._ctrlEditing) {
      // Consume the first non-modifier key pressed
      for (const code of Object.keys(Input.justPressed)) {
        if (code === 'Escape') {
          this._ctrlEditing = false;
        } else if (!['ShiftLeft','ShiftRight','AltLeft','AltRight'].includes(code)) {
          const action = actions[this._ctrlCursor.row];
          if (this._ctrlCursor.col === 0) Controls.p1[action] = code;
          else                            Controls.p2[action] = code;
          Controls.save();
          this._ctrlEditing = false;
        }
        break;
      }
      Input.flush();
      return;
    }

    if (Input.wasPressed('ArrowUp'))   this._ctrlCursor.row = (this._ctrlCursor.row - 1 + actions.length) % actions.length;
    if (Input.wasPressed('ArrowDown')) this._ctrlCursor.row = (this._ctrlCursor.row + 1) % actions.length;
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('ArrowRight')) this._ctrlCursor.col ^= 1;
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) this._ctrlEditing = true;
    if (Input.wasPressed('KeyR')) Controls.reset();
    if (Input.wasPressed('Escape')) this.state = C.STATE.MENU;
  }

  _drawControls(ctx) {
    const actions = C.CTRL_ACTIONS;
    const labels  = C.CTRL_LABELS;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, C.W, C.H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px "Courier New"';
    ctx.fillText('CONTROLS', C.W / 2, 44);

    // Column headers
    ctx.fillStyle = C.COL.P1_HUD;
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText(C.P1_NAME + ' (P1)', C.W / 4, 72);
    ctx.fillStyle = C.COL.P2_HUD;
    ctx.fillText(C.P2_NAME + ' (P2)', C.W * 3 / 4, 72);

    // Separator
    ctx.fillStyle = '#333';
    ctx.fillRect(C.W / 2 - 1, 56, 2, C.H - 90);

    // Action rows
    const startY = 88;
    const rowH = 28;
    const blink = Math.sin(Date.now() / 130) > 0;

    for (let r = 0; r < actions.length; r++) {
      const action = actions[r];
      const y = startY + r * rowH;

      // Row highlight
      if (this._ctrlCursor.row === r) {
        ctx.fillStyle = 'rgba(255,215,0,0.06)';
        ctx.fillRect(0, y - 4, C.W, rowH);
      }

      // Action label (centre)
      ctx.fillStyle = '#666';
      ctx.font = '11px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(labels[action], C.W / 2, y + 14);

      // P1 binding
      const p1Sel  = this._ctrlCursor.col === 0 && this._ctrlCursor.row === r;
      const p1Edit = p1Sel && this._ctrlEditing;
      ctx.textAlign = 'right';
      ctx.fillStyle = p1Edit ? (blink ? '#FFD700' : '#555')
                             : p1Sel ? '#FFD700' : C.COL.P1_HUD;
      ctx.font = `bold 13px "Courier New"`;
      ctx.fillText(p1Edit ? '[ ? ]' : `[ ${Controls.keyName(Controls.p1[action])} ]`, C.W / 2 - 110, y + 14);

      // P2 binding
      const p2Sel  = this._ctrlCursor.col === 1 && this._ctrlCursor.row === r;
      const p2Edit = p2Sel && this._ctrlEditing;
      ctx.textAlign = 'left';
      ctx.fillStyle = p2Edit ? (blink ? '#FFD700' : '#555')
                             : p2Sel ? '#FFD700' : C.COL.P2_HUD;
      ctx.fillText(p2Edit ? '[ ? ]' : `[ ${Controls.keyName(Controls.p2[action])} ]`, C.W / 2 + 110, y + 14);
    }

    // Footer instructions
    ctx.fillStyle = '#555';
    ctx.font = '11px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText('↑ ↓ navigate · ← → switch player · ENTER remap · R reset defaults · ESC back', C.W / 2, C.H - 20);
    if (this._ctrlEditing) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 13px "Courier New"';
      ctx.fillText('press any key…', C.W / 2, C.H - 6);
    }
    ctx.textAlign = 'left';
  }

  // ---- Horde ----
  _startHorde() {
    this._hordeGame = new HordeGame(this.canvas);
    this.state = C.STATE.HORDE;
  }

  // ---- Game ----
  _startGame(idx) {
    this.arenaIndex = idx;
    this.arena = ARENAS[idx];
    this.p1.score = 0; this.p2.score = 0;
    this._startRound(0);
    this.state = C.STATE.PLAYING;
  }

  _startRound(ballHolder) {
    this.p1.reset();
    this.p2.reset();
    // Restore arena-specific physics after reset()
    const gMult  = this.arena?.playerGravityMult    ?? 1;
    const jMult  = this.arena?.playerJumpForceMult  ?? 1;
    const invert = this.arena?.playerInvertGravity  ?? false;
    const noGnd  = this.arena?.noGround             ?? false;
    this.p1.gravityMult   = gMult;   this.p2.gravityMult   = gMult;
    this.p1.jumpForceMult = jMult;   this.p2.jumpForceMult = jMult;
    this.p1.invertGravity = invert;  this.p2.invertGravity = invert;
    this.p1.noGround      = noGnd;   this.p2.noGround      = noGnd;
    // Override starting position for special arenas
    if (invert) {
      this.p1.y = 90; this.p1.vy = 0; this.p1.onGround = true;
      this.p2.y = 90; this.p2.vy = 0; this.p2.onGround = true;
    }
    if (this.arena?.playerStarts) {
      const [[x1,y1],[x2,y2]] = this.arena.playerStarts;
      this.p1.x = x1; this.p1.y = y1; this.p1.vy = 0; this.p1.onGround = true;
      this.p2.x = x2; this.p2.y = y2; this.p2.vy = 0; this.p2.onGround = true;
    }

    this.p1.hitCallback = (victim, attacker) => this._onHit(victim, attacker);
    this.p2.hitCallback = (victim, attacker) => this._onHit(victim, attacker);
    this.p1.extraThrowCallback = (x, y, vx, vy, thrower) => this._spawnBall2(x, y, vx, vy, thrower);
    this.p2.extraThrowCallback = (x, y, vx, vy, thrower) => this._spawnBall2(x, y, vx, vy, thrower);
    this.ball.reset(ballHolder);
    Particles.clear();
    this._p1ScoreFlash = 0;
    this._p2ScoreFlash = 0;
    this.ball2 = null;
    if (ballHolder === 0) this.p1.hasBall = true;
    else                  this.p2.hasBall = true;
    this.roundOver  = false;
    this.roundWinner = -1;
    this._ballThrownBy = ballHolder; // tracks actual thrower even after bounces reset lastThrower
    this._ballWasInFlight = false;
  }

  _spawnBall2(x, y, vx, vy, throwerIndex) {
    this.ball2 = new Ball();
    this.ball2.throw(x, y, vx, vy, false, false);
    this.ball2.lastThrower = throwerIndex;
  }

  _updatePlaying(dt) {
    if (Input.wasPressed('Escape')) { this.state = C.STATE.MENU; Particles.clear(); return; }
    Particles.update(dt);
    if (this._p1ScoreFlash > 0) this._p1ScoreFlash -= dt;
    if (this._p2ScoreFlash > 0) this._p2ScoreFlash -= dt;
    this.arena.update(dt);
    const obs = this.arena.getObstacles();
    const speedMult = this.arena.playerSpeedMult ?? 1;
    this.p1.update(dt, this.ball, obs, this.p2, speedMult);
    this.p2.update(dt, this.ball, obs, this.p1, speedMult);
    const bGravMult = this.arena.ballGravityMult ?? 1;
    this.ball.update(dt, obs, bGravMult);
    if (this.arena.checkTeleport) this.arena.checkTeleport(this.ball);

    if (!this.ball.inFlight) {
      if (this.ball.holder === 0 && this.p1.hasBall) {
        this.ball.x = this.p1.x + this.p1.dir * 22;
        this.ball.y = this.p1.y + (this.p1.invertGravity ? 34 : -34);
      } else if (this.ball.holder === 1 && this.p2.hasBall) {
        this.ball.x = this.p2.x + this.p2.dir * 22;
        this.ball.y = this.p2.y + (this.p2.invertGravity ? 34 : -34);
      }
    }

    // Second ball (double power)
    if (this.ball2) {
      this.ball2.update(dt, obs, bGravMult);
      if (this.arena.checkTeleport) this.arena.checkTeleport(this.ball2);
      if (!this.roundOver) {
        for (const [player, other] of [[this.p1, this.p2], [this.p2, this.p1]]) {
          if (!this.ball2.checkHit(player)) continue;
          if (player.shieldActive) {
            this.ball2.vx = -this.ball2.vx * 1.15;
            this.ball2.vy *= -0.5;
            player.shieldActive = false;
            player.shieldAvailable = false;
            player.shieldCooldown = C.SHIELD_RECHARGE;
          } else {
            player._getHit(this.ball2, other);
          }
          break;
        }
      }
      if (this.ball2 && this.ball2.dead) this.ball2 = null;
    }

    // Track who threw — capture lastThrower at the moment of launch,
    // because wall/ceiling bounces reset it to -1 before the ball dies.
    if (this.ball.inFlight && !this._ballWasInFlight) {
      this._ballThrownBy = this.ball.lastThrower; // 0 or 1
    }
    this._ballWasInFlight = this.ball.inFlight;

    // Demon fireballs (Upside-Down arena) — hit = other player scores
    if (this.arena.demon && !this.roundOver) {
      this.arena.demon.checkBallHit(this.ball);
      for (const [player, other] of [[this.p1, this.p2], [this.p2, this.p1]]) {
        if (this.arena.demon.checkPlayerHit(player)) {
          this._onHit(player, other);
        }
      }
    }

    // Fall death (Clouds arena — no ground, step off = lose)
    if (this.arena.noGround && !this.roundOver) {
      if (this.p1.y > C.GROUND + 10) this._onHit(this.p1, this.p2);
      if (this.p2.y > C.GROUND + 10) this._onHit(this.p2, this.p1);
    }


    // Ball missed — switch possession, no point scored
    if (this.ball.dead && !this.roundOver) {
      const nextHolder = this._ballThrownBy === 0 ? 1 : 0;
      this.ball.reset(nextHolder);
      if (nextHolder === 0) this.p1.hasBall = true;
      else                  this.p2.hasBall = true;
      this._ballThrownBy = nextHolder;
      this._ballWasInFlight = false;
    }
  }

  _updateRoundEnd(dt) {
    if (Input.wasPressed('Escape')) { this.state = C.STATE.MENU; Particles.clear(); return; }
    Particles.update(dt);
    if (this._p1ScoreFlash > 0) this._p1ScoreFlash -= dt;
    if (this._p2ScoreFlash > 0) this._p2ScoreFlash -= dt;
    this.roundDelay -= dt;
    if (this.roundDelay <= 0) {
      if (this.p1.score >= C.WIN_SCORE || this.p2.score >= C.WIN_SCORE) {
        this.state = C.STATE.GAME_OVER;
      } else {
        const nextHolder = this.roundWinner >= 0
          ? 1 - this.roundWinner
          : (this._ballDeadHolder ?? 0);
        this._startRound(nextHolder);
        this.state = C.STATE.PLAYING;
      }
    }
  }

  _updateGameOver() {
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      // Instant rematch — same arena, scores reset
      this._startGame(this.arenaIndex);
    }
    if (Input.wasPressed('KeyR')) {
      this.state = C.STATE.ARENA_SELECT;
      this.menuCursor = this.arenaIndex;
    }
    if (Input.wasPressed('Escape')) { this.state = C.STATE.MENU; Particles.clear(); }
  }

  _drawGame(ctx) {
    this.arena.draw(ctx);

    this.p1.draw(ctx, this.ball);
    this.p2.draw(ctx, this.ball);
    this.ball.draw(ctx);
    if (this.ball2) this.ball2.draw(ctx);

    if (this.state === C.STATE.ROUND_END && this.roundWinner >= 0) {
      const t = Math.max(0, this.roundDelay / C.ROUND_DELAY);
      const wCol = this.roundWinner === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
      ctx.globalAlpha = Math.min(1, t * 3) * 0.15;
      ctx.fillStyle = wCol;
      ctx.fillRect(0, 0, C.W, C.H);
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(C.W / 2 - 160, C.H / 2 - 38, 320, 58);
      ctx.textAlign = 'center';
      ctx.fillStyle = wCol;
      ctx.font = 'bold 28px "Courier New"';
      const wName = this.roundWinner === 0 ? C.P1_NAME : C.P2_NAME;
      ctx.fillText(`${wName} SCORES!`, C.W / 2, C.H / 2 + 7);
      ctx.textAlign = 'left';
    }

    Sprites.drawHUD(ctx, this.p1, this.p2, this.arena);

    // Particles
    Particles.draw(ctx);

    // Score flash overlay — big animated number when a point is scored
    const FLASH_DUR = 700;
    for (const [flash, score, col, fx] of [
      [this._p1ScoreFlash, this.p1.score, C.COL.P1_HUD, C.W * 0.22],
      [this._p2ScoreFlash, this.p2.score, C.COL.P2_HUD, C.W * 0.78],
    ]) {
      if (flash > 0) {
        const t = flash / FLASH_DUR;
        const sz = Math.round(32 + t * 28);
        ctx.globalAlpha = t * 0.9;
        ctx.shadowColor = col; ctx.shadowBlur = 22;
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${sz}px "Courier New"`;
        ctx.textAlign = 'center';
        ctx.fillText(score, fx, C.H / 2 + 10);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
    ctx.textAlign = 'left';
  }

  _drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, C.W, C.H);

    const winner = this.p1.score >= C.WIN_SCORE ? this.p1 : this.p2;
    const wName  = winner.index === 0 ? C.P1_NAME : C.P2_NAME;
    const wCol   = winner.index === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;

    ctx.textAlign = 'center';
    ctx.fillStyle = wCol;
    ctx.font = 'bold 46px "Courier New"';
    ctx.fillText(`${wName} WINS!`, C.W / 2, C.H / 2 - 38);

    ctx.fillStyle = '#ddd';
    ctx.font = '24px "Courier New"';
    ctx.fillText(`${this.p1.score}  —  ${this.p2.score}`, C.W / 2, C.H / 2 + 12);

    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 400);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff';
    ctx.font = '15px "Courier New"';
    ctx.fillText('ENTER = rematch · R = new arena · ESC = menu', C.W / 2, C.H / 2 + 62);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
