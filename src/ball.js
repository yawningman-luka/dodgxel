class Ball {
  constructor() {
    this.reset();
  }

  reset(holder = 0) {
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.holder = holder; // 0 = P1, 1 = P2, -1 = in flight / free
    this.lastThrower = holder;
    this.inFlight = false;
    this.spinning = false;
    this.isRocket = false;
    this.shadow = false; // passes through obstacles
    this.dead = false; // true after scoring, prevents re-scoring
    this.teleportCooldown = 0;
    this.groundBounces = 0;
    this._trail = [];
    this.curve = false;
    this._curveT = 0;
  }

  // vx/vy: actual velocity components
  throw(fromX, fromY, vx, vy, isRocket, isShadow) {
    this.x = fromX;
    this.y = fromY;
    this.vx = vx;
    this.vy = vy;
    this.inFlight = true;
    this.holder = -1;
    this.spinning = true;
    this.isRocket = !!isRocket;
    this.shadow = !!isShadow;
    this.dead = false;
    this._trail = [];
    this.curve = false;
    this._curveT = 0;
  }

  update(dt, obstacles, gravityMult = 1) {
    if (!this.inFlight || this.dead) return;
    if (this.teleportCooldown > 0) this.teleportCooldown -= dt;

    // Trail — record position before this frame's move
    this._trail.push({ x: this.x, y: this.y });
    if (this._trail.length > 7) this._trail.shift();

    // Curve effect — sinusoidal horizontal drift
    if (this.curve) {
      this._curveT += dt;
      this.vx += Math.sin(this._curveT * 0.005) * 0.2;
    }

    const gravity = this.isRocket ? C.BALL_GRAVITY * 0.4 : C.BALL_GRAVITY;
    this.vy += gravity * gravityMult; // negative gravityMult = inverted (pulls up)

    this.x += this.vx;
    this.y += this.vy;

    // Wall bounce — keep lastThrower so wall-bounce hits still score
    if (this.x - C.BALL_R < 0) {
      this.x = C.BALL_R;
      this.vx = Math.abs(this.vx) * 0.8;
    }
    if (this.x + C.BALL_R > C.W) {
      this.x = C.W - C.BALL_R;
      this.vx = -Math.abs(this.vx) * 0.8;
    }

    if (gravityMult >= 0) {
      // Normal: ceiling bounce at y≈42, dies on ground
      if (this.y - C.BALL_R < 42) {
        this.y = C.BALL_R + 42;
        this.vy = Math.abs(this.vy) * 0.65;
      }
      if (this.y + C.BALL_R >= C.GROUND) {
        this.y = C.GROUND - C.BALL_R;
        this.lastThrower = -1;
        if (this.groundBounces < 1) {
          this.vy = -Math.abs(this.vy) * 0.58;
          this.vx *= 0.75;
          this.groundBounces++;
          if (Math.abs(this.vy) < 1.2) {
            this.dead = true; this.inFlight = false;
            this.vx = 0; this.vy = 0; this.spinning = false;
          }
        } else {
          this.dead = true; this.inFlight = false;
          this.vx = 0; this.vy = 0; this.spinning = false;
        }
      }
    } else {
      // Inverted: floor bounce at C.GROUND, dies on ceiling at y=90
      if (this.y + C.BALL_R > C.GROUND - 5) {
        this.y = C.GROUND - 5 - C.BALL_R;
        this.vy = -Math.abs(this.vy) * 0.65;
      }
      if (this.y - C.BALL_R <= 90) {
        this.y = 90 + C.BALL_R;
        this.lastThrower = -1;
        if (this.groundBounces < 1) {
          this.vy = Math.abs(this.vy) * 0.58; // bounce back downward
          this.vx *= 0.75;
          this.groundBounces++;
          if (Math.abs(this.vy) < 1.2) {
            this.dead = true; this.inFlight = false;
            this.vx = 0; this.vy = 0; this.spinning = false;
          }
        } else {
          this.dead = true; this.inFlight = false;
          this.vx = 0; this.vy = 0; this.spinning = false;
        }
      }
    }

    // Obstacle collisions
    for (const obs of obstacles) {
      this._collideObstacle(obs.rect, obs.absorb);
    }
  }

  _collideObstacle(rect, absorb = false) {
    if (this.shadow) return; // shadow ball passes through obstacles

    const { x, y, w, h } = rect;
    const closestX = Math.max(x, Math.min(this.x, x + w));
    const closestY = Math.max(y, Math.min(this.y, y + h));
    const dx = this.x - closestX;
    const dy = this.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < C.BALL_R * C.BALL_R) {
      const dist = Math.sqrt(distSq) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      this.x = closestX + nx * (C.BALL_R + 1);
      this.y = closestY + ny * (C.BALL_R + 1);

      if (absorb) {
        this.vx *= 0.1;
        this.vy *= 0.1;
        this.spinning = false;
        this.dead = true;
        this.inFlight = false;
      } else {
        const dot = this.vx * nx + this.vy * ny;
        this.vx = (this.vx - 2 * dot * nx) * 0.68;
        this.vy = (this.vy - 2 * dot * ny) * 0.68;
        this.lastThrower = -1;
      }
    }
  }

  canBeCaught(px, py, catchRadius) {
    if (!this.inFlight || this.dead) return false;
    const dx = this.x - px;
    const dy = this.y - (py - 28);
    return (dx * dx + dy * dy) < catchRadius * catchRadius;
  }

  checkHit(player) {
    if (!this.inFlight || this.dead) return false;
    if (this.lastThrower === player.index) return false;
    const hitH = player.crouching ? C.CROUCH_H : C.P_H;
    const left = player.x - C.P_W / 2 - 3;
    const right = player.x + C.P_W / 2 + 3;
    // Inverted players: feet at ceiling (player.y), body extends downward
    const top    = player.invertGravity ? player.y       : player.y - hitH;
    const bottom = player.invertGravity ? player.y + hitH : player.y + 4;
    return (this.x + C.BALL_R > left && this.x - C.BALL_R < right &&
            this.y + C.BALL_R > top  && this.y - C.BALL_R < bottom);
  }

  draw(ctx) {
    if (!this.inFlight && !this.dead) return;

    // Trail (skip for rocket — it has its own)
    if (this.inFlight && !this.isRocket && this._trail.length > 1) {
      const trailCol = this.curve ? C.COL.SP_CURVE : C.COL.BALL;
      for (let i = 0; i < this._trail.length - 1; i++) {
        const t = this._trail[i];
        const frac = (i + 1) / this._trail.length;
        ctx.globalAlpha = frac * 0.32;
        ctx.fillStyle = trailCol;
        const r = C.BALL_R * (0.35 + frac * 0.45);
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Curve aura
    if (this.curve && this.inFlight) {
      const pulse = 0.25 + 0.2 * Math.sin(Date.now() / 80);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = C.COL.SP_CURVE;
      ctx.beginPath();
      ctx.arc(this.x, this.y, C.BALL_R + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    Sprites.drawBall(ctx, this.x, this.y, this.spinning, false);
    if (this.isRocket && this.inFlight) {
      for (let i = 1; i <= 4; i++) {
        const tx = this.x - this.vx * i * 0.7;
        const ty = this.y - this.vy * i * 0.7;
        ctx.globalAlpha = 0.3 / i;
        ctx.fillStyle = C.COL.SP_ROCKET;
        ctx.beginPath();
        ctx.arc(tx, ty, C.BALL_R * (1 - i * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
