class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    Controls.load();
    reloadCustomArenas();

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
    this._splitBalls = [];
    this._blazeHazards = [];

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
      case C.STATE.ARENA_BUILDER:
        this._builder.update(dt);
        if (this._builder.returnToMenu) {
          this._builder = null;
          this.state = C.STATE.MENU;
        }
        break;
      case C.STATE.CHAR_SELECT:
        this._updateCharSelect(dt);
        break;

      case C.STATE.HOW_TO_PLAY:
        this._updateHowToPlay();
        break;
      case C.STATE.ONLINE_LOBBY:
        this._updateOnlineLobby(dt);
        break;
      case C.STATE.STORY:
        this._storyGame.update(dt);
        if (this._storyGame.returnToMenu) { this._storyGame = null; this.state = C.STATE.MENU; }
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
      case C.STATE.ARENA_BUILDER: if (this._builder) this._builder.draw(); break;
      case C.STATE.CHAR_SELECT:   this._drawCharSelect(this.ctx); break;

      case C.STATE.HOW_TO_PLAY:   this._drawHowToPlay(ctx); break;
      case C.STATE.ONLINE_LOBBY:  this._drawOnlineLobby(ctx); break;
      case C.STATE.STORY:         if (this._storyGame) this._storyGame.draw(); break;
    }
  }

  // ---- Menu ----
  _updateMenu() {
    const N = 5;
    if (Input.wasPressed('ArrowUp')   || Input.wasPressed('KeyW')) this.menuCursor = (this.menuCursor - 1 + N) % N;
    if (Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS')) this.menuCursor = (this.menuCursor + 1) % N;
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      switch (this.menuCursor) {
        case 0: this._startCharSelect('classic');     break;
        case 1: this._startStory();                   break;
        case 2: this._startCharSelect('horde');       break;
        case 3: this.state = C.STATE.HOW_TO_PLAY;    break;
        case 4: this.state = C.STATE.CONTROLS;        break;
      }
    }
    if (Input.wasPressed('KeyH')) this._startCharSelect('horde');
    if (Input.wasPressed('KeyC')) this.state = C.STATE.CONTROLS;
  }

  _drawMenu(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, C.H);
    g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#0f3460');
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 70; i++) {
      ctx.beginPath();
      ctx.arc((i*137.5)%C.W, (i*71.3)%(C.H*0.8), 0.5+(i%3)*0.5, 0, Math.PI*2);
      ctx.fill();
    }

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,80,0,0.45)';
    ctx.font = 'bold 54px Segoe UI, Arial, sans-serif';
    ctx.fillText('DODGXEL', C.W/2+3, 58);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('DODGXEL', C.W/2, 55);
    // Tagline
    ctx.fillStyle = 'rgba(255,200,80,0.78)';
    ctx.font = 'italic 12px Segoe UI, Arial, sans-serif';
    ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 9;
    ctx.fillText('Dodge. Throw. Save the World.', C.W/2, 71);
    ctx.shadowBlur = 0;

    // 5 menu buttons — wider and taller now that builder & online are gone
    const BTNS = [
      { label:'🏐 CLASSIC MATCH', sub:'1v1 arena battle · pick your stage',      col: C.COL.P1_HUD, bh:52 },
      { label:'📖 STORY MODE',    sub:'solo or co-op · 5 acts · save the world', col:'#CC88FF',     bh:52 },
      { label:'💀 HORDE MODE',    sub:'co-op wave survival · 10 waves',          col:'#FF6600',     bh:52 },
      { label:'❓ HOW TO PLAY',   sub:'rules, modes & controls guide',            col:'#AAAAAA',     bh:38 },
      { label:'⚙️ CONTROLS',     sub:'remap keys for both players',              col:'#888888',     bh:38 },
    ];
    const bw = 300, bx = C.W/2 - bw/2;
    let by = 86;
    const pulse = 0.65 + 0.35*Math.sin(Date.now()/280);

    for (let i = 0; i < BTNS.length; i++) {
      const b = BTNS[i];
      const sel = i === this.menuCursor;
      const gap = 4;
      if (i === 3) { ctx.fillStyle = '#2a2a3a'; ctx.fillRect(bx, by, bw, 1); by += 5; }

      ctx.fillStyle = sel ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.45)';
      ctx.fillRect(bx, by, bw, b.bh);
      ctx.fillStyle = sel ? b.col : '#333';
      ctx.fillRect(bx, by, 4, b.bh);
      ctx.strokeStyle = sel ? b.col : '#2a2a2a';
      ctx.lineWidth = sel ? 1.5 : 1;
      if (sel) ctx.globalAlpha = pulse;
      ctx.strokeRect(bx, by, bw, b.bh);
      ctx.globalAlpha = 1;

      ctx.textAlign = 'left';
      ctx.fillStyle = sel ? '#fff' : '#888';
      ctx.font = `bold ${b.bh > 40 ? 14 : 11}px "Segoe UI Emoji","Segoe UI Symbol",Segoe UI,Arial,sans-serif`;
      ctx.fillText(b.label, bx+14, by + (b.bh > 40 ? 20 : 14));
      if (b.bh > 40) {
        ctx.fillStyle = sel ? b.col : '#444';
        ctx.font = '12px Segoe UI,Arial,sans-serif';
        ctx.fillText(b.sub, bx+14, by+35);
      }
      if (sel) {
        ctx.fillStyle = b.col;
        ctx.font = '11px "Segoe UI Symbol",Segoe UI,Arial,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('▶ ENTER', bx+bw-8, by+b.bh/2+4);
      }
      by += b.bh + gap;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#303040';
    ctx.font = '11px "Segoe UI Symbol",Segoe UI,Arial,sans-serif';
    ctx.fillText('↑ ↓  navigate', C.W/2, by + 5);

    // ── Animated characters flanking the menu ──────────────────────────────
    // P1 boy on the left, P2 girl on the right — pass ball back and forth
    const boyX = 78, girlX = C.W - 78, charY = C.H - 52;
    const cycleDur = 2600;
    const cyclePos = Date.now() % (cycleDur * 2);
    const boyThrows = cyclePos < cycleDur;
    const p = (cyclePos % cycleDur) / cycleDur;
    const inFlight = p > 0.20 && p < 0.80;
    const fp = inFlight ? (p - 0.20) / 0.60 : 0;
    const fromX = boyThrows ? boyX : girlX;
    const toX   = boyThrows ? girlX : boyX;

    let boyHasBall, girlHasBall, boyState, girlState;
    if (inFlight) {
      boyHasBall = girlHasBall = false;
      boyState  = boyThrows && fp < 0.25 ? 'throwing' : 'idle';
      girlState = !boyThrows && fp < 0.25 ? 'throwing' : 'idle';
      const ballX = fromX + (toX - fromX) * fp;
      const ballY = charY - 40 - Math.sin(fp * Math.PI) * 80;
      Sprites.drawBall(ctx, ballX, ballY, true, false);
    } else if (p <= 0.20) {
      boyHasBall  =  boyThrows; girlHasBall = !boyThrows;
      boyState  = boyThrows  && p > 0.08 ? 'throwing' : 'idle';
      girlState = !boyThrows && p > 0.08 ? 'throwing' : 'idle';
    } else {
      boyHasBall = !boyThrows; girlHasBall = boyThrows;
      boyState = girlState = 'idle';
    }

    // Scale characters down slightly for the menu
    ctx.save();
    ctx.translate(boyX, charY); ctx.scale(0.72, 0.72); ctx.translate(-boyX, -charY);
    Sprites.drawBoy( ctx, boyX,  charY, boyState,   1, Math.PI/5, boyHasBall);
    ctx.restore();
    ctx.save();
    ctx.translate(girlX, charY); ctx.scale(0.72, 0.72); ctx.translate(-girlX, -charY);
    Sprites.drawGirl(ctx, girlX, charY, girlState, -1, Math.PI/5, girlHasBall);
    ctx.restore();

    ctx.textAlign = 'left';
  }

  // ---- Arena Select ----
  _updateArenaSelect() {
    const COLS = 4;
    const moved = Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA') ||
                  Input.wasPressed('ArrowRight')|| Input.wasPressed('KeyD') ||
                  Input.wasPressed('ArrowUp')   || Input.wasPressed('KeyW') ||
                  Input.wasPressed('ArrowDown') || Input.wasPressed('KeyS');
    if (Input.wasPressed('ArrowLeft')  || Input.wasPressed('KeyA'))
      this.menuCursor = (this.menuCursor - 1 + ARENAS.length) % ARENAS.length;
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD'))
      this.menuCursor = (this.menuCursor + 1) % ARENAS.length;
    if (Input.wasPressed('ArrowUp')    || Input.wasPressed('KeyW'))
      this.menuCursor = (this.menuCursor - COLS + ARENAS.length) % ARENAS.length;
    if (Input.wasPressed('ArrowDown')  || Input.wasPressed('KeyS'))
      this.menuCursor = (this.menuCursor + COLS) % ARENAS.length;
    // Navigation resets readiness so players re-confirm on the new arena
    if (moved) { this._as_p1Ready = false; this._as_p2Ready = false; }

    if (Input.wasPressed(Controls.p1.catch)) this._as_p1Ready = !this._as_p1Ready;
    if (Input.wasPressed(Controls.p2.catch)) this._as_p2Ready = !this._as_p2Ready;

    if (this._as_p1Ready && this._as_p2Ready) { this._startGame(this.menuCursor); return; }

    if (Input.wasPressed('Escape')) {
      if (this._as_p1Ready || this._as_p2Ready) {
        this._as_p1Ready = false; this._as_p2Ready = false;
      } else {
        this.state = C.STATE.MENU;
      }
    }
  }

  _drawArenaSelect(ctx) {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, C.W, C.H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px Segoe UI, Arial, sans-serif';
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
        ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText(badgeLabel, cx + cardW / 2, cy + cardH * 0.55 - 4);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(cx + 4, cy + cardH * 0.5, cardW - 8, 22);
      ctx.fillStyle = sel ? '#FFD700' : '#ccc';
      ctx.font = `${sel ? 'bold ' : ''}13px Segoe UI, Arial, sans-serif`;
      ctx.fillText(a.name, cx + cardW / 2, cy + cardH * 0.5 + 15);

      ctx.fillStyle = '#888';
      ctx.font = '11px Segoe UI, Arial, sans-serif';
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
    const navY = 68 + rows * (cardH + 28) + 8;

    // P1 and P2 ready indicators
    const p1Key = Controls.keyName(Controls.p1.catch);
    const p2Key = Controls.keyName(Controls.p2.catch);
    const p1R = this._as_p1Ready, p2R = this._as_p2Ready;

    // P1 panel (left)
    ctx.fillStyle = p1R ? 'rgba(30,80,30,0.9)' : 'rgba(20,20,40,0.8)';
    ctx.fillRect(C.W/2 - 280, navY - 2, 130, 28);
    ctx.strokeStyle = p1R ? '#44FF88' : C.COL.P1_HUD;
    ctx.lineWidth = p1R ? 2 : 1; ctx.strokeRect(C.W/2 - 280, navY - 2, 130, 28);
    ctx.textAlign = 'center';
    ctx.fillStyle = p1R ? '#44FF88' : C.COL.P1_HUD;
    ctx.font = `${p1R ? 'bold ' : ''}11px Segoe UI, Arial, sans-serif`;
    ctx.fillText(p1R ? '✓ P1 READY' : `P1 [${p1Key}] ready`, C.W/2 - 215, navY + 14);

    // P2 panel (right)
    ctx.fillStyle = p2R ? 'rgba(30,80,30,0.9)' : 'rgba(20,20,40,0.8)';
    ctx.fillRect(C.W/2 + 150, navY - 2, 130, 28);
    ctx.strokeStyle = p2R ? '#44FF88' : C.COL.P2_HUD;
    ctx.lineWidth = p2R ? 2 : 1; ctx.strokeRect(C.W/2 + 150, navY - 2, 130, 28);
    ctx.fillStyle = p2R ? '#44FF88' : C.COL.P2_HUD;
    ctx.font = `${p2R ? 'bold ' : ''}11px Segoe UI, Arial, sans-serif`;
    ctx.fillText(p2R ? '✓ P2 READY' : `P2 [${p2Key}] ready`, C.W/2 + 215, navY + 14);

    // Centre nav hint
    const pulse2 = 0.5 + 0.5 * Math.sin(Date.now() / 350);
    ctx.globalAlpha = pulse2;
    ctx.fillStyle = '#888';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText('← → ↑ ↓  navigate · ESC back', C.W / 2, navY + 14);
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
    ctx.font = 'bold 24px Segoe UI, Arial, sans-serif';
    ctx.fillText('CONTROLS', C.W / 2, 44);

    // Column headers
    ctx.fillStyle = C.COL.P1_HUD;
    ctx.font = 'bold 14px Segoe UI, Arial, sans-serif';
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
      ctx.font =  '11px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[action], C.W / 2, y + 14);

      // P1 binding
      const p1Sel  = this._ctrlCursor.col === 0 && this._ctrlCursor.row === r;
      const p1Edit = p1Sel && this._ctrlEditing;
      ctx.textAlign = 'right';
      ctx.fillStyle = p1Edit ? (blink ? '#FFD700' : '#555')
                             : p1Sel ? '#FFD700' : C.COL.P1_HUD;
      ctx.font = `bold 13px Segoe UI, Arial, sans-serif`;
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
    ctx.font =  '11px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↑ ↓ navigate · ← → switch player · ENTER remap · R reset defaults · ESC back', C.W / 2, C.H - 20);
    if (this._ctrlEditing) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
      ctx.fillText('press any key…', C.W / 2, C.H - 6);
    }
    ctx.textAlign = 'left';
  }

  // ---- Char Select ----
  _startCharSelect(dest = 'classic') {
    this._cs = {
      dest,
      p1: { idx:0, confirmed:false, customSub:false,
            customShirt:0, customHair:0, customPower:0, customName:'P1',
            customHairStyle:0, customAccessory:0, customSymbol:0, customBallStyle:0, _customRow:0 },
      p2: { idx:1, confirmed:false, customSub:false,
            customShirt:0, customHair:0, customPower:0, customName:'P2',
            customHairStyle:0, customAccessory:0, customSymbol:0, customBallStyle:0, _customRow:0 },
      bothTimer: 0, soloHorde: false,
    };
    this.state = C.STATE.CHAR_SELECT;
  }

  _updateCharSelect(dt) {
    const cs = this._cs;
    const N  = CHARACTERS.length;

    if (Input.wasPressed('Escape')) {
      if (cs.p1.customSub) { cs.p1.customSub = false; return; }
      if (cs.p2.customSub) { cs.p2.customSub = false; return; }
      this.state = C.STATE.MENU; return;
    }

    const updateSide = (ps, leftKey, rightKey, upKey, downKey, confirmKey) => {
      if (ps.confirmed) return;

      if (ps.customSub) {
        const NROWS = 8;
        if (Input.wasPressed(upKey))   ps._customRow = (ps._customRow - 1 + NROWS) % NROWS;
        if (Input.wasPressed(downKey)) ps._customRow = (ps._customRow + 1) % NROWS;

        const cycle = (v, arr, d) => (v + d + arr.length) % arr.length;
        const left = Input.wasPressed(leftKey), right = Input.wasPressed(rightKey);
        if (left || right) {
          const d = left ? -1 : 1;
          switch (ps._customRow) {
            case 0: ps.customShirt     = cycle(ps.customShirt,     CUSTOM_SHIRT_PRESETS, d); break;
            case 1: ps.customSymbol    = cycle(ps.customSymbol,    CUSTOM_SHIRT_SYMBOLS, d); break;
            case 2: ps.customBallStyle = cycle(ps.customBallStyle, BALL_STYLES,          d); break;
            case 3: ps.customHair      = cycle(ps.customHair,      CUSTOM_HAIR_PRESETS,  d); break;
            case 4: ps.customHairStyle = cycle(ps.customHairStyle, CUSTOM_HAIR_STYLES,   d); break;
            case 5: ps.customAccessory = cycle(ps.customAccessory, CUSTOM_ACCESSORIES,   d); break;
            case 6: ps.customPower     = cycle(ps.customPower,     C.POWERS,             d); break;
            case 7: { const n = prompt('Name (max 10):', ps.customName); if (n) ps.customName = n.toUpperCase().slice(0,10); } break;
          }
        }
        if (Input.wasPressed(confirmKey)) { ps.confirmed = true; ps.customSub = false; }
        return;
      }

      if (Input.wasPressed(leftKey))  ps.idx = (ps.idx - 1 + N) % N;
      if (Input.wasPressed(rightKey)) ps.idx = (ps.idx + 1) % N;
      const ch = CHARACTERS[ps.idx];
      if (Input.wasPressed(confirmKey)) {
        if (ch.id === 'custom') { ps.customSub = true; ps._customRow = 0; }
        else                     ps.confirmed = true;
      }
    };

    updateSide(cs.p1, 'KeyA', 'KeyD', 'KeyW', 'KeyS', Controls.p1.catch);
    updateSide(cs.p2, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', Controls.p2.catch);

    // Extra confirm keys: ENTER for P1, R-SHIFT for P2
    if (!cs.p1.confirmed && Input.wasPressed('Enter')) {
      if (cs.p1.customSub) { cs.p1.confirmed = true; cs.p1.customSub = false; }
      else { const _c1 = CHARACTERS[cs.p1.idx]; if (_c1.id === 'custom') { cs.p1.customSub = true; cs.p1._customRow = 0; } else cs.p1.confirmed = true; }
    }
    if (!cs.p2.confirmed && Input.wasPressed('ShiftRight')) {
      if (cs.p2.customSub) { cs.p2.confirmed = true; cs.p2.customSub = false; }
      else { const _c2 = CHARACTERS[cs.p2.idx]; if (_c2.id === 'custom') { cs.p2.customSub = true; cs.p2._customRow = 0; } else cs.p2.confirmed = true; }
    }

    // Solo shortcut: P1 presses Space → skip P2, go solo
    if ((cs.dest === 'horde' || cs.dest === 'worms' || cs.dest === 'story') && !cs.p1.customSub && !cs.p2.customSub
        && Input.wasPressed('Space') && !cs.p1.confirmed) {
      cs.p1.confirmed = true; cs.p2.confirmed = true; cs.soloHorde = true;
    }

    if (cs.p1.confirmed && cs.p2.confirmed) {
      cs.bothTimer += dt;
      if (cs.bothTimer >= 600) {
        this._applyCharSelections();
        if      (cs.dest === 'horde')  { this._startHorde(cs.soloHorde); }
        else if (cs.dest === 'worms')  { this._startWorms(); }
        else if (cs.dest === 'online') { this._startOnlineGame(); }
        else if (cs.dest === 'story')  {
          this._applyCharSelections();
          const coop = !cs.soloHorde;
          const p1d = { signaturePower:this.p1.signaturePower, charColors:this.p1.charColors, charType:this.p1.charType, charName:this.p1.charName };
          const p2d = coop ? { signaturePower:this.p2.signaturePower, charColors:this.p2.charColors, charType:this.p2.charType, charName:this.p2.charName } : null;
          this._storyGame = new StoryGame(this.canvas, coop, p1d, p2d);
          this.state = C.STATE.STORY;
        }
        else { this.state = C.STATE.ARENA_SELECT; this.menuCursor = 0; this._as_p1Ready = false; this._as_p2Ready = false; }
      }
    }
  }

  _applyCharSelections() {
    const apply = (player, ps) => {
      const ch = CHARACTERS[ps.idx];
      if (ch.id === 'custom') {
        const shirt     = CUSTOM_SHIRT_PRESETS[ps.customShirt];
        const hair      = CUSTOM_HAIR_PRESETS[ps.customHair];
        const hairStyle = CUSTOM_HAIR_STYLES[ps.customHairStyle] || CUSTOM_HAIR_STYLES[0];
        player.signaturePower = C.POWERS[ps.customPower];
        player.charColors = {
          shirt, pants: this._darken(shirt),
          hair,  hairDark: this._darken(hair),
          hairType:    hairStyle,
          accessory:   CUSTOM_ACCESSORIES[ps.customAccessory]  || 'none',
          shirtSymbol: CUSTOM_SHIRT_SYMBOLS[ps.customSymbol]   || 'none',
          ballStyle:   BALL_STYLES[ps.customBallStyle]         || 'default',
        };
        // Body type derived from hair style — no manual body selector needed
        player.charType = HAIR_STYLE_TO_BODY[hairStyle] || 'boy';
        player.charName = ps.customName;
      } else {
        player.signaturePower = ch.power;
        player.charColors     = ch.colors;
        player.charType       = ch.type;
        player.charName       = ch.name;
      }
    };
    apply(this.p1, this._cs.p1);
    apply(this.p2, this._cs.p2);
  }

  _darken(hex) {
    // Simple hex darkener — multiply each channel by 0.65
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const d = v => Math.max(0, Math.round(v * 0.65)).toString(16).padStart(2,'0');
    return `#${d(r)}${d(g)}${d(b)}`;
  }

  _drawCharSelect(ctx) {
    const cs = this._cs;
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, C.H);
    bg.addColorStop(0, '#0d0d1a'); bg.addColorStop(1, '#1a0d2e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, C.W, C.H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
    ctx.fillText('SELECT YOUR FIGHTER', C.W / 2, 36);

    const modeLabel = cs.dest === 'horde' ? '— HORDE MODE —' : cs.dest === 'worms' ? '— SALVO MODE —' : '— CLASSIC MATCH —';
    ctx.fillStyle = cs.dest === 'horde' ? '#FF6600' : cs.dest === 'worms' ? '#22CC88' : C.COL.P1_HUD;
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText(modeLabel, C.W / 2, 50);

    ctx.fillStyle = '#444';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText(`P1: A/D choose  [G or ENTER] ready     P2: ←/→ choose  [L or R-SHIFT] ready     ESC back`, C.W / 2, 62);

    let panelTop = 74;
    if (cs.dest === 'horde') {
      ctx.fillStyle = '#FF6600'; ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillText('💀 HORDE: SPACE = start solo (P1 only)  ·  both confirm = co-op', C.W / 2, 74);
      panelTop = 86;
    } else if (cs.dest === 'worms') {
      ctx.fillStyle = '#22CC88'; ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillText('💣 SALVO: SPACE = start solo (P1 only)  ·  both confirm = 2-player', C.W / 2, 74);
      panelTop = 86;
    } else if (cs.dest === 'story') {
      ctx.fillStyle = '#AA44FF'; ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillText('📖 STORY: SPACE = play solo (P1 only)  ·  both confirm = co-op', C.W / 2, 74);
      panelTop = 86;
    }

    const panelW = 360, panelH = 340, gap = 20;
    const p1x = (C.W / 2) - panelW - gap / 2;
    const p2x = (C.W / 2) + gap / 2;

    this._drawCharPanel(ctx, cs.p1, p1x, panelTop, panelW, panelH, C.COL.P1_HUD, 'P1');
    this._drawCharPanel(ctx, cs.p2, p2x, panelTop, panelW, panelH, C.COL.P2_HUD, 'P2');

    // Both confirmed — countdown
    if (cs.p1.confirmed && cs.p2.confirmed) {
      const t = Math.min(1, cs.bothTimer / 600);
      ctx.globalAlpha = t;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Segoe UI, Arial, sans-serif';
      const nextLabel = cs.dest === 'horde' ? '▶  ENTERING HORDE…' : cs.dest === 'worms' ? '▶  ENTERING SALVO…' : cs.dest === 'online' ? '▶  STARTING ONLINE…' : '▶  SELECTING ARENA…';
      ctx.fillText(nextLabel, C.W / 2, C.H - 18);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  _drawCharPanel(ctx, ps, px, py, pw, ph, accentCol, label) {
    const ch = CHARACTERS[ps.idx];

    // Panel bg
    ctx.fillStyle = ps.confirmed ? 'rgba(40,60,40,0.95)' : 'rgba(20,20,35,0.95)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = ps.confirmed ? '#44FF88' : accentCol;
    ctx.lineWidth = ps.confirmed ? 2.5 : 1.5;
    ctx.strokeRect(px, py, pw, ph);

    // Player label
    ctx.fillStyle = accentCol;
    ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, px + 10, py + 16);

    if (ps.confirmed) {
      ctx.fillStyle = '#44FF88';
      ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('✔ READY', px + pw - 10, py + 16);
    }

    ctx.textAlign = 'center';
    const cx = px + pw / 2;

    if (ps.customSub) {
      // Custom builder sub-panel
      this._drawCustomSub(ctx, ps, px, py, pw, ph, accentCol);
      return;
    }

    // Character name
    ctx.fillStyle = ps.confirmed ? '#44FF88' : '#fff';
    ctx.font = `bold 18px Segoe UI, Arial, sans-serif`;
    ctx.fillText(ch.name, cx, py + 34);

    // Nav arrows at mid-height so they clear the preview
    const pulse = ps.confirmed ? 1 : 0.5 + 0.5 * Math.sin(Date.now() / 250);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = accentCol;
    ctx.font = '18px Segoe UI, Arial, sans-serif';
    ctx.fillText('◀', px + 14, py + 200);
    ctx.fillText('▶', px + pw - 14, py + 200);
    ctx.globalAlpha = 1;

    // Large character preview — feet at py+210, giving clearance above name
    const previewY = py + 210;
    const previewScale = 1.7;
    ctx.save();
    ctx.translate(cx, previewY);
    ctx.scale(previewScale, previewScale);
    ctx.translate(-cx, -previewY);
    const cols = ch.id === 'custom' ? null : ch.colors;
    const type = ch.type || 'boy';
    if (type === 'girl') Sprites.drawGirl(ctx, cx, previewY, 'idle', 1, Math.PI / 8, false, cols);
    else                 Sprites.drawBoy (ctx, cx, previewY, 'idle', 1, Math.PI / 8, false, cols);
    ctx.restore();

    if (ch.id === 'custom') {
      const kKey = label === 'P1' ? Controls.keyName(Controls.p1.catch) : Controls.keyName(Controls.p2.catch);
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(cx-88, py+216, 176, 28);
      ctx.strokeStyle = accentCol; ctx.lineWidth = 1.5; ctx.strokeRect(cx-88, py+216, 176, 28);
      ctx.fillStyle = accentCol; ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
      ctx.fillText(`[ ${kKey} ]  CUSTOMISE`, cx, py + 234);
    }

    // Power badge
    const pColors = { rocket:C.COL.SP_ROCKET, curve:C.COL.SP_CURVE, shadow:C.COL.SP_SHADOW,
                      double:C.COL.SP_DOUBLE, boomerang:C.COL.SP_BOOMERANG, blaze:C.COL.SP_BLAZE,
                      heavy:C.COL.SP_HEAVY, seeker:C.COL.SP_SEEKER, split:C.COL.SP_SPLIT };
    if (ch.power) {
      ctx.fillStyle = pColors[ch.power] || '#FFD700';
      ctx.fillRect(cx - 62, py + 252, 124, 22);
      ctx.fillStyle = '#000'; ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
      ctx.fillText(`★  ${C.POWER_NAMES[ch.power]}`, cx, py + 268);
    } else {
      ctx.fillStyle = '#333'; ctx.fillRect(cx - 62, py + 252, 124, 22);
      ctx.fillStyle = '#888'; ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillText('choose in builder ▼', cx, py + 268);
    }

    // Bio
    ctx.fillStyle = '#666'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
    ctx.fillText(ch.bio, cx, py + 288);

    // Confirm key hint (pulsing, hidden once confirmed)
    if (!ps.confirmed) {
      const confirmHint = label === 'P1' ? '[G]  or  [ENTER]  to ready' : '[L]  or  [R-SHIFT]  to ready';
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 380);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = accentCol;
      ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillText(confirmHint, cx, py + ph - 32);
      ctx.globalAlpha = 1;
    }

    // Dots for character position
    for (let i = 0; i < CHARACTERS.length; i++) {
      ctx.fillStyle = i === ps.idx ? accentCol : '#333';
      ctx.beginPath();
      ctx.arc(px + 14 + i * (pw - 28) / (CHARACTERS.length - 1), py + ph - 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'left';
  }

  _drawCustomSub(ctx, ps, px, py, pw, ph, accentCol) {
    // 2-column: left 55% = form rows, right 45% = live preview
    const colSplit = Math.round(pw * 0.55);
    const leftW    = colSplit - 6;
    const previewX = px + colSplit + (pw - colSplit) / 2;
    const previewY = py + ph * 0.58;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
    ctx.fillText('✏️ CUSTOM FIGHTER', px + pw / 2, py + 28);

    // Divider
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(px + colSplit, py + 36, 1, ph - 44);

    const symVal    = CUSTOM_SHIRT_SYMBOLS[ps.customSymbol] || 'none';
    const hairStyle = CUSTOM_HAIR_STYLES[ps.customHairStyle] || CUSTOM_HAIR_STYLES[0];
    const curPower  = C.POWERS[ps.customPower];
    const curBall   = BALL_STYLES[ps.customBallStyle] || 'default';
    const rows = [
      { label:'SHIRT',      color: CUSTOM_SHIRT_PRESETS[ps.customShirt] },
      { label:'SYMBOL',     value: symVal === 'none' ? '— none —' : symVal },
      { label:'BALL STYLE', value: BALL_STYLE_LABELS[curBall] || curBall, ballStyle: curBall },
      { label:'HAIR COL',   color: CUSTOM_HAIR_PRESETS[ps.customHair] },
      { label:'HAIR STYLE', value: hairStyle },
      { label:'ACCESSORY',  value: CUSTOM_ACCESSORIES[ps.customAccessory] || 'none' },
      { label:'POWER',      value: '⚡ ' + (C.POWER_NAMES[curPower] || ''), desc: POWER_DESCRIPTIONS[curPower] || '' },
      { label:'NAME',       value: ps.customName + ' ✏️' },
    ];

    const rowH = 32, rowStart = py + 42;
    rows.forEach((row, i) => {
      const ry  = rowStart + i * rowH;
      const sel = ps._customRow === i;
      const rx  = px + 6, rw = leftW;

      ctx.fillStyle = sel ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.3)';
      ctx.fillRect(rx, ry, rw, rowH - 3);
      if (sel) {
        ctx.strokeStyle = accentCol; ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, rw, rowH - 3);
      }

      // Label
      ctx.textAlign = 'left'; ctx.fillStyle = sel ? '#aaa' : '#555';
      ctx.font =  '11px Segoe UI, Arial, sans-serif';
      ctx.fillText(row.label, rx + 6, ry + 11);

      // Value
      if (row.color) {
        ctx.fillStyle = row.color;
        ctx.fillRect(rx + 6, ry + 14, rw - 12, 12);
        if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(rx + 6, ry + 14, rw - 12, 12); }
      } else if (row.ballStyle) {
        const bdata = BALL_STYLE_DATA[row.ballStyle] || BALL_STYLE_DATA.default;
        const bc = bdata.color || '#E84040';
        ctx.fillStyle = bc; ctx.beginPath(); ctx.arc(rx + 14, ry + 20, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.fillStyle = sel ? accentCol : '#aaa'; ctx.font = '11px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(row.value, rx + rw/2 + 8, ry + 24);
      } else {
        ctx.fillStyle = sel ? accentCol : '#999';
        ctx.font = `bold 10px Segoe UI, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(row.value, rx + rw / 2, ry + 24);
      }

      if (sel) {
        ctx.fillStyle = accentCol; ctx.font = '11px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('◄  ►', rx + rw - 18, ry + 24);
        // Power description tooltip
        if (row.desc) {
          ctx.fillStyle = '#777'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
          ctx.fillText(row.desc, rx + rw / 2, ry + rowH + 2);
        }
      }
    });

    // Live preview (right column — NO overlap)
    const shirt = CUSTOM_SHIRT_PRESETS[ps.customShirt];
    const hair  = CUSTOM_HAIR_PRESETS[ps.customHair];
    const cols  = {
      shirt, pants: this._darken(shirt), hair, hairDark: this._darken(hair),
      hairType:    hairStyle,
      accessory:   CUSTOM_ACCESSORIES[ps.customAccessory]  || 'none',
      shirtSymbol: CUSTOM_SHIRT_SYMBOLS[ps.customSymbol]   || 'none',
    };
    const previewBodyType = HAIR_STYLE_TO_BODY[hairStyle] || 'boy';
    ctx.save();
    ctx.translate(previewX, previewY);
    ctx.scale(1.55, 1.55);
    ctx.translate(-previewX, -previewY);
    if (previewBodyType === 'girl') Sprites.drawGirl(ctx, previewX, previewY, 'idle', 1, Math.PI/8, false, cols);
    else                            Sprites.drawBoy (ctx, previewX, previewY, 'idle', 1, Math.PI/8, false, cols);
    ctx.restore();

    // Footer hint
    ctx.fillStyle = '#444'; ctx.font =  '11px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('↑↓ row  ·  ←→ change  ·  confirm = lock in', px + pw / 2, py + ph - 6);
    ctx.textAlign = 'left';
  }

  // ---- Horde ----
  _startStory() {
    this._startCharSelect('story');
  }

  _startHorde(solo = false) {
    this._hordeGame = new HordeGame(this.canvas, solo);
    this.state = C.STATE.HORDE;
  }

  // ---- Worms ----
  _startWorms() {
    const mapIdx = Math.floor(Math.random() * 3); // random of 3 maps
    const p1d = { signaturePower:this.p1.signaturePower, charColors:this.p1.charColors, charType:this.p1.charType, charName:this.p1.charName };
    const p2d = { signaturePower:this.p2.signaturePower, charColors:this.p2.charColors, charType:this.p2.charType, charName:this.p2.charName };
    this._wormsGame = new WormsGame(this.canvas, mapIdx, p1d, p2d);
    this.state = C.STATE.WORMS;
  }

  _startOnlineGame() {
    // P2's player gets network input; P1 uses keyboard normally.
    // NetworkManager.sendInput() is called every frame in _updatePlaying.
    if (NetworkManager.playerIndex === 1) {
      // We are P2 — our local keyboard drives P2; P1 is remote
      this.p2._netInput = null;          // P2 = us, use keyboard
      this.p1._netInput = NetworkManager.remoteInput;
    } else {
      // We are P1 (host) — P2 is remote
      this.p1._netInput = null;
      this.p2._netInput = NetworkManager.remoteInput;
    }
    this.state = C.STATE.ARENA_SELECT;
    this.menuCursor = 0;
    this._as_p1Ready = false; this._as_p2Ready = false;
    this._onlineMode = true;
  }

  // ---- Online ----
  _startOnlineLobby() {
    // Auto-pick ws:// for local dev, wss:// for the live GitHub Pages build
    const defaultServer = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'ws://localhost:8080'
      : 'wss://YOUR-SERVER.up.railway.app';   // ← replace after Railway deploy
    this._ol = {
      phase:       'connect',
      serverUrl:   defaultServer,
      code:        '',
      inputCode:   '',
      errorMsg:    '',
      isHost:      false,
    };
    NetworkManager.onConnected      = () => { this._ol.phase = 'create_or_join'; };
    NetworkManager.onRoomCreated    = c  => { this._ol.code = c; this._ol.phase = 'waiting'; this._ol.isHost = true; };
    NetworkManager.onRoomJoined     = c  => { this._ol.code = c; this._ol.phase = 'in_lobby'; };
    NetworkManager.onOpponentJoined = () => { this._ol.phase = 'in_lobby'; };
    NetworkManager.onOpponentLeft   = () => { this._ol.phase = 'create_or_join'; this._ol.errorMsg = 'Opponent disconnected.'; };
    NetworkManager.onError          = m  => { this._ol.phase = 'error'; this._ol.errorMsg = m; };
    NetworkManager.connect(this._ol.serverUrl);
    this.state = C.STATE.ONLINE_LOBBY;
  }

  _updateOnlineLobby(dt) {
    if (Input.wasPressed('Escape')) {
      NetworkManager.disconnect();
      this.state = C.STATE.MENU;
      return;
    }
    const ol = this._ol;
    if (ol.phase === 'connect' && !NetworkManager.connecting && !NetworkManager.connected) {
      // Connection attempt failed — try localhost fallback
      ol.phase = 'error';
      ol.errorMsg = 'Cannot reach server. Start server.js first.';
    }
    if (ol.phase === 'create_or_join') {
      if (Input.wasPressed('KeyC')) { NetworkManager.createRoom(); ol.phase = 'waiting'; }
    }
    if (ol.phase === 'joining') {
      // Key input for room code
      for (const code of Object.keys(Input.justPressed)) {
        if (code === 'Backspace') { ol.inputCode = ol.inputCode.slice(0,-1); }
        else if (ol.inputCode.length < 4) {
          const ch = code.startsWith('Key') ? code[3] : code.startsWith('Digit') ? code[5] : null;
          if (ch) ol.inputCode += ch.toUpperCase();
        }
        if (code === 'Enter' && ol.inputCode.length === 4) {
          NetworkManager.joinRoom(ol.inputCode);
          ol.phase = 'connecting_join';
        }
      }
    }
    if (ol.phase === 'create_or_join' && Input.wasPressed('KeyJ')) { ol.phase = 'joining'; ol.inputCode = ''; }
    if (ol.phase === 'in_lobby') {
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
        // Both in lobby: go to character select, then online game
        this._startCharSelect('online');
      }
    }
  }

  _drawOnlineLobby(ctx) {
    const ol = this._ol;
    ctx.fillStyle = '#0d0d1a'; ctx.fillRect(0,0,C.W,C.H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00CCFF';
    ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
    ctx.fillText('🌐 ONLINE MATCH', C.W/2, 44);
    ctx.fillStyle = '#444'; ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText(`Server: ${ol.serverUrl}`, C.W/2, 60);

    const cy = C.H/2;
    switch(ol.phase) {
      case 'connect':
        ctx.fillStyle = '#888'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText('🔌 Connecting to server…', C.W/2, cy);
        break;
      case 'create_or_join':
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Segoe UI, Arial, sans-serif';
        ctx.fillText('Connected! 🎉', C.W/2, cy-30);
        ctx.fillStyle = '#00CCFF'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText('Press  C  to CREATE a room', C.W/2, cy+10);
        ctx.fillStyle = '#88EEFF';
        ctx.fillText('Press  J  to JOIN a room', C.W/2, cy+35);
        break;
      case 'waiting':
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px Segoe UI, Arial, sans-serif';
        ctx.fillText(ol.code, C.W/2, cy-10);
        ctx.fillStyle = '#aaa'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText('Share this code with your friend 📋', C.W/2, cy+18);
        ctx.fillText('Waiting for them to join…', C.W/2, cy+36);
        break;
      case 'joining':
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Segoe UI, Arial, sans-serif';
        ctx.fillText('Enter room code:', C.W/2, cy-20);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 40px Segoe UI, Arial, sans-serif';
        ctx.fillText(ol.inputCode.padEnd(4,'_'), C.W/2, cy+20);
        ctx.fillStyle = '#666'; ctx.font = '11px Segoe UI, Arial, sans-serif';
        ctx.fillText('type the 4-letter code  ·  ENTER to join', C.W/2, cy+48);
        break;
      case 'connecting_join':
        ctx.fillStyle = '#888'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText(`Joining room ${ol.inputCode}…`, C.W/2, cy);
        break;
      case 'in_lobby': {
        const ready = NetworkManager.opponentReady || !ol.isHost;
        ctx.fillStyle = '#44FF88'; ctx.font = 'bold 14px Segoe UI, Arial, sans-serif';
        ctx.fillText('✅ Both players connected!', C.W/2, cy-20);
        ctx.fillStyle = '#fff'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText(`Room: ${ol.code}  ·  You are P${NetworkManager.playerIndex+1}`, C.W/2, cy+8);
        const pulse = 0.5+0.5*Math.sin(Date.now()/350);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
        ctx.fillText('ENTER to select characters & start!', C.W/2, cy+36);
        ctx.globalAlpha = 1;
        break;
      }
      case 'error':
        ctx.fillStyle = '#FF4444'; ctx.font = 'bold 14px Segoe UI, Arial, sans-serif';
        ctx.fillText(`⚠️ ${ol.errorMsg}`, C.W/2, cy-10);
        ctx.fillStyle = '#888'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText('ESC to go back', C.W/2, cy+20);
        break;
    }

    ctx.fillStyle = '#333'; ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText('ESC back', C.W/2, C.H-12);
    ctx.textAlign = 'left';
  }

  // ---- How To Play ----
  _updateHowToPlay() {
    const N = 5;
    if (Input.wasPressed('ArrowLeft')  || Input.wasPressed('KeyA')) this._htpPage = (this._htpPage - 1 + N) % N;
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD')) this._htpPage = (this._htpPage + 1) % N;
    if (Input.wasPressed('Escape') || Input.wasPressed('Enter'))    this.state = C.STATE.MENU;
  }

  _drawHowToPlay(ctx) {
    if (this._htpPage === undefined) this._htpPage = 0;
    const page = this._htpPage;

    ctx.fillStyle = '#0d0d1a'; ctx.fillRect(0,0,C.W,C.H);

    const PAGES = [
      {
        title: '🏐 CLASSIC MATCH', col: C.COL.P1_HUD,
        lines: [
          '  First player to score 11 points wins.',
          '',
          '  ⚡ POWER BAR — charges by catching & hitting.',
          '  When full, your next throw uses your signature',
          '  superpower (Rocket, Curve, Double or Shadow).',
          '',
          '  🛡️ SHIELD — block one incoming ball.',
          '  30-second recharge after use.',
          '',
          '  🎯 CATCH — press catch just before impact.',
          '  Missed catch = brief stun.',
          '',
          '  Wall & ceiling bounces keep attribution.',
          '  Only a ground bounce resets the thrower.',
        ],
      },
      {
        title: '💀 HORDE MODE', col: '#FF6600',
        lines: [
          '  Co-op wave survival — both players vs AI.',
          '',
          '  🌊 10 waves of enemies, each harder than last.',
          '  Ninja 🥷  |  Brute 👹  |  Ghost 👻',
          '',
          '  💰 Score per kill: 10 × wave number.',
          '  Catch a thrown ball for bonus AP.',
          '',
          '  ❤️  Restore 1 HP on wave clear.',
          '',
          '  🔥 Wave 10 boss: THE OVERLORD',
          '  15 HP, spread shots, charge attacks.',
          '  Defeat him to achieve total victory.',
        ],
      },
      {
        title: '⚙️ CONTROLS', col: '#AAAAAA',
        lines: [
          '  JACO (P1)         LUCY (P2)',
          '  ──────────────────────────',
          '  A/D  move         ← / →',
          '  W    jump         ↑',
          '  S    crouch       ↓',
          '  Hold F  throw     Hold K',
          '  W/S  aim while    ↑/↓',
          '  G    catch        L',
          '  H    shield       O',
          '',
          '  ★  Superpower fires automatically on throw',
          '     when the power bar is full.',
          '  ⚙️  Remap any key in CONTROLS menu.',
        ],
      },
    ];

    const pg = PAGES[page];

    // Header
    ctx.textAlign = 'center';
    ctx.fillStyle = pg.col;
    ctx.font = 'bold 20px Segoe UI, Arial, sans-serif';
    ctx.fillText(pg.title, C.W/2, 42);

    // Separator
    ctx.fillStyle = pg.col;
    ctx.fillRect(C.W/2 - 200, 52, 400, 2);

    // Content
    ctx.fillStyle = '#ccc'; ctx.font =  '11px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'left';
    pg.lines.forEach((line, i) => {
      if (line.startsWith('  ──')) ctx.fillStyle = '#444';
      else if (line === '') ctx.fillStyle = '#ccc';
      else ctx.fillStyle = '#ccc';
      ctx.fillText(line, 80, 78 + i * 22);
    });

    // Page dots
    const N = PAGES.length;
    for (let i = 0; i < N; i++) {
      ctx.fillStyle = i === page ? pg.col : '#333';
      ctx.beginPath();
      ctx.arc(C.W/2 - (N-1)*14 + i*28, C.H-28, 5, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#444'; ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText('← → to browse pages  ·  ESC / ENTER back', C.W/2, C.H-10);
    ctx.textAlign = 'left';
  }

  // ---- Arena Builder ----
  _startBuilder() {
    this._builder = new ArenaBuilder(this.canvas);
    this.state = C.STATE.ARENA_BUILDER;
  }

  // ---- Game ----
  _startGame(idx) {
    this.arenaIndex = idx;
    this.arena = ARENAS[idx];
    this.p1.score = 0; this.p2.score = 0;
    this._startRound(0);
    this.state = C.STATE.PLAYING;
    // Battle cry banner
    this._battleCryTimer = 2200;
    const _CRIES = {
      'Jaco':['LET\'S ROLL!','TIME TO DODGE!','I WAS BORN FOR THIS!'],
      'Lucy':['TASTE MY THROW!','DODGE THIS!','NO MERCY!'],
    };
    const n1 = this.p1.charName || 'P1';
    const cries1 = _CRIES[n1] || [`${n1}: BRING IT ON!`];
    this._battleCryText = cries1[Math.floor(Math.random()*cries1.length)];
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
    this._splitBalls = [];
    this._blazeHazards = [];
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

  _spawnSplitBalls(x, y, vx, vy, throwerIndex) {
    // 3 mini balls — same forward direction with very slight vertical spread
    const spd = Math.sqrt(vx*vx + vy*vy) * 1.15;
    const baseAngle = Math.atan2(vy, vx);
    const offsets = [-0.10, 0, 0.10];
    for (const offset of offsets) {
      const b = new Ball();
      b.throw(x, y, Math.cos(baseAngle+offset)*spd, Math.sin(baseAngle+offset)*spd, false, false);
      b.lastThrower = throwerIndex;
      b.mini = true;
      b.radius = C.BALL_R * 0.45;
      this._splitBalls.push(b);
    }
  }

  _updatePlaying(dt) {
    if (Input.wasPressed('Escape')) { this.state = C.STATE.MENU; Particles.clear(); return; }
    // Online: send our input and tick the remote input edge-detector
    if (this._onlineMode) { NetworkManager.sendInput(); NetworkManager.tick(); }
    Particles.update(dt);
    if (this._p1ScoreFlash > 0) this._p1ScoreFlash -= dt;
    if (this._p2ScoreFlash > 0) this._p2ScoreFlash -= dt;
    if (this._battleCryTimer > 0) this._battleCryTimer -= dt;
    this.arena.update(dt);
    const obs = this.arena.getObstacles();
    const speedMult = this.arena.playerSpeedMult ?? 1;
    this.p1.update(dt, this.ball, obs, this.p2, speedMult);
    this.p2.update(dt, this.ball, obs, this.p1, speedMult);
    const bGravMult = this.arena.ballGravityMult ?? 1;

    // Wire seeker target + blaze/split callbacks before update
    if (this.ball.seeker && !this.ball._seekerTargetFn) {
      const opp = this.ball.lastThrower === 0 ? this.p2 : this.p1;
      this.ball._seekerTargetFn = () => opp.x;
    }
    if (this.ball.blaze && !this.ball.blazeDeathCb) {
      this.ball.blazeDeathCb = (x, y) => this._blazeHazards.push({ x, y, timer: 2200 });
    }
    if (this.ball.split && !this.ball.splitCb) {
      this.ball.splitCb = (x, y, vx, vy, thr) => this._spawnSplitBalls(x, y, vx, vy, thr);
    }

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

    // Split mini-balls
    for (let i = this._splitBalls.length - 1; i >= 0; i--) {
      const sb = this._splitBalls[i];
      if (sb.seeker && !sb._seekerTargetFn) {
        const opp = sb.lastThrower === 0 ? this.p2 : this.p1;
        sb._seekerTargetFn = () => opp.x;
      }
      sb.update(dt, obs, bGravMult);
      if (!this.roundOver) {
        for (const [player, other] of [[this.p1, this.p2],[this.p2, this.p1]]) {
          if (!sb.checkHit(player)) continue;
          if (player.shieldActive) { sb.vx = -sb.vx*1.15; sb.vy *= -0.5; player.shieldActive=false; player.shieldAvailable=false; player.shieldCooldown=C.SHIELD_RECHARGE; }
          else player._getHit(sb, other);
          break;
        }
      }
      if (sb.dead) this._splitBalls.splice(i, 1);
    }

    // Blaze hazards — tick and check player contact
    for (let i = this._blazeHazards.length - 1; i >= 0; i--) {
      const h = this._blazeHazards[i];
      h.timer -= dt;
      if (h.timer <= 0) { this._blazeHazards.splice(i, 1); continue; }
      Particles.emit(h.x, h.y, 1, ['#FF4400','#FF8800'], { upBias:1.5, minSpeed:0.4, maxSpeed:1.5, gravity:0.04 });
      if (!this.roundOver) {
        for (const [player, other] of [[this.p1,this.p2],[this.p2,this.p1]]) {
          const dx = player.x - h.x, dy = player.y - h.y;
          if (Math.sqrt(dx*dx+dy*dy) < 22) { this._onHit(player, other); break; }
        }
      }
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
      this._as_p1Ready = false; this._as_p2Ready = false;
    }
    if (Input.wasPressed('Escape')) { this.state = C.STATE.MENU; Particles.clear(); }
  }

  _drawGame(ctx) {
    this.arena.draw(ctx);

    this.p1.draw(ctx, this.ball);
    this.p2.draw(ctx, this.ball);
    this.ball.draw(ctx);
    if (this.ball2) this.ball2.draw(ctx);
    for (const sb of this._splitBalls) sb.draw(ctx);
    // Blaze hazards — fire pool on the ground
    for (const h of this._blazeHazards) {
      const alpha = Math.min(1, h.timer / 400) * 0.75;
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 120);
      ctx.globalAlpha = alpha * pulse;
      ctx.fillStyle = '#FF4400';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 22, 8, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF8800';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 12, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

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
      ctx.font = 'bold 28px Segoe UI, Arial, sans-serif';
      const wp    = this.roundWinner === 0 ? this.p1 : this.p2;
      const wName = wp.charName || (this.roundWinner === 0 ? C.P1_NAME : C.P2_NAME);
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
        ctx.font = `bold ${sz}px Segoe UI, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(score, fx, C.H / 2 + 10);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
    ctx.textAlign = 'left';

    // Battle cry banner at match start
    if (this._battleCryTimer > 0 && this._battleCryText) {
      const t = Math.min(1, this._battleCryTimer / 600);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 26px Segoe UI, Arial, sans-serif';
      ctx.fillText(this._battleCryText, C.W / 2, 54);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  _drawGameOver(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, C.W, C.H);

    const winner = this.p1.score >= C.WIN_SCORE ? this.p1 : this.p2;
    const loser  = winner === this.p1 ? this.p2 : this.p1;
    const wName  = winner.charName || (winner.index === 0 ? C.P1_NAME : C.P2_NAME);
    const lName  = loser.charName  || (loser.index  === 0 ? C.P1_NAME : C.P2_NAME);
    const wCol   = winner.index === 0 ? C.COL.P1_HUD : C.COL.P2_HUD;
    const _WIN_QUIPS = {
      'Jaco':['Too easy!','Gotta be faster than that.','Jaco always wins!'],
      'Lucy':['Never doubted myself.','Speed wins every time.','Too slow!'],
    };
    const _LOSE_QUIPS = {
      'Jaco':['Next time…','I slipped, that\'s all.','Rematch!'],
      'Lucy':['Fine. You got lucky.','I\'ll remember this.','Again!'],
    };
    const wQ = (_WIN_QUIPS[wName]  || ['Victory!'])[Math.floor(Math.random()*3)%1];
    const lQ = (_LOSE_QUIPS[lName] || ['…'])[Math.floor(Math.random()*3)%1];

    ctx.textAlign = 'center';
    ctx.fillStyle = wCol;
    ctx.font = 'bold 46px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${wName} WINS!`, C.W / 2, C.H / 2 - 38);

    // Win quip
    ctx.fillStyle = '#FFD700';
    ctx.font = 'italic 15px Segoe UI, Arial, sans-serif';
    ctx.fillText(`"${wQ}"`, C.W / 2, C.H / 2 - 12);

    ctx.fillStyle = '#ddd';
    ctx.font = '24px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${this.p1.score}  —  ${this.p2.score}`, C.W / 2, C.H / 2 + 18);

    // Defeat quip
    ctx.fillStyle = '#888';
    ctx.font = 'italic 13px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${lName}: "${lQ}"`, C.W / 2, C.H / 2 + 42);

    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 400);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff';
    ctx.font = '15px Segoe UI, Arial, sans-serif';
    ctx.fillText('ENTER = rematch · R = new arena · ESC = menu', C.W / 2, C.H / 2 + 72);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
