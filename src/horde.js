// ── Horde mode: wave-based co-op survival ────────────────────────────────────

const HORDE_WAVES = [
  { label: 'ZOMBIES',          spawnInterval: 1500, enemies: [{ type: 'zombie',      count: 6  }] },
  { label: 'MORE ZOMBIES',     spawnInterval: 1200, enemies: [{ type: 'zombie',      count: 10 }] },
  { label: 'FAST ZOMBIES',     spawnInterval: 1000, enemies: [{ type: 'fast_zombie', count: 7  }] },
  { label: 'MIXED HORDE',      spawnInterval: 950,  enemies: [{ type: 'fast_zombie', count: 5  }, { type: 'zombie',      count: 4 }] },
  { label: 'NINJAS',           spawnInterval: 900,  enemies: [{ type: 'ninja',       count: 7  }] },
  { label: 'NINJAS + ZOMBIES', spawnInterval: 850,  enemies: [{ type: 'ninja',       count: 6  }, { type: 'zombie',      count: 5 }] },
  { label: 'DINOSAURS',        spawnInterval: 1200, enemies: [{ type: 'dino',        count: 5  }, { type: 'ninja',       count: 3 }] },
  { label: 'HEAVY ASSAULT',    spawnInterval: 1000, enemies: [{ type: 'dino',        count: 6  }, { type: 'ninja',       count: 4 }] },
  { label: 'SPAGHETTI CHAOS',  spawnInterval: 1000, enemies: [{ type: 'fsm',         count: 4  }, { type: 'ninja',       count: 5 }] },
  { label: 'EVERYTHING',       spawnInterval: 750,  enemies: [{ type: 'fsm',         count: 4  }, { type: 'dino',        count: 4 }, { type: 'ninja', count: 5 }] },
];

const ENEMY_DEFS = {
  zombie:      { speed: 0.65, hp: 1, w: 20, h: 44, throwInterval: 3200, throwSpeed: 3.5, color: '#4A8A3C', pants: '#3A2A1A' },
  fast_zombie: { speed: 1.75, hp: 1, w: 20, h: 44, throwInterval: 2000, throwSpeed: 5.0, color: '#3A7A5C', pants: '#4A3A7A' },
  ninja:       { speed: 2.3,  hp: 1, w: 16, h: 44, throwInterval: 1100, throwSpeed: 9.0, color: '#181818', pants: '#101010' },
  dino:        { speed: 1.1,  hp: 2, w: 30, h: 54, throwInterval: 2400, throwSpeed: 6.0, color: '#3A8A3A', pants: '#2A6A2A' },
  fsm:         { speed: 0.9,  hp: 2, w: 32, h: 44, throwInterval: 1800, throwSpeed: 7.0, color: '#C8A060', pants: '#A06030', floats: true },
};

// ── Enemy ball ────────────────────────────────────────────────────────────────
class EnemyBall {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.dead = false;
    this.groundBounces = 0;
  }

  update() {
    this.vy += C.BALL_GRAVITY;
    this.x += this.vx; this.y += this.vy;
    if (this.x < -40 || this.x > C.W + 40) { this.dead = true; return; }
    if (this.y + C.BALL_R >= C.GROUND) {
      this.y = C.GROUND - C.BALL_R;
      if (this.groundBounces < 1) {
        this.vy = -Math.abs(this.vy) * 0.5; this.vx *= 0.75; this.groundBounces++;
        if (Math.abs(this.vy) < 1) this.dead = true;
      } else { this.dead = true; }
    }
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.shadowColor = '#FF4444'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#AA0000';
    ctx.beginPath(); ctx.arc(this.x, this.y, C.BALL_R * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#FF6666'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
}

// ── Enemy ─────────────────────────────────────────────────────────────────────
class Enemy {
  constructor(x, type) {
    this.x = x; this.y = C.GROUND; this.type = type;
    this.def = ENEMY_DEFS[type];
    this.hp = this.def.hp; this.maxHp = this.def.hp;
    this.w = this.def.w; this.h = this.def.h;
    this.vy = 0; this.onGround = true; this.dead = false;
    this._flashTimer = 0; this._floatOffset = Math.random() * Math.PI * 2;
    this.throwTimer = this.def.throwInterval * (0.4 + Math.random() * 0.6);
    this._legAnim = Math.random() * Math.PI * 2;
  }

  update(dt, players, enemyBalls) {
    if (this.dead) return;
    if (this._flashTimer > 0) this._flashTimer -= dt;
    this._legAnim += dt * 0.012;
    const def = this.def;
    if (def.floats) {
      this.x -= def.speed;
      this.y = (C.GROUND - 90) - 28 * Math.abs(Math.sin(Date.now() * 0.002 + this._floatOffset));
    } else {
      this.x -= def.speed;
      if (!this.onGround) {
        this.vy += C.GRAVITY; this.y += this.vy;
        if (this.y >= C.GROUND) { this.y = C.GROUND; this.vy = 0; this.onGround = true; }
      }
    }
    this.throwTimer -= dt;
    if (this.throwTimer <= 0 && players.length > 0) {
      this.throwTimer = def.throwInterval * (0.8 + Math.random() * 0.4);
      let target = players[0];
      for (const p of players) { if (Math.abs(this.x - p.x) < Math.abs(this.x - target.x)) target = p; }
      const dx = target.x - this.x, dy = (target.y - 22) - (this.y - this.h * 0.55);
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      enemyBalls.push(new EnemyBall(this.x - this.w * 0.5, this.y - this.h * 0.6,
        (dx / len) * def.throwSpeed, (dy / len) * def.throwSpeed - 1.5));
    }
    if (this.x < -60) this.dead = true;
  }

  takeBall(ball) {
    this.hp--; this._flashTimer = 200;
    ball.dead = true; ball.inFlight = false; ball.vx = 0; ball.vy = 0; ball.spinning = false;
    if (this.hp <= 0) { this.dead = true; return true; }
    return false;
  }

  get rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  draw(ctx) {
    if (this.dead) return;
    const flash = this._flashTimer > 0 && Math.floor(this._flashTimer / 50) % 2 === 0;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    if (flash) ctx.globalAlpha = 0.35;
    switch (this.type) {
      case 'zombie': case 'fast_zombie': this._drawZombie(ctx); break;
      case 'ninja': this._drawNinja(ctx); break;
      case 'dino':  this._drawDino(ctx);  break;
      case 'fsm':   this._drawFSM(ctx);   break;
    }
    if (this.maxHp > 1) {
      ctx.fillStyle = '#550000'; ctx.fillRect(-this.w / 2, -this.h - 9, this.w, 5);
      ctx.fillStyle = '#FF3333'; ctx.fillRect(-this.w / 2, -this.h - 9, this.w * (this.hp / this.maxHp), 5);
    }
    ctx.restore();
  }

  _drawZombie(ctx) {
    const d = this.def, h = this.h, w = this.w, leg = Math.sin(this._legAnim) * 4;
    Sprites.px(ctx, d.pants, -w*.45, -h*.35, w*.42, h*.35+leg); Sprites.px(ctx, d.pants, w*.03, -h*.35, w*.42, h*.35-leg);
    Sprites.px(ctx, '#1A1A1A', -w*.5, -h*.08, w*.44, h*.09); Sprites.px(ctx, '#1A1A1A', w*.02, -h*.08, w*.44, h*.09);
    Sprites.px(ctx, '#888', -w/2, -h*.75, w, h*.40);
    Sprites.px(ctx, d.color, -w/2-10, -h*.68, 13, 7); Sprites.px(ctx, d.color, w/2-1, -h*.68, 13, 7);
    Sprites.px(ctx, d.color, -w/2+2, -h, w-4, h*.27);
    ctx.fillStyle = '#FF2222';
    ctx.fillRect(-6,-h+3,3,3); ctx.fillRect(-3,-h+6,3,3); ctx.fillRect(2,-h+3,3,3); ctx.fillRect(5,-h+6,3,3);
    if (this.type === 'fast_zombie') {
      ctx.strokeStyle='rgba(140,140,255,.75)'; ctx.lineWidth=1.5; ctx.setLineDash([2,2]);
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(w/2+3,-h*(.3+i*.15));ctx.lineTo(w/2+12,-h*(.3+i*.15));ctx.stroke();}
      ctx.setLineDash([]);
    }
  }

  _drawNinja(ctx) {
    const h = this.h, w = this.w, leg = Math.sin(this._legAnim) * 5;
    Sprites.px(ctx,'#111',-w*.45,-h*.35,w*.42,h*.35+leg); Sprites.px(ctx,'#111',w*.03,-h*.35,w*.42,h*.35-leg);
    Sprites.px(ctx,'#111',-w/2,-h*.75,w,h*.42); Sprites.px(ctx,'#DDD',-w/2,-h*.44,w,3);
    Sprites.px(ctx,'#111',-w/2-8,-h*.68,10,7); Sprites.px(ctx,'#111',w/2-2,-h*.68,10,7);
    Sprites.px(ctx,'#111',-w/2+1,-h,w-2,h*.27); Sprites.px(ctx,'#EEE',-w/2+1,-h+2,w-2,h*.09);
    ctx.fillStyle='#FF4400'; ctx.fillRect(-5,-h+h*.14,10,4);
  }

  _drawDino(ctx) {
    const d=this.def,h=this.h,w=this.w,leg=Math.sin(this._legAnim)*4;
    Sprites.px(ctx,d.pants,-w*.3,-h*.28,w*.27,h*.28+leg); Sprites.px(ctx,d.pants,w*.04,-h*.28,w*.27,h*.28-leg);
    Sprites.px(ctx,d.color,-w/2,-h*.82,w,h*.54);
    Sprites.px(ctx,d.color,-w/2-7,-h*.77,9,7); Sprites.px(ctx,d.color,w/2-2,-h*.75,9,7);
    Sprites.px(ctx,d.color,w/2,-h*.5,14,11); Sprites.px(ctx,d.color,w/2+12,-h*.42,9,8);
    Sprites.px(ctx,d.color,-w/2+2,-h,w*.72,h*.22);
    ctx.fillStyle='#FFD700'; ctx.fillRect(-w*.08,-h*.96,7,7);
    ctx.fillStyle='#000'; ctx.fillRect(-w*.05,-h*.93,3,3);
    ctx.fillStyle='#FFF'; for(let i=0;i<3;i++) ctx.fillRect(-w*.42+i*8,-h*.80,5,7);
  }

  _drawFSM(ctx) {
    const d=this.def,h=this.h,w=this.w,t=Date.now()*.003+this._floatOffset;
    ctx.strokeStyle=d.color; ctx.lineWidth=5;
    for(let n=0;n<3;n++){
      ctx.beginPath(); const ox=-w*.3+n*w*.3;
      for(let i=0;i<=8;i++){const nx=ox+Math.sin(t+i*.9+n)*7,ny=-h*.3+(i/8)*h*.32; i===0?ctx.moveTo(nx,ny):ctx.lineTo(nx,ny);}
      ctx.stroke();
    }
    ctx.fillStyle='#8B2A1A';
    ctx.beginPath();ctx.arc(-w*.25,-h*.72,10,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(w*.25,-h*.72,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FFF';
    ctx.beginPath();ctx.arc(-w*.25,-h*.72,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(w*.25,-h*.72,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath();ctx.arc(-w*.25+1,-h*.72,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(w*.25+1,-h*.72,2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=d.color; ctx.lineWidth=4;
    for(let n=0;n<2;n++){
      ctx.beginPath();
      for(let i=0;i<=6;i++){const nx=-w/2+(i/6)*w,ny=-h*.6+Math.sin(t+i*1.2+n*2)*6; i===0?ctx.moveTo(nx,ny):ctx.lineTo(nx,ny);}
      ctx.stroke();
    }
  }
}

// ── HordeGame ─────────────────────────────────────────────────────────────────
class HordeGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.p1 = new Player(0, 140, Controls.p1);
    this.p2 = new Player(1, 260, Controls.p2);
    this.p1.noMidline = true; this.p1.hordeMode = true; this.p1.dir = 1;
    this.p2.noMidline = true; this.p2.hordeMode = true; this.p2.dir = 1;

    // Each player has their own ball
    this.p1Ball = new Ball(); this.p1Ball.reset(0); this.p1.hasBall = true;
    this.p2Ball = new Ball(); this.p2Ball.reset(1); this.p2.hasBall = true;
    this._p1BallTimer = 0; this._p2BallTimer = 0;

    // Extra balls from double power
    this._extraBalls = [];

    this.p1.extraThrowCallback = (x, y, vx, vy, idx) => {
      const b = new Ball(); b.throw(x, y, vx, vy, false, false); b.lastThrower = idx; this._extraBalls.push(b);
    };
    this.p2.extraThrowCallback = (x, y, vx, vy, idx) => {
      const b = new Ball(); b.throw(x, y, vx, vy, false, false); b.lastThrower = idx; this._extraBalls.push(b);
    };

    this.p1Hp = 3; this.p2Hp = 3;
    this.p1Fallen = false; this.p2Fallen = false;

    this.enemies = [];
    this.enemyBalls = [];

    this.wave = 0;
    this.waveState = 'countdown';
    this.waveTimer = 2400;
    this._spawnQueue = [];
    this._spawnTimer = 0;

    this.arena = ARENAS[0];
    this.score = 0;
    this.returnToMenu = false;
  }

  update(dt) {
    if (Input.wasPressed('Escape')) { this.returnToMenu = true; return; }
    if (this.waveState === 'game_over' || this.waveState === 'victory') {
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
        this.returnToMenu = true;
      }
      return;
    }

    this.arena.update(dt);
    const obs = this.arena.getObstacles();

    // Position held balls before player update
    this._positionHeld(this.p1Ball, this.p1);
    this._positionHeld(this.p2Ball, this.p2);

    // Player updates (each with their own ball)
    if (!this.p1Fallen) this.p1.update(dt, this.p1Ball, obs, this.p2);
    if (!this.p2Fallen) this.p2.update(dt, this.p2Ball, obs, this.p1);

    // Ball physics
    this.p1Ball.update(dt, obs);
    this.p2Ball.update(dt, obs);

    // Ball respawn when dead
    this._tickBallRespawn(dt, this.p1Ball, this.p1, '_p1BallTimer', 0);
    this._tickBallRespawn(dt, this.p2Ball, this.p2, '_p2BallTimer', 1);

    // Extra balls (double power)
    for (let i = this._extraBalls.length - 1; i >= 0; i--) {
      const b = this._extraBalls[i];
      b.update(dt, obs);
      this._checkBallVsEnemies(b);
      if (b.dead) this._extraBalls.splice(i, 1);
    }

    // Player balls vs enemies
    if (this.p1Ball.inFlight && !this.p1Ball.dead) this._checkBallVsEnemies(this.p1Ball);
    if (this.p2Ball.inFlight && !this.p2Ball.dead) this._checkBallVsEnemies(this.p2Ball);

    // Enemy balls vs players
    for (const eb of this.enemyBalls) {
      eb.update();
      if (!eb.dead) this._checkEnemyBallVsPlayers(eb);
    }
    this.enemyBalls = this.enemyBalls.filter(b => !b.dead);

    // Enemy movement + contact damage
    if (this.waveState === 'spawning' || this.waveState === 'fighting') {
      const alive = [this.p1, this.p2].filter((p, i) => ![this.p1Fallen, this.p2Fallen][i]);
      for (const e of this.enemies) {
        e.update(dt, alive, this.enemyBalls);
        if (!e.dead) this._checkEnemyContact(e);
      }
      this.enemies = this.enemies.filter(e => !e.dead);
    }

    this._tickWave(dt);
  }

  _positionHeld(ball, player) {
    if (!ball.inFlight && !ball.dead && player.hasBall) {
      ball.x = player.x + player.dir * 22;
      ball.y = player.y - 34;
    }
  }

  _tickBallRespawn(dt, ball, player, timerKey, holderIdx) {
    if (ball.dead) {
      this[timerKey] += dt;
      if (this[timerKey] >= 900 && !([this.p1Fallen, this.p2Fallen][holderIdx])) {
        this[timerKey] = 0;
        ball.reset(holderIdx);
        player.hasBall = true;
      }
    } else {
      this[timerKey] = 0;
    }
  }

  _checkBallVsEnemies(ball) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const r = e.rect;
      if (ball.x + C.BALL_R > r.x && ball.x - C.BALL_R < r.x + r.w &&
          ball.y + C.BALL_R > r.y && ball.y - C.BALL_R < r.y + r.h) {
        const killed = e.takeBall(ball);
        this.score += killed ? 10 : 2;
        if (killed) {
          const thrower = ball.lastThrower === 0 ? this.p1 : ball.lastThrower === 1 ? this.p2 : null;
          if (thrower) thrower.spCharge = Math.min(C.SP_CHARGE_MAX, thrower.spCharge + C.SP_CHARGE_HIT);
        }
        break;
      }
    }
  }

  _checkEnemyBallVsPlayers(eb) {
    for (const [player, fallen] of [[this.p1, this.p1Fallen], [this.p2, this.p2Fallen]]) {
      if (fallen || player.stunTimer > 0) continue;
      const hitH = player.crouching ? C.CROUCH_H : C.P_H;
      if (eb.x + C.BALL_R > player.x - C.P_W / 2 - 3 && eb.x - C.BALL_R < player.x + C.P_W / 2 + 3 &&
          eb.y + C.BALL_R > player.y - hitH           && eb.y - C.BALL_R < player.y + 4) {
        if (player.shieldActive) {
          eb.vx = -eb.vx * 1.1; eb.vy = Math.min(eb.vy * -0.5, -1);
          player.shieldActive = false; player.shieldAvailable = false; player.shieldCooldown = C.SHIELD_RECHARGE;
        } else {
          eb.dead = true;
          this._hitPlayer(player);
        }
        break;
      }
    }
  }

  _checkEnemyContact(enemy) {
    for (const [player, fallen] of [[this.p1, this.p1Fallen], [this.p2, this.p2Fallen]]) {
      if (fallen || player.stunTimer > 0) continue;
      const er = enemy.rect;
      const hitH = player.crouching ? C.CROUCH_H : C.P_H;
      if (er.x < player.x + C.P_W / 2 && er.x + er.w > player.x - C.P_W / 2 &&
          er.y < player.y              && er.y + er.h  > player.y - hitH) {
        enemy.dead = true;
        this._hitPlayer(player);
        break;
      }
    }
  }

  _hitPlayer(player) {
    const isP1 = player === this.p1;
    if (isP1) { this.p1Hp = Math.max(0, this.p1Hp - 1); if (this.p1Hp <= 0) this.p1Fallen = true; }
    else       { this.p2Hp = Math.max(0, this.p2Hp - 1); if (this.p2Hp <= 0) this.p2Fallen = true; }
    player.stunTimer = this.p1Fallen || this.p2Fallen ? 0 : 900;
    player.vx = 4; player.vy = -5;
    if (this.p1Fallen && this.p2Fallen) this.waveState = 'game_over';
  }

  _tickWave(dt) {
    switch (this.waveState) {
      case 'countdown':
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) this._beginWave();
        break;
      case 'spawning':
        this._spawnTimer -= dt;
        if (this._spawnQueue.length > 0 && this._spawnTimer <= 0) {
          this.enemies.push(new Enemy(C.W + 50 + Math.random() * 120, this._spawnQueue.shift()));
          this._spawnTimer = HORDE_WAVES[this.wave - 1].spawnInterval;
        }
        if (this._spawnQueue.length === 0) this.waveState = 'fighting';
        break;
      case 'fighting':
        if (this.enemies.length === 0) {
          this.waveState = this.wave >= HORDE_WAVES.length ? 'victory' : 'wave_end';
          this.waveTimer = 3200;
        }
        break;
      case 'wave_end':
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) { this.waveState = 'countdown'; this.waveTimer = 2400; }
        break;
    }
  }

  _beginWave() {
    this.wave++;
    const def = HORDE_WAVES[this.wave - 1];
    this._spawnQueue = def.enemies.flatMap(g => Array(g.count).fill(g.type));
    for (let i = this._spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._spawnQueue[i], this._spawnQueue[j]] = [this._spawnQueue[j], this._spawnQueue[i]];
    }
    this._spawnTimer = 500;
    this.waveState = 'spawning';
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, C.W, C.H);
    this.arena.draw(ctx);

    for (const e of this.enemies) e.draw(ctx);
    for (const eb of this.enemyBalls) eb.draw(ctx);

    // P1
    if (this.p1Fallen) {
      ctx.save(); ctx.globalAlpha = 0.22;
      this.p1.draw(ctx, this.p1Ball);
      ctx.restore();
    } else {
      this.p1.draw(ctx, this.p1Ball);
    }
    this.p1Ball.draw(ctx);

    // P2
    if (this.p2Fallen) {
      ctx.save(); ctx.globalAlpha = 0.22;
      this.p2.draw(ctx, this.p2Ball);
      ctx.restore();
    } else {
      this.p2.draw(ctx, this.p2Ball);
    }
    this.p2Ball.draw(ctx);

    for (const b of this._extraBalls) b.draw(ctx);

    this._drawHUD(ctx);
    this._drawOverlay(ctx);
  }

  // ── HUD: players left/right, wave info center ─────────────────────────────
  _drawHUD(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, C.W, 52);
    // dividers
    ctx.fillStyle = '#282828';
    ctx.fillRect(290, 2, 1, 48); ctx.fillRect(C.W - 291, 2, 1, 48);

    this._drawPlayerPanel(ctx, this.p1, this.p1Hp, this.p1Fallen, C.COL.P1_HUD, 'JACO', false);
    this._drawPlayerPanel(ctx, this.p2, this.p2Hp, this.p2Fallen, C.COL.P2_HUD, 'LUCY', true);

    // Center: wave + score + enemy count
    const cx = C.W / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px "Courier New"';
    ctx.fillText(`WAVE ${this.wave || '—'} / ${HORDE_WAVES.length}`, cx, 16);

    // Wave progress bar
    ctx.fillStyle = '#1A1A1A'; ctx.fillRect(cx - 48, 20, 96, 5);
    ctx.fillStyle = '#FFD700'; ctx.fillRect(cx - 48, 20, 96 * (this.wave / HORDE_WAVES.length), 5);

    ctx.fillStyle = '#aaa'; ctx.font = '11px "Courier New"';
    ctx.fillText(`${this.score} pts`, cx, 36);

    if (this.waveState === 'fighting' || this.waveState === 'spawning') {
      const rem = this.enemies.length + this._spawnQueue.length;
      ctx.fillStyle = rem > 6 ? '#FF8888' : '#FFBB44';
      ctx.font = '10px "Courier New"';
      ctx.fillText(`${rem} enemies left`, cx, 48);
    }

    // ESC hint
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.font = '8px "Courier New"';
    ctx.fillText('ESC · menu', cx, C.H - 6);
    ctx.textAlign = 'left';
  }

  _drawPlayerPanel(ctx, player, hp, fallen, col, name, right) {
    const x0 = right ? C.W - 288 : 8;

    if (fallen) {
      ctx.fillStyle = 'rgba(180,0,0,0.28)';
      ctx.fillRect(right ? C.W - 290 : 0, 0, 290, 52);
      ctx.fillStyle = '#FF4444'; ctx.font = 'bold 20px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('K.O.', right ? C.W - 145 : 145, 33);
      return;
    }

    // Name
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillStyle = col; ctx.font = 'bold 11px "Courier New"';
    ctx.fillText(name, right ? C.W - 8 : x0, 14);

    // HP hearts
    for (let i = 0; i < 3; i++) {
      const hx = right ? C.W - 70 - i * 20 : x0 + 46 + i * 20;
      ctx.fillStyle = i < hp ? '#EE2222' : '#222';
      ctx.beginPath(); ctx.arc(hx, 10, 7, 0, Math.PI * 2); ctx.fill();
      if (i < hp) {
        ctx.fillStyle = 'rgba(255,100,100,0.4)';
        ctx.beginPath(); ctx.arc(hx, 10, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF4444';
        ctx.beginPath(); ctx.arc(hx, 10, 5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // SP bar
    const barX = right ? C.W - 8 - 170 : x0;
    const spPct = Math.min(1, player.spCharge / C.SP_CHARGE_MAX);
    ctx.fillStyle = '#111'; ctx.fillRect(barX, 22, 170, 8);
    ctx.fillStyle = spPct >= 1 ? '#FFD700' : col;
    ctx.fillRect(barX, 22, 170 * spPct, 8);
    ctx.strokeStyle = '#2A2A2A'; ctx.lineWidth = 1; ctx.strokeRect(barX, 22, 170, 8);

    ctx.fillStyle = '#444'; ctx.font = '8px "Courier New"';
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText('PWR', right ? barX - 2 : barX + 174, 29);

    // Active power
    if (player._powerAssigned && player.spCharge >= C.SP_CHARGE_MAX) {
      const pcol = player.currentPower === 'rocket' ? C.COL.SP_ROCKET
                 : player.currentPower === 'double' ? C.COL.SP_DOUBLE : C.COL.SP_SHADOW;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 200);
      ctx.fillStyle = pcol; ctx.font = 'bold 10px "Courier New"';
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillText(`★ ${C.POWER_NAMES[player.currentPower]}`, right ? C.W - 8 : x0, 46);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'left';
  }

  // ── Overlays ──────────────────────────────────────────────────────────────
  _drawOverlay(ctx) {
    const isCountdown = this.waveState === 'countdown';
    const isWaveEnd   = this.waveState === 'wave_end';

    if (isCountdown || isWaveEnd) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(C.W / 2 - 200, C.H / 2 - 52, 400, 104);
      ctx.textAlign = 'center';

      if (this.wave === 0) {
        ctx.fillStyle = '#FF6600'; ctx.font = 'bold 26px "Courier New"';
        ctx.fillText('HORDE MODE', C.W / 2, C.H / 2 - 14);
        ctx.fillStyle = '#ccc'; ctx.font = '13px "Courier New"';
        ctx.fillText('Survive all 10 waves together!', C.W / 2, C.H / 2 + 10);
        ctx.fillStyle = '#666'; ctx.font = '11px "Courier New"';
        ctx.fillText('Each player has their own ball · 3 hits each', C.W / 2, C.H / 2 + 30);
      } else if (isWaveEnd) {
        ctx.fillStyle = '#88FF88'; ctx.font = 'bold 22px "Courier New"';
        ctx.fillText(`WAVE ${this.wave}  CLEAR!`, C.W / 2, C.H / 2 - 14);
        ctx.fillStyle = '#aaa'; ctx.font = '13px "Courier New"';
        ctx.fillText(`Score: ${this.score}`, C.W / 2, C.H / 2 + 12);
      } else {
        const nextDef = HORDE_WAVES[this.wave];
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 19px "Courier New"';
        ctx.fillText(`WAVE ${this.wave + 1}  ·  ${nextDef ? nextDef.label : ''}`, C.W / 2, C.H / 2 - 16);
        if (nextDef) {
          const total = nextDef.enemies.reduce((s, g) => s + g.count, 0);
          ctx.fillStyle = '#FF9999'; ctx.font = '12px "Courier New"';
          ctx.fillText(`${total} enemies incoming`, C.W / 2, C.H / 2 + 8);
        }
        ctx.fillStyle = '#555'; ctx.font = '11px "Courier New"';
        ctx.fillText(`Starting in ${Math.ceil(this.waveTimer / 1000)}…`, C.W / 2, C.H / 2 + 28);
      }
      ctx.textAlign = 'left';
    }

    if (this.waveState === 'victory') {
      ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, C.W, C.H);
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 24;
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 42px "Courier New"';
      ctx.fillText('VICTORY!', C.W / 2, C.H / 2 - 48);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#88FF88'; ctx.font = '18px "Courier New"'; ctx.fillText('All 10 waves survived!', C.W / 2, C.H / 2);
      ctx.fillStyle = '#FFF';    ctx.font = '18px "Courier New"'; ctx.fillText(`Final Score: ${this.score}`, C.W / 2, C.H / 2 + 36);
      ctx.fillStyle = '#555';    ctx.font = '12px "Courier New"'; ctx.fillText('ENTER  to return to menu', C.W / 2, C.H / 2 + 72);
      ctx.textAlign = 'left';
    }

    if (this.waveState === 'game_over') {
      ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, C.W, C.H);
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FF3333'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#FF3333'; ctx.font = 'bold 42px "Courier New"';
      ctx.fillText('GAME OVER', C.W / 2, C.H / 2 - 48);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ccc'; ctx.font = '16px "Courier New"';
      ctx.fillText(`Wave ${this.wave}  ·  ${HORDE_WAVES.length - this.wave} waves remaining`, C.W / 2, C.H / 2);
      ctx.fillStyle = '#FFF'; ctx.font = '18px "Courier New"'; ctx.fillText(`Score: ${this.score}`, C.W / 2, C.H / 2 + 36);
      ctx.fillStyle = '#555'; ctx.font = '12px "Courier New"'; ctx.fillText('ENTER  to return to menu', C.W / 2, C.H / 2 + 72);
      ctx.textAlign = 'left';
    }
  }
}
