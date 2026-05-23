class Arena {
  constructor(def) {
    Object.assign(this, def);
  }

  draw(ctx) {
    this._drawBackground(ctx);
    this._drawObstacles(ctx);
    this._drawGround(ctx);
  }

  _drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
    g.addColorStop(0, this.skyTop);
    g.addColorStop(1, this.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.W, C.GROUND);
    if (this.drawBg) this.drawBg(ctx);
  }

  _drawGround(ctx) {
    ctx.fillStyle = this.groundColor;
    ctx.fillRect(0, C.GROUND, C.W, C.H - C.GROUND);
    ctx.fillStyle = this.groundLine;
    ctx.fillRect(0, C.GROUND, C.W, 6);
  }

  _drawObstacles(ctx) {
    for (const obs of this.obstacles) {
      obs.draw(ctx);
    }
  }

  update(dt) {
    for (const obs of this.obstacles) {
      if (obs.update) obs.update(dt);
    }
  }

  getObstacles() { return this.obstacles; }
}

// Obstacle: solid rect that blocks ball and player
class Obstacle {
  constructor(x, y, w, h, drawFn, opts = {}) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this._draw = drawFn;
    this.absorb   = !!opts.absorb;
    this.slippery = !!opts.slippery;
    this.ballOnly = !!opts.ballOnly;
  }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  draw(ctx) { if (this._draw) this._draw(ctx, this); }
}

// Flying bird — ball-only dynamic obstacle
class BirdObstacle extends Obstacle {
  constructor(cx, cy, ampX, period) {
    super(cx - 20, cy - 8, 40, 16, null, { ballOnly: true });
    this._cx = cx;
    this._cy = cy;
    this._ampX = ampX;
    this._period = period;
    this._t = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this._t += (Math.PI * 2 / this._period) * dt;
    this.x = Math.round(this._cx + this._ampX * Math.sin(this._t) - this.w / 2);
    this.y = Math.round(this._cy + Math.sin(this._t * 2.1) * 10 - this.h / 2);
  }

  draw(ctx) {
    const flap = Math.sin(Date.now() / 120) * 5;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(Math.round(cx - 4), Math.round(cy - 2), 8, 5);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(cx - 4), Math.round(cy));
    ctx.lineTo(Math.round(cx - 18), Math.round(cy - flap));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Math.round(cx + 4), Math.round(cy));
    ctx.lineTo(Math.round(cx + 18), Math.round(cy - flap));
    ctx.stroke();
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(Math.round(cx + 4), Math.round(cy - 3), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF9900';
    ctx.fillRect(Math.round(cx + 6), Math.round(cy - 4), 4, 2);
  }
}

// Slowly-drifting debris rock — Moon arena (blocks both player and ball)
class DebrisRock extends Obstacle {
  constructor(x, y, size, speed) {
    super(x, y, size, size, null, {}); // blocks both players and ball
    this._cx = x; this._cy = y;
    this._size = size; this._speed = speed;
    this._rot = Math.random() * Math.PI * 2;
    this._rotSpeed = (Math.random() - 0.5) * 0.003;
  }

  update(dt) {
    this.x -= this._speed * (dt / 16);
    this._rot += this._rotSpeed * dt;
    if (this.x + this._size < -20) {
      this.x = C.W + 60 + Math.random() * 200;
      this.y = this._cy + (Math.random() - 0.5) * 40;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this._size / 2, this.y + this._size / 2);
    ctx.rotate(this._rot);
    const s = this._size;
    ctx.fillStyle = '#7A7A8E';
    ctx.beginPath();
    ctx.moveTo(-s/2+3, -s/2);
    ctx.lineTo(s/2, -s/2+4);
    ctx.lineTo(s/2-3, s/2-1);
    ctx.lineTo(-s/2+1, s/2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#A0A0B8';
    ctx.beginPath();
    ctx.moveTo(-s/4, -s/3);
    ctx.lineTo(s/5, -s/4);
    ctx.lineTo(s/6, s/6);
    ctx.lineTo(-s/5, s/5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(-s/6, -s/4, s/7, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

// Demon NPC — Upside-Down arena, shoots slow fire balls at both players
class DemonNPC {
  // inverted: true when players are on ceiling (fire balls thrown upward)
  constructor(x, y, inverted = false) {
    this.x = x; this.y = y;
    this.inverted = inverted;
    this.fireBalls = [];
    this._throwTimer = 2200 + Math.random() * 1800;
    this._animT = 0;
    this._lastTarget = 0;
  }

  update(dt) {
    this._animT += dt;
    this._throwTimer -= dt;
    if (this._throwTimer <= 0) {
      this._throwTimer = 2400 + Math.random() * 2000;
      this._lastTarget ^= 1;
      const dir = this._lastTarget === 0 ? -1 : 1;
      const angle = Math.PI * (0.25 + Math.random() * 0.35);
      // Inverted: throw fast upward; normal: throw at moderate speed
      const speed = this.inverted ? 5.5 + Math.random() * 1.5 : 1.8 + Math.random() * 1.4;
      const vySign = this.inverted ? 1 : -1; // inverted: +sin pushes down from ceiling toward players; wait — players are on ceiling so fire balls go UP
      // Actually: demon is at bottom, players at ceiling (y=90). Fire must go UP (negative vy).
      const vy0 = this.inverted ? -Math.sin(angle) * speed : -Math.sin(angle) * speed;
      this.fireBalls.push({
        x: this.x, y: this.y - 35,
        vx: dir * Math.cos(angle) * speed,
        vy: vy0,
        r: 8, dead: false, age: 0,
      });
    }
    const fbGrav = this.inverted ? 0.012 : 0.06; // inverted: very weak gravity so balls reach ceiling
    for (const fb of this.fireBalls) {
      if (fb.dead) continue;
      fb.vy += fbGrav; // slight pull downward in both modes
      fb.x += fb.vx; fb.y += fb.vy;
      fb.age += dt;
      const dead = fb.age > 5500 ||
                   (this.inverted ? fb.y < 85 : fb.y > C.GROUND + 30);
      if (dead) fb.dead = true;
    }
    this.fireBalls = this.fireBalls.filter(fb => !fb.dead);
  }

  draw(ctx) {
    // Fire balls
    for (const fb of this.fireBalls) {
      if (fb.dead) continue;
      ctx.save();
      ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#FF2200';
      ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath(); ctx.arc(fb.x - 2, fb.y - 2, fb.r * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    // Demon body
    const bob = Math.sin(this._animT * 0.002) * 4;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    // Shadow
    ctx.fillStyle = 'rgba(200,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 2, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Wings
    const wFlap = Math.sin(this._animT * 0.004) * 12;
    ctx.fillStyle = '#440011';
    ctx.beginPath();
    ctx.moveTo(-8, -30); ctx.quadraticCurveTo(-55, -60 + wFlap, -60, -25 + wFlap);
    ctx.quadraticCurveTo(-40, -10 + wFlap, -8, -20); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -30); ctx.quadraticCurveTo(55, -60 + wFlap, 60, -25 + wFlap);
    ctx.quadraticCurveTo(40, -10 + wFlap, 8, -20); ctx.fill();
    // Body
    ctx.fillStyle = '#880022';
    ctx.beginPath();
    ctx.ellipse(0, -22, 16, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#AA0033';
    ctx.beginPath();
    ctx.ellipse(0, -24, 12, 15, 0, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#AA0033';
    ctx.beginPath(); ctx.arc(0, -46, 14, 0, Math.PI * 2); ctx.fill();
    // Horns
    ctx.fillStyle = '#550011';
    ctx.beginPath(); ctx.moveTo(-8,-56); ctx.lineTo(-14,-72); ctx.lineTo(-4,-60); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8,-56); ctx.lineTo(14,-72); ctx.lineTo(4,-60); ctx.fill();
    // Eyes (glowing)
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#FF6600';
    ctx.beginPath(); ctx.arc(-5, -48, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -48, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-5, -48, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -48, 2, 0, Math.PI * 2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#FF2200'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -43, 6, 0.2, Math.PI - 0.2); ctx.stroke();
    // Arms stretched out ready to throw
    const pulse = 0.4 + 0.6 * Math.sin(this._animT * 0.003);
    ctx.strokeStyle = `rgba(255,100,0,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12, -28); ctx.lineTo(-32, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -28); ctx.lineTo(32, -18); ctx.stroke();
    ctx.restore();
  }

  checkPlayerHit(player) {
    if (player.stunTimer > 0) return false;
    const hitH = player.crouching ? C.CROUCH_H : C.P_H;
    const top    = player.invertGravity ? player.y       : player.y - hitH;
    const bottom = player.invertGravity ? player.y + hitH : player.y + 4;
    for (const fb of this.fireBalls) {
      if (fb.dead) continue;
      if (fb.x + fb.r > player.x - C.P_W / 2 - 4 &&
          fb.x - fb.r < player.x + C.P_W / 2 + 4 &&
          fb.y + fb.r > top &&
          fb.y - fb.r < bottom) {
        fb.dead = true;
        return true;
      }
    }
    return false;
  }

  checkBallHit(ball) {
    if (!ball.inFlight || ball.dead) return;
    for (const fb of this.fireBalls) {
      if (fb.dead) continue;
      const dx = ball.x - fb.x, dy = ball.y - fb.y;
      const d2 = dx * dx + dy * dy;
      const rSum = C.BALL_R + fb.r;
      if (d2 < rSum * rSum) {
        fb.dead = true;
        // Deflect ball away from fireball
        const dist = Math.sqrt(d2) || 1;
        const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.vx = (dx / dist) * spd * 0.8;
        ball.vy = (dy / dist) * spd * 0.8 - 1;
        ball.lastThrower = -1;
      }
    }
  }
}

// Plane — passes every ~5 seconds, kills on contact (handled in game.js)
class PlaneObstacle extends Obstacle {
  constructor() {
    // Plane passes ~50 px above cloud surface (GROUND-100=270 → plane at GROUND-170=200)
    super(-400, 0, 220, 48, null, { ballOnly: true });
    this._timer   = 3000;
    this._active  = false;
    this._dir     = 1;
    this._speed   = 4.5;
    this._warnY   = C.GROUND - 170; // y=200 → above player head (226) so must jump to clear
  }

  get rect() {
    if (!this._active) return { x: -2000, y: -2000, w: 0, h: 0 };
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update(dt) {
    if (!this._active) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._active = true;
        this._dir    = Math.random() < 0.5 ? 1 : -1;
        this.x       = this._dir > 0 ? -this.w - 10 : C.W + 10;
        this.y       = this._warnY;
      }
    } else {
      this.x += this._speed * this._dir;
      if (this._dir > 0 && this.x > C.W + 20)  { this._active = false; this._timer = 5000; }
      if (this._dir < 0 && this.x < -this.w - 20) { this._active = false; this._timer = 5000; }
    }
  }

  draw(ctx) {
    // Warning flash when incoming
    if (!this._active && this._timer < 1600) {
      const blink = Math.floor(this._timer / 180) % 2 === 0;
      if (blink) {
        ctx.save();
        ctx.fillStyle = '#FF4400';
        ctx.font = 'bold 13px "Courier New"';
        ctx.textAlign = this._dir > 0 ? 'left' : 'right';
        const ax = this._dir > 0 ? 6 : C.W - 6;
        ctx.fillText(this._dir > 0 ? '▶▶ PLANE' : 'PLANE ◀◀', ax, this._warnY + 28);
        ctx.restore();
      }
      return;
    }
    if (!this._active) return;

    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    if (this._dir < 0) ctx.scale(-1, 1);

    // Fuselage
    ctx.fillStyle = '#DDDDE8';
    ctx.beginPath(); ctx.ellipse(0, 0, this.w / 2, this.h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // Nose cone
    ctx.fillStyle = '#BBBBD0';
    ctx.beginPath();
    ctx.moveTo(this.w / 2 - 8, -this.h * 0.18);
    ctx.quadraticCurveTo(this.w / 2 + 30, 0, this.w / 2 - 8, this.h * 0.18);
    ctx.closePath(); ctx.fill();
    // Wings
    ctx.fillStyle = '#CCCCDD';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-70, this.h * 0.45);
    ctx.lineTo(35, 0);
    ctx.closePath(); ctx.fill();
    // Window strip
    ctx.fillStyle = '#88CCFF';
    for (let wx = -40; wx < 50; wx += 16) {
      ctx.fillRect(wx, -5, 10, 8);
    }
    // Tail fin
    ctx.fillStyle = '#CCCCDD';
    ctx.beginPath();
    ctx.moveTo(-this.w / 2 + 18, -4);
    ctx.lineTo(-this.w / 2 + 12, -this.h * 0.42);
    ctx.lineTo(-this.w / 2 + 44, -4);
    ctx.closePath(); ctx.fill();
    // Engines
    ctx.fillStyle = '#999AAA';
    ctx.beginPath(); ctx.ellipse(-15, this.h * 0.28, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(20, this.h * 0.28, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Drifting cloud platform — bobs and drifts within its side of the arena
class FloatingCloud extends Obstacle {
  constructor(x, y, w, opts = {}) {
    super(x, y, w, 30, null, {});
    this._sx    = x;
    this._sy    = y;
    this._ampX  = opts.ampX  ?? 55;
    this._ampY  = opts.ampY  ?? 18;
    this._speed = opts.speed ?? 1.0;
    this._phase = opts.phase ?? 0;
    this._t     = this._phase;
  }

  update(dt) {
    this._t += dt * 0.00042 * this._speed;
    this.x = Math.round(this._sx + this._ampX * Math.sin(this._t));
    this.y = Math.round(this._sy + this._ampY * Math.sin(this._t * 1.41 + this._phase));
  }

  draw(ctx) {
    const o = this;
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    const puffs = [[0.12,0.28,22],[0.33,0.0,28],[0.54,0.08,24],[0.74,0.26,20],[0.91,0.32,16]];
    for (const [rx, ry, r] of puffs) {
      ctx.beginPath();
      ctx.arc(o.x + o.w * rx, o.y + o.h * 0.5 - r * ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(o.x, o.y + o.h * 0.35, o.w, o.h * 0.65);
    // Soft blue underside
    ctx.fillStyle = 'rgba(180,210,255,0.45)';
    ctx.fillRect(o.x, o.y + o.h * 0.35, o.w, 7);
  }
}

// Fluffy cloud platform (static, used as reference)
function makeCloud(x, y, w) {
  return new Obstacle(x, y, w, 30, (ctx, o) => {
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    const puffs = [[0.15,0.3,22],[0.35,0.0,28],[0.55,0.1,24],[0.75,0.3,20],[0.92,0.35,16]];
    for (const [rx, ry, r] of puffs) {
      ctx.beginPath();
      ctx.arc(o.x + o.w * rx, o.y + o.h * 0.5 - r * ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(o.x, o.y + o.h * 0.35, o.w, o.h * 0.65);
    ctx.fillStyle = 'rgba(200,220,255,0.4)';
    ctx.fillRect(o.x, o.y + o.h * 0.35, o.w, 6);
  });
}

// --- Obstacle factory functions ---

function makeBench(x, y) {
  return new Obstacle(x, y, 90, 28, (ctx, o) => {
    Sprites.px(ctx, '#A0522D', o.x, o.y, o.w, 8);
    Sprites.px(ctx, '#8B4513', o.x + 3, o.y + 8, o.w - 6, 3);
    Sprites.px(ctx, '#6B3A10', o.x + 8, o.y + 11, 10, 17);
    Sprites.px(ctx, '#6B3A10', o.x + o.w - 18, o.y + 11, 10, 17);
  });
}

function makeTree(x, y) {
  return new Obstacle(x, y, 30, 120, (ctx, o) => {
    Sprites.px(ctx, '#6B4226', o.x + 10, o.y + 60, 10, 60);
    Sprites.px(ctx, '#2E7D32', o.x - 10, o.y + 20, 50, 45);
    Sprites.px(ctx, '#388E3C', o.x - 5, o.y + 5, 40, 35);
    Sprites.px(ctx, '#43A047', o.x, o.y, 30, 30);
    Sprites.px(ctx, '#66BB6A', o.x + 6, o.y + 4, 10, 8);
  });
}

function makeSandcastle(x, y) {
  return new Obstacle(x, y, 70, 55, (ctx, o) => {
    Sprites.px(ctx, '#D2B48C', o.x, o.y + 30, o.w, 25);
    Sprites.px(ctx, '#C8A87A', o.x + 5, o.y + 10, 20, 45);
    Sprites.px(ctx, '#C8A87A', o.x + 45, o.y + 10, 20, 45);
    Sprites.px(ctx, '#C8A87A', o.x + 22, o.y, 26, 55);
    for (let i = 0; i < 3; i++) {
      Sprites.px(ctx, '#BEAA78', o.x + 6 + i * 6, o.y + 5, 4, 6);
      Sprites.px(ctx, '#BEAA78', o.x + 46 + i * 6, o.y + 5, 4, 6);
      Sprites.px(ctx, '#BEAA78', o.x + 24 + i * 7, o.y - 4, 4, 6);
    }
    Sprites.px(ctx, '#996633', o.x + 27, o.y + 30, 16, 25);
    Sprites.px(ctx, '#88BBFF', o.x + 30, o.y + 10, 10, 10);
  }, { absorb: true });
}

function makeUmbrella(x, y) {
  return new Obstacle(x, y, 80, 100, (ctx, o) => {
    Sprites.px(ctx, '#888', o.x + 36, o.y + 20, 8, 80);
    const colors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(o.x + 40, o.y + 20);
      ctx.arc(o.x + 40, o.y + 20, 38, (i / 4) * Math.PI * 2, ((i + 1) / 4) * Math.PI * 2);
      ctx.fill();
    }
    Sprites.px(ctx, '#EEE', o.x + 34, o.y + 15, 12, 12);
  });
}

// Elevated tree branch — solid platform players and ball can land on
function makeBranch(x, y) {
  return new Obstacle(x, y, 110, 12, (ctx, o) => {
    Sprites.px(ctx, '#4A2E0A', o.x, o.y, o.w, o.h);
    Sprites.px(ctx, '#6B4226', o.x + 3, o.y + 1, o.w - 6, 5);
    for (let lx = 0; lx < o.w - 10; lx += 22) {
      Sprites.px(ctx, '#1A5C1A', o.x + lx, o.y - 10, 18, 12);
      Sprites.px(ctx, '#2E7D32', o.x + lx + 3, o.y - 14, 12, 8);
    }
  });
}

// Small bush obstacle (ball bounces, players blocked by midline anyway)
function makeBush(x, y) {
  return new Obstacle(x, y, 60, 32, (ctx, o) => {
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath(); ctx.arc(o.x + 14, o.y + 18, 17, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(o.x + 40, o.y + 15, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#388E3C';
    ctx.beginPath(); ctx.arc(o.x + 26, o.y + 10, 19, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#43A047';
    ctx.beginPath(); ctx.arc(o.x + 22, o.y + 6, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(o.x + 40, o.y + 6, 9, 0, Math.PI * 2); ctx.fill();
    // Berry dots
    ctx.fillStyle = '#C62828';
    [[14,14],[30,8],[46,10],[20,18]].forEach(([bx,by]) => {
      ctx.beginPath(); ctx.arc(o.x + bx, o.y + by, 2, 0, Math.PI*2); ctx.fill();
    });
  });
}

// --- The 5 Arenas ---

const ARENAS = [
  new Arena({
    name: 'SCHOOLYARD',
    skyTop: '#87CEEB', skyBot: '#B0E0FF',
    groundColor: '#6DB53F', groundLine: '#5A9E30',
    drawBg(ctx) {
      Sprites.px(ctx, '#B0BEC5', 280, 120, 240, 250);
      Sprites.px(ctx, '#90A4AE', 280, 100, 240, 25);
      Sprites.px(ctx, '#78909C', 380, 80, 40, 45);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          Sprites.px(ctx, '#BBDEFB', 300 + c * 52, 140 + r * 60, 28, 35);
          Sprites.px(ctx, '#90CAF9', 302 + c * 52, 142 + r * 60, 12, 33);
        }
      }
      Sprites.px(ctx, '#5D4037', 373, 270, 54, 100);
      Sprites.px(ctx, '#4E342E', 373, 270, 54, 8);
      ctx.fillStyle = '#E53935';
      ctx.fillRect(398, 58, 22, 15);
      ctx.fillStyle = '#888';
      ctx.fillRect(396, 40, 4, 42);
      this._cloud(ctx, 80, 60, 60);
      this._cloud(ctx, 650, 45, 45);
    },
    _cloud(ctx, x, y, r) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.6, y + 5, r * 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - r * 0.5, y + 8, r * 0.6, 0, Math.PI * 2); ctx.fill();
    },
    obstacles: [
      makeBench(100, C.GROUND - 28),
      makeBench(610, C.GROUND - 28),
      makeTree(496, C.GROUND - 120),
    ],
  }),

  new Arena({
    name: 'BEACH',
    skyTop: '#00BFFF', skyBot: '#87CEEB',
    groundColor: '#F0D080', groundLine: '#DEB85A',
    playerSpeedMult: 0.55,
    drawBg(ctx) {
      ctx.fillStyle = '#0077BE';
      ctx.fillRect(0, C.GROUND - 60, C.W, 60);
      ctx.fillStyle = '#0099DD';
      ctx.fillRect(0, C.GROUND - 60, C.W, 20);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      for (let wx = 0; wx < C.W; wx += 60) {
        const woff = (Date.now() / 1000) % 60;
        ctx.beginPath();
        ctx.moveTo(wx - woff, C.GROUND - 45);
        ctx.bezierCurveTo(wx - woff + 15, C.GROUND - 52, wx - woff + 30, C.GROUND - 38, wx - woff + 40, C.GROUND - 45);
        ctx.stroke();
      }
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(700, 70, 40, 0, Math.PI * 2); ctx.fill();
      this._palm(ctx, 50, C.GROUND);
      this._palm(ctx, 740, C.GROUND);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
      [[150,80],[200,65],[220,75]].forEach(([gx,gy]) => {
        ctx.beginPath(); ctx.moveTo(gx,gy); ctx.quadraticCurveTo(gx+8,gy-5,gx+16,gy); ctx.stroke();
      });
    },
    _palm(ctx, x, y) {
      for (let i = 0; i < 5; i++) Sprites.px(ctx, '#8B6914', x - 4 + i, y - i * 18, 8, 20);
      ctx.fillStyle = '#2E7D32';
      const lx = x - 4, ly = y - 80;
      [[-40,10,50,12],[-30,-20,45,10],[0,-30,45,10],[30,-20,45,10],[40,10,50,12]].forEach(([dx,dy,w,h]) => {
        ctx.fillRect(lx + dx, ly + dy, w, h);
      });
    },
    obstacles: [
      makeSandcastle(120, C.GROUND - 55),
      makeSandcastle(595, C.GROUND - 55),
      makeUmbrella(380, C.GROUND - 100),
    ],
  }),

  new Arena({
    name: 'GYM',
    skyTop: '#0A1520', skyBot: '#162030',
    groundColor: '#B88828', groundLine: '#906010',
    drawBg(ctx) {
      // Dark arena upper section (stands/crowd)
      ctx.fillStyle = '#0A1520';
      ctx.fillRect(0, 0, C.W, 210);

      // Crowd silhouettes
      for (let i = 0; i < 32; i++) {
        const hx = (i * 53 + 18) % (C.W - 20) + 10;
        const hy = 92 + (i % 4) * 20;
        ctx.fillStyle = `rgba(${15 + i%25}, ${22 + i%18}, ${45 + i%30}, 0.85)`;
        ctx.beginPath(); ctx.arc(hx, hy, 7 + (i%3), 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(hx - 5, hy + 6, 10, 16);
      }

      // Hardwood floor
      ctx.fillStyle = '#C89030';
      ctx.fillRect(0, 210, C.W, C.GROUND - 210);
      for (let y = 212; y < C.GROUND; y += 12) {
        ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.W, y); ctx.stroke();
      }
      // Vertical plank separators
      for (let x = 0; x < C.W; x += 80) {
        ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 210); ctx.lineTo(x, C.GROUND); ctx.stroke();
      }

      // Court markings (white)
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(C.W / 2, C.GROUND, 65, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(C.W / 2, C.GROUND - 65); ctx.lineTo(C.W / 2, C.GROUND); ctx.stroke();
      // Paint boxes
      ctx.strokeRect(0, C.GROUND - 105, 100, 105);
      ctx.strokeRect(C.W - 100, C.GROUND - 105, 100, 105);
      // Three-point arcs
      ctx.beginPath(); ctx.arc(75, C.GROUND, 108, -Math.PI * 0.44, Math.PI * 0.44); ctx.stroke();
      ctx.beginPath(); ctx.arc(C.W - 75, C.GROUND, 108, Math.PI - Math.PI * 0.44, Math.PI + Math.PI * 0.44); ctx.stroke();

      // Ceiling spotlights (visible just below HUD strip)
      [120, 300, 400, 500, 680].forEach(lx => {
        ctx.fillStyle = 'rgba(255,230,160,0.055)';
        ctx.beginPath();
        ctx.moveTo(lx, 88);
        ctx.lineTo(lx - 45, C.GROUND);
        ctx.lineTo(lx + 45, C.GROUND);
        ctx.closePath();
        ctx.fill();
        Sprites.px(ctx, '#FFEE88', lx - 14, 88, 28, 8);
        ctx.fillStyle = 'rgba(255,250,200,0.55)';
        ctx.beginPath(); ctx.arc(lx, 92, 7, 0, Math.PI * 2); ctx.fill();
      });

      // Hoops
      this._drawHoop(ctx, 0, 175, 1);
      this._drawHoop(ctx, C.W, 175, -1);
    },
    _drawHoop(ctx, wallX, rimY, dir) {
      const armLen = 48, rimR = 20;
      const bbW = 14, bbH = 90, bbY = rimY - 36;
      const bbX = dir > 0 ? wallX : wallX - bbW;
      const armX = dir > 0 ? bbX + bbW : bbX - armLen;
      const rimCX = dir > 0 ? bbX + bbW + armLen : bbX - armLen;

      // Support pole from ceiling
      const poleX = dir > 0 ? bbX + 4 : bbX + bbW - 10;
      Sprites.px(ctx, '#546E7A', poleX, 88, 6, bbY - 88);

      // Backboard
      Sprites.px(ctx, '#CFD8DC', bbX, bbY, bbW, bbH);
      Sprites.px(ctx, '#ECEFF1', bbX + (dir > 0 ? 2 : 0), bbY + 2, bbW - 4, bbH - 4);
      // Orange target box on backboard
      ctx.strokeStyle = '#E65100'; ctx.lineWidth = 2;
      ctx.strokeRect(bbX + (dir > 0 ? 2 : 0), bbY + 22, bbW - 4, 34);

      // Arm
      Sprites.px(ctx, '#546E7A', armX, rimY - 4, armLen, 6);

      // Rim ring
      ctx.strokeStyle = '#E65100'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(rimCX, rimY, rimR, 0, Math.PI * 2); ctx.stroke();

      // Net
      ctx.strokeStyle = 'rgba(220,220,220,0.7)'; ctx.lineWidth = 1.2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(rimCX + i * (rimR * 0.4), rimY + 2);
        ctx.lineTo(rimCX + i * (rimR * 0.26), rimY + 28);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(rimCX - rimR * 0.8, rimY + 28);
      ctx.lineTo(rimCX + rimR * 0.8, rimY + 28);
      ctx.stroke();
    },
    obstacles: [
      // Left hoop: backboard + arm + rim posts (all ballOnly)
      new Obstacle(0,  139, 14, 90, () => {}, { ballOnly: true }),   // backboard
      new Obstacle(14, 169, 48, 10, () => {}, { ballOnly: true }),   // arm
      new Obstacle(42, 160, 6,  30, () => {}, { ballOnly: true }),   // rim far post
      new Obstacle(76, 160, 6,  30, () => {}, { ballOnly: true }),   // rim near post
      // Right hoop (mirrored: rimCX = 800-14-48 = 738, r=20)
      new Obstacle(786, 139, 14, 90, () => {}, { ballOnly: true }),  // backboard
      new Obstacle(738, 169, 48, 10, () => {}, { ballOnly: true }),  // arm
      new Obstacle(752, 160, 6,  30, () => {}, { ballOnly: true }),  // rim far post
      new Obstacle(718, 160, 6,  30, () => {}, { ballOnly: true }),  // rim near post
    ],
  }),

  new Arena({
    name: 'FOREST',
    skyTop: '#1A4A1A', skyBot: '#2D6A2D',
    groundColor: '#2E4A1E', groundLine: '#3D6A2A',
    drawBg(ctx) {
      for (let i = 0; i < 5; i++) {
        const rx = 60 + i * 170;
        ctx.fillStyle = 'rgba(200,255,150,0.06)';
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 50, C.GROUND);
        ctx.lineTo(rx - 10, C.GROUND);
        ctx.closePath();
        ctx.fill();
      }
      [30, 130, 240, 560, 670, 770].forEach(tx => {
        Sprites.px(ctx, '#3D2010', tx - 10, 0, 22, C.GROUND);
        Sprites.px(ctx, '#5A3218', tx - 7, 0, 8, C.GROUND);
      });
      Sprites.px(ctx, '#0D2A0D', 0, 0, C.W, 50);
      for (let x = 0; x < C.W; x += 80) {
        Sprites.px(ctx, '#1A4A1A', x, 15, 60, 25);
        Sprites.px(ctx, '#1D5C1D', x + 20, 5, 40, 22);
      }
      for (let fx = 20; fx < C.W - 20; fx += 140) {
        ctx.fillStyle = '#3A6A1A';
        ctx.beginPath();
        ctx.moveTo(fx, C.GROUND);
        ctx.quadraticCurveTo(fx - 20, C.GROUND - 28, fx - 30, C.GROUND - 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(fx, C.GROUND);
        ctx.quadraticCurveTo(fx + 20, C.GROUND - 25, fx + 30, C.GROUND - 3);
        ctx.fill();
      }
    },
    obstacles: [
      makeBranch(145, 225),
      makeBranch(535, 225),
      makeBush(370, C.GROUND - 32),
      new BirdObstacle(300, 130, 200, 4500),
      new BirdObstacle(510, 185, 150, 3800),
      new BirdObstacle(180, 95, 140, 5200),
    ],
  }),

  new Arena({
    name: 'LAB',
    skyTop: '#EEF2F8', skyBot: '#DCE4F0',
    groundColor: '#8892AA', groundLine: '#6670AA',
    drawBg(ctx) {
      ctx.fillStyle = '#F0F4F8';
      ctx.fillRect(0, 0, C.W, C.GROUND);
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
      for (let gx = 0; gx <= C.W; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, C.GROUND); ctx.stroke();
      }
      for (let gy = 0; gy <= C.GROUND; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(C.W, gy); ctx.stroke();
      }
      for (let lx = 80; lx < C.W - 60; lx += 200) {
        Sprites.px(ctx, '#FFEE88', lx, 0, 100, 14);
        ctx.fillStyle = 'rgba(255,240,120,0.22)';
        ctx.fillRect(lx - 20, 14, 140, 50);
      }
      // Draw portals
      const pColors = ['#FF5050', '#44EE44', '#4488FF'];
      const t = Date.now() / 600;
      for (const p of this._portals) {
        const col = pColors[p.pair];
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 22;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.translate(p.x, p.y);
        ctx.rotate(t * (p.side === 'left' ? 1 : -1) + p.pair * 2.1);
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.65;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, p.r * 0.55, 0, Math.PI * 1.3); ctx.stroke();
        ctx.restore();
        // Pair letter label
        ctx.fillStyle = col;
        ctx.font = 'bold 9px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(['R','G','B'][p.pair], p.x, p.y + 4);
      }
      ctx.textAlign = 'left';
    },
    _portals: [
      { x: 130, y: 145, r: 18, pair: 0, side: 'left'  },
      { x: 210, y: 235, r: 18, pair: 1, side: 'left'  },
      { x: 150, y: 305, r: 18, pair: 2, side: 'left'  },
      { x: 670, y: 145, r: 18, pair: 0, side: 'right' },
      { x: 590, y: 235, r: 18, pair: 1, side: 'right' },
      { x: 650, y: 305, r: 18, pair: 2, side: 'right' },
    ],
    checkTeleport(ball) {
      if (!ball.inFlight || ball.dead || ball.teleportCooldown > 0) return;
      for (const p of this._portals) {
        const dx = ball.x - p.x, dy = ball.y - p.y;
        if (dx * dx + dy * dy < p.r * p.r) {
          const exit = this._portals.find(q => q.pair === p.pair && q.side !== p.side);
          if (!exit) continue;
          ball.x  = exit.x;
          ball.y  = exit.y;
          ball.vx = -ball.vx; // mirror x so ball flies toward the opponent
          // vy preserved — same downward trajectory
          ball.teleportCooldown = 400;
          ball.lastThrower = -1;
          break;
        }
      }
    },
    obstacles: [
      new Obstacle(C.W/2 - 70, C.GROUND - 70, 140, 70, (ctx, o) => {
        Sprites.px(ctx, '#8899AA', o.x, o.y, o.w, 10);
        Sprites.px(ctx, '#AAB8C4', o.x + 2, o.y + 10, o.w - 4, o.h - 10);
        Sprites.px(ctx, '#C0CDD4', o.x + 4, o.y + 12, o.w - 8, 20);
        Sprites.px(ctx, '#778899', o.x, o.y + o.h - 20, 12, 20);
        Sprites.px(ctx, '#778899', o.x + o.w - 12, o.y + o.h - 20, 12, 20);
        Sprites.px(ctx, '#88CCFF', o.x + 22, o.y + 8, 16, 26);
        Sprites.px(ctx, '#AADDFF', o.x + 24, o.y + 6, 12, 8);
        Sprites.px(ctx, '#FFDD88', o.x + o.w - 38, o.y + 8, 16, 26);
        Sprites.px(ctx, '#FFEE88', o.x + o.w - 36, o.y + 6, 12, 8);
      }),
    ],
  }),

  // ── MOON ──────────────────────────────────────────────────────────────────
  new Arena({
    name: 'MOON',
    skyTop: '#000005', skyBot: '#050518',
    groundColor: '#8A8A9E', groundLine: '#6A6A7E',
    playerSpeedMult:     0.38,  // wade through moon dust
    playerGravityMult:   0.22,  // very low gravity → floaty
    playerJumpForceMult: 0.58,  // combined with low gravity → huge slow arcs
    badge: 'LOW GRAVITY  ·  DEBRIS',
    badgeColor: 'rgba(100,100,160,0.85)',
    badgeTextColor: '#AAAAFF',

    drawBg(ctx) {
      ctx.fillStyle = '#000005'; ctx.fillRect(0, 0, C.W, C.GROUND);
      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 120; i++) {
        const sx = (i * 137.5 + 7) % C.W;
        const sy = (i * 71.3 + 13) % (C.GROUND - 40);
        const sr = 0.3 + (i % 4) * 0.3;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
      // Earth
      ctx.save();
      ctx.shadowColor = '#4488FF'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#1144AA';
      ctx.beginPath(); ctx.arc(680, 75, 44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1A8B3A';
      ctx.beginPath(); ctx.arc(660, 62, 16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(688, 85, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,220,255,0.2)';
      ctx.beginPath(); ctx.arc(680, 75, 44, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.ellipse(667, 58, 22, 8, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      // Surface craters
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      [[100,C.GROUND-12,22],[250,C.GROUND-8,14],[450,C.GROUND-10,18],[620,C.GROUND-9,12]].forEach(([cx,cy,r]) => {
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r*0.35, 0, 0, Math.PI*2); ctx.fill();
      });
    },

    obstacles: [
      new DebrisRock(180,  160, 30, 0.55),
      new DebrisRock(450,  210, 24, 0.80),
      new DebrisRock(650,  145, 22, 0.65),
      new DebrisRock(320,  255, 28, 0.45),
      new DebrisRock( 60,  190, 20, 0.70),
      new DebrisRock(560,  175, 26, 0.50),
      new DebrisRock(730,  230, 18, 0.90),
      new DebrisRock(260,  130, 32, 0.60),
    ],
  }),

  // ── UPSIDE DOWN ───────────────────────────────────────────────────────────
  (() => {
    const demon = new DemonNPC(C.W / 2, C.GROUND - 5, true); // inverted=true
    return new Arena({
      name: 'UPSIDE DOWN',
      skyTop: '#1A0005', skyBot: '#380010',
      groundColor: '#0D0005', groundLine: '#AA0020',
      demon,
      playerInvertGravity: true,
      ballGravityMult: -1,
      badge: 'UPSIDE DOWN  ·  LOSE IF HIT',
      badgeColor: 'rgba(140,0,10,0.88)',
      badgeTextColor: '#FF6666',

      update(dt) {
        for (const obs of this.obstacles) { if (obs.update) obs.update(dt); }
        this.demon.update(dt);
      },

      drawBg(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
        g.addColorStop(0, '#1A0005'); g.addColorStop(0.5, '#300010'); g.addColorStop(1, '#480018');
        ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.GROUND);
        // Ceiling cracks
        ctx.strokeStyle = 'rgba(255,80,0,0.28)'; ctx.lineWidth = 1.5;
        [[60,0,90,28],[200,0,170,35],[350,0,320,22],[540,0,510,30],[700,0,680,25]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-14,y2+12); ctx.stroke();
        });
        // Stalactites
        const stalacs = [[80,14,38],[180,10,28],[360,12,32],[500,16,42],[700,11,26]];
        stalacs.forEach(([sx,sw,sh]) => {
          ctx.fillStyle = '#1A0005';
          ctx.beginPath(); ctx.moveTo(sx-sw/2,0); ctx.lineTo(sx+sw/2,0); ctx.lineTo(sx,sh); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2A000A';
          ctx.beginPath(); ctx.moveTo(sx-sw/4,0); ctx.lineTo(sx+sw/4,0); ctx.lineTo(sx,sh*0.5); ctx.closePath(); ctx.fill();
        });
        // Lava glow pools
        ctx.fillStyle = 'rgba(255,60,0,0.12)';
        [[150,C.GROUND-8,55],[400,C.GROUND-6,40],[600,C.GROUND-9,50]].forEach(([lx,ly,lw]) => {
          ctx.beginPath(); ctx.ellipse(lx, ly, lw, 9, 0, 0, Math.PI*2); ctx.fill();
        });
        // Pentagram
        ctx.save();
        ctx.strokeStyle = 'rgba(200,0,30,0.15)'; ctx.lineWidth = 1;
        ctx.translate(C.W/2, C.GROUND-2);
        const R = 60;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i*2*Math.PI/5) - Math.PI/2, b = ((i+2)*2*Math.PI/5) - Math.PI/2;
          ctx.moveTo(Math.cos(a)*R, Math.sin(a)*R); ctx.lineTo(Math.cos(b)*R, Math.sin(b)*R);
        }
        ctx.stroke(); ctx.restore();
      },

      _drawGround(ctx) {
        ctx.fillStyle = '#0D0005'; ctx.fillRect(0, C.GROUND, C.W, C.H - C.GROUND);
        ctx.fillStyle = '#AA0020'; ctx.fillRect(0, C.GROUND, C.W, 3);
        ctx.save();
        ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#CC1100'; ctx.fillRect(0, C.GROUND+2, C.W, 2);
        ctx.shadowBlur = 0; ctx.restore();
      },

      draw(ctx) {
        this._drawBackground(ctx);
        this._drawObstacles(ctx);
        this.demon.draw(ctx);
        this._drawGround(ctx);
      },

      obstacles: [],
    });
  })(),

  // ── CLOUDS ────────────────────────────────────────────────────────────────
  (() => {
    const CLOUD_Y = C.GROUND - 100;
    return new Arena({
      name: 'CLOUDS',
      skyTop: '#87CEEB', skyBot: '#C8EAFF',
      groundColor: '#87CEEB', groundLine: '#87CEEB',
      noGround: true,
      playerStarts: [[150, CLOUD_Y], [650, CLOUD_Y]],
      badge: 'FLOATING CLOUDS  ·  FALL = LOSE',
      badgeColor: 'rgba(80,140,200,0.85)',
      badgeTextColor: '#DDEEFF',

      drawBg(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
        g.addColorStop(0, '#6AAEDD'); g.addColorStop(1, '#C8EAFF');
        ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.GROUND);

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        [[80,80,90,22],[300,55,130,18],[550,90,100,20],[700,65,80,18]].forEach(([cx,cy,cw,ch]) => {
          ctx.beginPath(); ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI*2); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        [[160,110,70,14],[420,100,90,16],[640,115,65,13]].forEach(([cx,cy,cw,ch]) => {
          ctx.beginPath(); ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI*2); ctx.fill();
        });

        ctx.save();
        ctx.shadowColor = '#FFE066'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(720, 55, 32, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
      },

      _drawGround(ctx) {
        const g = ctx.createLinearGradient(0, C.GROUND - 30, 0, C.H);
        g.addColorStop(0, 'rgba(200,234,255,0)');
        g.addColorStop(1, 'rgba(140,200,255,0.6)');
        ctx.fillStyle = g;
        ctx.fillRect(0, C.GROUND - 30, C.W, C.H - C.GROUND + 30);
      },

      obstacles: [
        new FloatingCloud(50,  CLOUD_Y, 190, { ampX: 55, ampY: 20, speed: 0.9, phase: 0 }),
        new FloatingCloud(560, CLOUD_Y, 190, { ampX: 60, ampY: 22, speed: 1.1, phase: 2.3 }),
      ],
    });
  })(),
];
