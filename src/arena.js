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
    if (this.parallax) this._drawParallax(ctx);
    if (this.drawBg) this.drawBg(ctx);
    if (this.ambient) this._drawAmbient(ctx);
  }

  // ── Parallax layers ──────────────────────────────────────────────────────
  // Each layer: { type: 'clouds'|'hills'|'peaks'|'skyline', y, color, speed(px/s),
  //               size, count, alpha }
  // Layers drift horizontally at different speeds and wrap, giving depth.
  _drawParallax(ctx) {
    const t = Date.now() / 1000;
    for (const L of this.parallax) {
      const count = L.count || 5;
      const spacing = (C.W + L.size * 2) / count;
      const off = ((t * (L.speed || 6)) % spacing);
      ctx.globalAlpha = L.alpha ?? 0.5;
      ctx.fillStyle = L.color;
      for (let i = -1; i <= count; i++) {
        // Deterministic per-slot jitter so shapes don't look uniform
        const j = Math.sin(i * 127.1) * 0.5 + 0.5;
        const x = i * spacing - off + j * spacing * 0.4;
        const s = L.size * (0.7 + j * 0.6);
        const y = L.y + Math.sin(i * 311.7) * 8;
        if (L.type === 'clouds') {
          ctx.beginPath();
          ctx.ellipse(x, y, s, s * 0.32, 0, 0, Math.PI * 2);
          ctx.ellipse(x - s * 0.5, y + s * 0.1, s * 0.55, s * 0.24, 0, 0, Math.PI * 2);
          ctx.ellipse(x + s * 0.5, y + s * 0.12, s * 0.5, s * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (L.type === 'hills') {
          ctx.beginPath();
          ctx.ellipse(x, L.y, s * 1.6, s, 0, Math.PI, 0);
          ctx.fill();
        } else if (L.type === 'peaks') {
          ctx.beginPath();
          ctx.moveTo(x - s, L.y);
          ctx.lineTo(x, L.y - s * (1.1 + j * 0.8));
          ctx.lineTo(x + s, L.y);
          ctx.closePath();
          ctx.fill();
        } else if (L.type === 'skyline') {
          const bw = s * 0.9, bh = s * (1 + j * 1.4);
          ctx.fillRect(x - bw / 2, L.y - bh, bw, bh);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── Ambient drifting particles (leaves, embers, dust, snow…) ─────────────
  // Config: { count, colors[], size:[min,max], vx:[min,max], vy:[min,max],
  //           sway, glow, area:[yMin,yMax] }
  _drawAmbient(ctx) {
    const a = this.ambient;
    const now = Date.now();
    if (!this._amb) {
      this._amb = [];
      this._ambLast = now;
      for (let i = 0; i < (a.count || 24); i++) this._amb.push(this._ambSpawn(a, true));
    }
    const dt = Math.min(50, now - this._ambLast);
    this._ambLast = now;
    const s = dt / 16;
    for (let i = 0; i < this._amb.length; i++) {
      const p = this._amb[i];
      p.x += (p.vx + (a.sway ? Math.sin(now / 900 + p.ph) * a.sway : 0)) * s;
      p.y += p.vy * s;
      const yMin = a.area ? a.area[0] : -20, yMax = a.area ? a.area[1] : C.GROUND + 10;
      if (p.x < -15 || p.x > C.W + 15 || p.y < yMin - 25 || p.y > yMax + 25) {
        this._amb[i] = this._ambSpawn(a, false);
        continue;
      }
      const tw = 0.55 + 0.45 * Math.sin(now / 500 + p.ph * 3);
      ctx.globalAlpha = (a.alpha ?? 0.75) * tw;
      if (a.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 6; }
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      if (a.glow) ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  _ambSpawn(a, anywhere) {
    const [s0, s1] = a.size || [2, 4];
    const [vx0, vx1] = a.vx || [-0.3, 0.3];
    const [vy0, vy1] = a.vy || [0.15, 0.5];
    const yMin = a.area ? a.area[0] : 0, yMax = a.area ? a.area[1] : C.GROUND;
    const vy = vy0 + Math.random() * (vy1 - vy0);
    return {
      x: Math.random() * C.W,
      // New spawns enter from the edge they drift away from
      y: anywhere ? yMin + Math.random() * (yMax - yMin) : (vy >= 0 ? yMin - 10 : yMax + 10),
      vx: vx0 + Math.random() * (vx1 - vx0),
      vy,
      size: Math.round(s0 + Math.random() * (s1 - s0)),
      color: a.colors[Math.floor(Math.random() * a.colors.length)],
      ph: Math.random() * Math.PI * 2,
    };
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
    this._throwTimer = 1200 + Math.random() * 800;
    this._animT = 0;
    this._lastTarget = 0;
  }

  update(dt) {
    this._animT += dt;
    this._throwTimer -= dt;
    if (this._throwTimer <= 0) {
      this._throwTimer = 1400 + Math.random() * 1000;
      this._lastTarget ^= 1;
      const dir = this._lastTarget === 0 ? -1 : 1;
      const angle = Math.PI * (0.25 + Math.random() * 0.35);
      const speed = this.inverted ? 2.2 + Math.random() * 0.8 : 1.8 + Math.random() * 1.4;
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
        ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
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

// Distant animated birds — flapping "v" shapes drifting across the sky
function drawFlyingBirds(ctx, t, { count = 4, y = 80, speed = 22, color = '#223', spread = 50 } = {}) {
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const per = C.W + 140;
  for (let i = 0; i < count; i++) {
    const x = ((t / 1000 * speed + i * per * 1.37 / count) % per) - 70;
    const by = y + Math.sin(i * 3.7) * spread + Math.sin(t / 600 + i) * 6;
    const flap = Math.sin(t / 140 + i * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(x - 7, by - flap);
    ctx.quadraticCurveTo(x, by + 3, x + 7, by - flap);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
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
    parallax: [
      { type: 'clouds', y: 70,  color: '#FFFFFF', speed: 4,  size: 55, count: 4, alpha: 0.55 },
      { type: 'hills',  y: C.GROUND, color: '#4E9A2E', speed: 10, size: 70, count: 5, alpha: 0.45 },
    ],
    ambient: { count: 16, colors: ['#FF8FB5', '#FFD1DC', '#FFF7C0'], size: [2, 4],
               vx: [-0.5, -0.15], vy: [0.15, 0.4], sway: 0.5, alpha: 0.85, area: [90, C.GROUND - 20] },
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
      const t = Date.now();
      // Sun with rotating rays
      ctx.save();
      ctx.translate(78, 62);
      ctx.rotate(t / 9000);
      ctx.fillStyle = 'rgba(255,220,80,0.35)';
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(30, -6); ctx.lineTo(58, 0); ctx.lineTo(30, 6);
        ctx.closePath(); ctx.fill();
      }
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 25;
      ctx.fillStyle = '#FFD94A';
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      // Waving flag on the school pole
      ctx.fillStyle = '#888';
      ctx.fillRect(396, 40, 4, 42);
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.moveTo(400, 44);
      const wv = t / 250;
      for (let fx = 0; fx <= 26; fx += 2)
        ctx.lineTo(400 + fx, 44 + Math.sin(wv + fx / 5) * 3);
      for (let fx = 26; fx >= 0; fx -= 2)
        ctx.lineTo(400 + fx, 60 + Math.sin(wv + fx / 5) * 3);
      ctx.closePath(); ctx.fill();
      this._cloud(ctx, 650, 45, 45);
      drawFlyingBirds(ctx, t, { count: 5, y: 78, speed: 26, spread: 34 });
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
    parallax: [
      { type: 'clouds', y: 55,  color: '#FFFFFF', speed: 6,  size: 60, count: 4, alpha: 0.6 },
      { type: 'hills',  y: C.GROUND - 60, color: '#2E7D8C', speed: 3, size: 26, count: 4, alpha: 0.5 },
    ],
    ambient: { count: 14, colors: ['#FFFFFF', '#E8F8FF', '#FFF3B0'], size: [2, 3],
               vx: [-0.9, -0.4], vy: [-0.1, 0.15], sway: 0.7, alpha: 0.7, area: [95, C.GROUND - 70] },
    drawBg(ctx) {
      const t = Date.now();
      // Sun with shimmering glow
      ctx.save();
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 24 + Math.sin(t / 500) * 8;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(700, 70, 40, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      // Ocean with heaving surface
      const swell = Math.sin(t / 900) * 4;
      ctx.fillStyle = '#0077BE';
      ctx.fillRect(0, C.GROUND - 60 + swell, C.W, 60 - swell);
      ctx.fillStyle = '#0099DD';
      ctx.fillRect(0, C.GROUND - 60 + swell, C.W, 20);
      // Sun glitter path on the water
      ctx.fillStyle = 'rgba(255,230,140,0.35)';
      for (let gx = 640; gx < 780; gx += 14) {
        const ga = Math.sin(t / 300 + gx) * 0.5 + 0.5;
        ctx.globalAlpha = 0.15 + ga * 0.3;
        ctx.fillRect(gx, C.GROUND - 52 + swell + (gx % 3) * 4, 8, 2);
      }
      ctx.globalAlpha = 1;
      // Rolling wave crests (two scrolling layers)
      ctx.lineWidth = 2;
      for (let layer = 0; layer < 2; layer++) {
        ctx.strokeStyle = layer ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)';
        const woff = (t / (layer ? 55 : 80)) % 60;
        const wy = C.GROUND - 45 + swell + layer * 18;
        for (let wx = -60; wx < C.W; wx += 60) {
          ctx.beginPath();
          ctx.moveTo(wx + woff, wy);
          ctx.bezierCurveTo(wx + woff + 15, wy - 7, wx + woff + 30, wy + 7, wx + woff + 45, wy);
          ctx.stroke();
        }
      }
      // Drifting sailboat bobbing on the horizon
      const bx = ((t / 90) % (C.W + 200)) - 100;
      const bob = Math.sin(t / 700) * 3;
      const by = C.GROUND - 58 + swell + bob;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.sin(t / 800) * 0.05);
      ctx.fillStyle = '#7A3B10';
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(11, 8); ctx.lineTo(-11, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -28); ctx.lineTo(15, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFEEDD';
      ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-2, -24); ctx.lineTo(-13, -4); ctx.closePath(); ctx.fill();
      ctx.restore();
      this._palm(ctx, 50, C.GROUND);
      this._palm(ctx, 740, C.GROUND);
      drawFlyingBirds(ctx, t, { count: 4, y: 72, speed: 30, color: '#445', spread: 26 });
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
    ambient: { count: 18, colors: ['#FFE9A0', '#FFF6D0'], size: [1, 2],
               vx: [-0.15, 0.15], vy: [0.1, 0.3], sway: 0.3, alpha: 0.5, area: [95, C.GROUND - 30] },
    drawBg(ctx) {
      // Dark arena upper section (stands/crowd)
      ctx.fillStyle = '#0A1520';
      ctx.fillRect(0, 0, C.W, 210);

      // Crowd silhouettes — alive: bobbing, doing the wave, some with arms up
      const ct = Date.now();
      for (let i = 0; i < 32; i++) {
        const hx = (i * 53 + 18) % (C.W - 20) + 10;
        // Stadium wave sweeping across + individual excited bounce
        const wave = Math.max(0, Math.sin(ct / 700 - hx / 90)) * 9;
        const bounce = Math.abs(Math.sin(ct / (260 + (i % 5) * 60) + i)) * 3;
        const hy = 92 + (i % 4) * 20 - wave - bounce;
        ctx.fillStyle = `rgba(${15 + i%25}, ${22 + i%18}, ${45 + i%30}, 0.85)`;
        ctx.beginPath(); ctx.arc(hx, hy, 7 + (i%3), 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(hx - 5, hy + 6, 10, 16);
        // Arms shoot up during the wave (and a few fans keep them up)
        if (wave > 4 || i % 7 === 0) {
          const alift = wave > 4 ? wave * 0.8 : Math.sin(ct / 300 + i) * 3;
          ctx.fillRect(hx - 9, hy - 4 - alift, 3, 12);
          ctx.fillRect(hx + 6, hy - 4 - alift, 3, 12);
        }
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

      // Camera flashes popping in the crowd (deterministic pseudo-random)
      for (let i = 0; i < 6; i++) {
        const seed = Math.floor(ct / 130) + i * 977;
        if ((seed * 2654435761 >>> 0) % 23 === 0) {
          const fxp = ((seed * 48271) >>> 0) % (C.W - 40) + 20;
          const fyp = 90 + ((seed * 16807) >>> 0) % 90;
          ctx.save();
          ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 16;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath(); ctx.arc(fxp, fyp, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.restore();
        }
      }

      // Scrolling LED banner between crowd and floor
      ctx.fillStyle = '#100808';
      ctx.fillRect(0, 196, C.W, 14);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 196, C.W, 14); ctx.clip();
      ctx.fillStyle = '#FF3322';
      ctx.font = 'bold 11px monospace';
      const banner = '★ DODGXEL CHAMPIONSHIP ★ GO JACO ★ GO LUCY ★ DEFENSE! DEFENSE! ★ ';
      const bw = ctx.measureText(banner).width;
      const bx = -((ct / 18) % bw);
      ctx.fillText(banner, bx, 207);
      ctx.fillText(banner, bx + bw, 207);
      ctx.restore();

      // Ceiling spotlights — swaying beams
      [120, 300, 400, 500, 680].forEach((lx, i) => {
        const sway = Math.sin(ct / 1400 + i * 1.7) * 34;
        ctx.fillStyle = `rgba(255,230,160,${0.06 + 0.03 * Math.sin(ct / 900 + i * 2)})`;
        ctx.beginPath();
        ctx.moveTo(lx, 88);
        ctx.lineTo(lx + sway - 45, C.GROUND);
        ctx.lineTo(lx + sway + 45, C.GROUND);
        ctx.closePath();
        ctx.fill();
        // Bright floor pool where the beam lands
        ctx.fillStyle = 'rgba(255,245,200,0.08)';
        ctx.beginPath(); ctx.ellipse(lx + sway, C.GROUND - 4, 48, 8, 0, 0, Math.PI * 2); ctx.fill();
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
    parallax: [
      { type: 'peaks', y: C.GROUND, color: '#0F3A0F', speed: 2, size: 90, count: 5, alpha: 0.7 },
      { type: 'peaks', y: C.GROUND, color: '#164516', speed: 5, size: 60, count: 6, alpha: 0.55 },
    ],
    ambient: { count: 22, colors: ['#7CB342', '#9CCC65', '#D4A030', '#C0CA33'], size: [3, 5],
               vx: [-0.4, 0.1], vy: [0.35, 0.8], sway: 1.1, alpha: 0.9, area: [50, C.GROUND - 5] },
    drawBg(ctx) {
      const t = Date.now();
      // God rays — pulsing and slowly swaying
      for (let i = 0; i < 5; i++) {
        const rx = 60 + i * 170;
        const sway = Math.sin(t / 3000 + i * 1.3) * 26;
        const pulse = 0.05 + 0.05 * (Math.sin(t / 1600 + i * 2.1) * 0.5 + 0.5);
        ctx.fillStyle = `rgba(215,255,160,${pulse.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 50 + sway, C.GROUND);
        ctx.lineTo(rx - 10 + sway, C.GROUND);
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
      // Drifting fog banks
      for (let i = 0; i < 3; i++) {
        const fgx = ((t / (40 + i * 14) + i * 400) % (C.W + 360)) - 180;
        const fgy = C.GROUND - 40 - i * 60 + Math.sin(t / 2200 + i) * 8;
        ctx.fillStyle = `rgba(190,220,190,${0.10 - i * 0.02})`;
        ctx.beginPath(); ctx.ellipse(fgx, fgy, 150, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(fgx + 90, fgy + 10, 110, 20, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Fireflies with pulsing glow
      ctx.save();
      for (let i = 0; i < 9; i++) {
        const ffx = 40 + ((i * 197 + 31) % (C.W - 80)) + Math.sin(t / 1100 + i * 2.3) * 22;
        const ffy = 140 + ((i * 83) % 200) + Math.cos(t / 1300 + i * 1.7) * 16;
        const glow = Math.sin(t / 450 + i * 2.9) * 0.5 + 0.5;
        ctx.globalAlpha = 0.25 + glow * 0.75;
        ctx.shadowColor = '#CCFF55'; ctx.shadowBlur = 6 + glow * 10;
        ctx.fillStyle = '#EEFF99';
        ctx.beginPath(); ctx.arc(ffx, ffy, 1.8 + glow, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
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
    ambient: { count: 16, colors: ['#33CCFF', '#66E0FF', '#AAF0FF'], size: [2, 3],
               vx: [-0.2, 0.2], vy: [-0.55, -0.2], sway: 0.4, glow: true, alpha: 0.8, area: [95, C.GROUND - 10] },
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
      const lt = Date.now();
      for (let lx = 80; lx < C.W - 60; lx += 200) {
        const flick = 0.18 + 0.08 * Math.sin(lt / 700 + lx);
        Sprites.px(ctx, '#FFEE88', lx, 0, 100, 14);
        ctx.fillStyle = `rgba(255,240,120,${flick.toFixed(3)})`;
        ctx.fillRect(lx - 20, 14, 140, 50);
      }
      // Wall-mounted oscilloscope monitors with live traces
      [[548, 108], [56, 100]].forEach(([mx, my], mi) => {
        Sprites.px(ctx, '#37474F', mx - 4, my - 4, 96, 64);
        Sprites.px(ctx, '#0A1410', mx, my, 88, 50);
        ctx.strokeStyle = '#22FF88'; ctx.lineWidth = 1.5;
        ctx.save();
        ctx.shadowColor = '#22FF88'; ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let sx = 0; sx <= 88; sx += 2) {
          const ph = lt / 260 + mi * 2;
          const sv = Math.sin(sx / 9 - ph) * Math.sin(sx / 23 - ph * 0.6);
          ctx.lineTo(mx + sx, my + 25 + sv * 16);
        }
        ctx.stroke();
        ctx.restore();
        // Blinking status LEDs under the screen
        for (let li = 0; li < 4; li++) {
          const on = Math.sin(lt / (280 + li * 130) + li * 2 + mi) > 0;
          ctx.fillStyle = on ? ['#FF4444', '#44FF66', '#FFBB33', '#44AAFF'][li] : '#222A2E';
          ctx.beginPath(); ctx.arc(mx + 10 + li * 14, my + 56, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      });
      // Scanline sweep down the room
      const scanY = (lt / 9) % (C.GROUND + 120) - 60;
      const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      sg.addColorStop(0, 'rgba(60,200,255,0)');
      sg.addColorStop(0.5, 'rgba(60,200,255,0.10)');
      sg.addColorStop(1, 'rgba(60,200,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, Math.max(0, scanY - 30), C.W, 60);
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
        ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
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
    ambient: { count: 20, colors: ['#CCCCE8', '#9999BB', '#FFFFFF'], size: [1, 3],
               vx: [-0.25, 0.25], vy: [-0.12, 0.12], sway: 0.5, alpha: 0.6, area: [95, C.GROUND - 10] },

    drawBg(ctx) {
      ctx.fillStyle = '#000005'; ctx.fillRect(0, 0, C.W, C.GROUND);
      const mt = Date.now();
      // Twinkling stars
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 120; i++) {
        const sx = (i * 137.5 + 7) % C.W;
        const sy = (i * 71.3 + 13) % (C.GROUND - 40);
        const sr = 0.3 + (i % 4) * 0.3;
        ctx.globalAlpha = 0.35 + 0.55 * (Math.sin(mt / (350 + (i % 7) * 90) + i) * 0.5 + 0.5);
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Shooting star — streaks across every few seconds
      const sp = mt % 4700;
      if (sp < 700) {
        const pr = sp / 700;
        const ssx = -60 + pr * (C.W + 120);
        const ssy = 40 + pr * 130;
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,230,${(1 - pr) * 0.9})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(ssx, ssy);
        ctx.lineTo(ssx - 55, ssy - 15);
        ctx.stroke();
        ctx.restore();
      }
      // Drifting satellite with blinking beacon
      const satX = ((mt / 30) % (C.W + 160)) - 80;
      const satY = 130 + Math.sin(mt / 2200) * 10;
      ctx.save();
      ctx.translate(satX, satY);
      ctx.fillStyle = '#AAB4C0'; ctx.fillRect(-6, -4, 12, 8);       // body
      ctx.fillStyle = '#2255CC';
      ctx.fillRect(-24, -3, 14, 6); ctx.fillRect(10, -3, 14, 6);    // solar panels
      ctx.strokeStyle = '#889'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -10); ctx.stroke(); // antenna
      if (Math.floor(mt / 500) % 2 === 0) {
        ctx.fillStyle = '#FF3333';
        ctx.beginPath(); ctx.arc(0, -11, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
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
      ambient: { count: 26, colors: ['#FF4400', '#FF7722', '#FFAA33', '#CC1100'], size: [2, 4],
                 vx: [-0.25, 0.25], vy: [-0.9, -0.35], sway: 0.8, glow: true, alpha: 0.85, area: [40, C.GROUND] },

      update(dt) {
        for (const obs of this.obstacles) { if (obs.update) obs.update(dt); }
        this.demon.update(dt);
      },

      drawBg(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
        g.addColorStop(0, '#1A0005'); g.addColorStop(0.5, '#300010'); g.addColorStop(1, '#480018');
        ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.GROUND);
        const ut = Date.now();
        // Ceiling cracks — flare bright when lightning strikes
        const bolt = (ut % 3300) < 120;
        ctx.save();
        if (bolt) { ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 12; }
        ctx.strokeStyle = bolt ? 'rgba(255,180,80,0.95)' : 'rgba(255,80,0,0.28)';
        ctx.lineWidth = bolt ? 2.5 : 1.5;
        [[60,0,90,28],[200,0,170,35],[350,0,320,22],[540,0,510,30],[700,0,680,25]].forEach(([x1,y1,x2,y2]) => {
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-14,y2+12); ctx.stroke();
        });
        ctx.restore();
        if (bolt) {
          ctx.fillStyle = 'rgba(255,120,40,0.07)';
          ctx.fillRect(0, 0, C.W, C.GROUND);
        }
        // Stalactites
        const stalacs = [[80,14,38],[180,10,28],[360,12,32],[500,16,42],[700,11,26]];
        stalacs.forEach(([sx,sw,sh]) => {
          ctx.fillStyle = '#1A0005';
          ctx.beginPath(); ctx.moveTo(sx-sw/2,0); ctx.lineTo(sx+sw/2,0); ctx.lineTo(sx,sh); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2A000A';
          ctx.beginPath(); ctx.moveTo(sx-sw/4,0); ctx.lineTo(sx+sw/4,0); ctx.lineTo(sx,sh*0.5); ctx.closePath(); ctx.fill();
        });
        // Lava glow pools — each pulses on its own rhythm, with rising heat shimmer
        [[150,C.GROUND-8,55],[400,C.GROUND-6,40],[600,C.GROUND-9,50]].forEach(([lx,ly,lw]) => {
          const pulse = 0.10 + 0.09 * (Math.sin(ut / 600 + lx) * 0.5 + 0.5);
          ctx.fillStyle = `rgba(255,60,0,${pulse.toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(lx, ly, lw + Math.sin(ut / 800 + lx) * 5, 9, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = `rgba(255,160,40,${(pulse * 0.8).toFixed(3)})`;
          ctx.beginPath(); ctx.ellipse(lx, ly, lw * 0.5, 5, 0, 0, Math.PI*2); ctx.fill();
          // heat shimmer bubbles drifting up
          for (let bi = 0; bi < 3; bi++) {
            const bp = ((ut / (900 + bi * 340) + bi * 0.37 + lx) % 1);
            ctx.fillStyle = `rgba(255,140,60,${((1 - bp) * 0.35).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(lx + Math.sin(ut / 500 + bi * 2 + lx) * lw * 0.5, ly - bp * 46, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        // Pentagram — breathes: glow and radius swell in and out
        ctx.save();
        const breath = Math.sin(ut / 1500) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(220,0,40,${(0.10 + breath * 0.22).toFixed(3)})`;
        ctx.lineWidth = 1 + breath;
        ctx.shadowColor = '#FF0033'; ctx.shadowBlur = 4 + breath * 10;
        ctx.translate(C.W/2, C.GROUND-2);
        const R = 56 + breath * 8;
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
      skyTop: '#6AAEDD', skyBot: '#C8EAFF',
      groundColor: '#87CEEB', groundLine: '#87CEEB',
      noGround: true,
      playerStarts: [[150, CLOUD_Y], [650, CLOUD_Y]],
      badge: 'FLOATING CLOUDS  ·  FALL = LOSE',
      badgeColor: 'rgba(80,140,200,0.85)',
      badgeTextColor: '#DDEEFF',
      parallax: [
        { type: 'clouds', y: 190, color: '#FFFFFF', speed: 7, size: 70, count: 4, alpha: 0.35 },
        { type: 'clouds', y: 290, color: '#EAF6FF', speed: 14, size: 50, count: 5, alpha: 0.3 },
      ],
      ambient: { count: 18, colors: ['#FFFFFF', '#E8F6FF'], size: [1, 3],
                 vx: [-0.5, -0.15], vy: [-0.1, 0.15], sway: 0.8, glow: true, alpha: 0.7, area: [60, C.GROUND + 40] },

      drawBg(ctx) {
        const t = Date.now();
        // Rainbow arc behind everything
        ctx.save();
        ctx.lineWidth = 6;
        ['rgba(255,60,60,0.22)','rgba(255,170,40,0.22)','rgba(255,240,60,0.22)',
         'rgba(80,220,90,0.22)','rgba(70,150,255,0.22)','rgba(160,90,230,0.22)'].forEach((col, ri) => {
          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.arc(C.W / 2, C.GROUND + 160, 340 - ri * 6, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        });
        ctx.restore();
        // Drifting background clouds
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        [[80,80,90,22],[300,55,130,18],[550,90,100,20],[700,65,80,18]].forEach(([cx,cy,cw,ch], ci) => {
          const dx = ((cx + t / (90 + ci * 25)) % (C.W + 2 * cw)) - cw;
          ctx.beginPath(); ctx.ellipse(dx, cy, cw, ch, 0, 0, Math.PI*2); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        [[160,110,70,14],[420,100,90,16],[640,115,65,13]].forEach(([cx,cy,cw,ch], ci) => {
          const dx = ((cx + t / (60 + ci * 18)) % (C.W + 2 * cw)) - cw;
          ctx.beginPath(); ctx.ellipse(dx, cy, cw, ch, 0, 0, Math.PI*2); ctx.fill();
        });

        ctx.save();
        ctx.shadowColor = '#FFE066'; ctx.shadowBlur = 20 + Math.sin(t / 600) * 6;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(720, 55, 32, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();

        // Drifting hot-air balloon
        const balX = ((t / 70) % (C.W + 240)) - 120;
        const balY = 120 + Math.sin(t / 1600) * 14;
        ctx.save();
        ctx.translate(balX, balY);
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath(); ctx.arc(0, 0, 22, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.quadraticCurveTo(-10, 24, -4, 30);
        ctx.lineTo(4, 30); ctx.quadraticCurveTo(10, 24, 22, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#F7DC6F';
        ctx.beginPath(); ctx.moveTo(-8, -21); ctx.quadraticCurveTo(0, 34, 0, 34);
        ctx.quadraticCurveTo(8, 10, 8, -21); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#6E4B2A'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-5, 30); ctx.lineTo(-4, 38); ctx.moveTo(5, 30); ctx.lineTo(4, 38); ctx.stroke();
        ctx.fillStyle = '#8B5A2B'; ctx.fillRect(-6, 38, 12, 9);
        ctx.restore();

        // Bird flocks passing through
        drawFlyingBirds(ctx, t, { count: 5, y: 200, speed: 34, color: '#3A5068', spread: 30 });
        drawFlyingBirds(ctx, t + 60000, { count: 3, y: 95, speed: 24, color: '#56708A', spread: 40 });
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
