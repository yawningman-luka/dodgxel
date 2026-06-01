class Ball {
  constructor() {
    this.reset();
  }

  reset(holder = 0) {
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.holder = holder;
    this.lastThrower = holder;
    this.inFlight = false;
    this.spinning = false;
    this.isRocket = false;
    this.shadow = false;
    this.dead = false;
    this.teleportCooldown = 0;
    this.groundBounces = 0;
    this._trail = [];
    this.curve = false;
    this._curveT = 0;
    // New powers
    this.radius        = C.BALL_R;  // overridden by heavy/mini
    this.boomerang     = false;
    this._boomDist     = 0;
    this._boomFlipped  = false;
    this.blaze         = false;
    this._blazeTimer   = 0;
    this.blazeDeathCb  = null;   // set by game: (x,y) => add hazard
    this.heavy         = false;
    this.seeker        = false;
    this._seekerTargetFn = null; // set by game: () => opponentX
    this.split         = false;
    this._splitT       = 0;
    this._splitDone    = false;
    this.splitCb       = null;   // set by game: (x,y,vx,vy,thr) => spawn minis
    this.mini          = false;  // true for split fragments
    this.worldW        = C.W;    // override for wide arenas (e.g. Salvo)
  }

  throw(fromX, fromY, vx, vy, isRocket, isShadow) {
    this.x = fromX; this.y = fromY;
    this.vx = vx;   this.vy = vy;
    this.inFlight = true; this.holder = -1; this.spinning = true;
    this.isRocket = !!isRocket; this.shadow = !!isShadow;
    this.dead = false; this._trail = []; this.curve = false; this._curveT = 0;
    this.boomerang = false; this._boomDist = 0; this._boomFlipped = false;
    this.blaze = false; this._blazeTimer = 0; this.blazeDeathCb = null;
    this.heavy = false; this.seeker = false; this._seekerTargetFn = null;
    this.split = false; this._splitT = 0; this._splitDone = false; this.splitCb = null;
    this.mini = false; this.radius = C.BALL_R; this.worldW = C.W;
  }

  update(dt, obstacles, gravityMult = 1) {
    if (!this.inFlight || this.dead) return;
    if (this.teleportCooldown > 0) this.teleportCooldown -= dt;

    // Trail
    this._trail.push({ x: this.x, y: this.y });
    if (this._trail.length > 7) this._trail.shift();

    // Curve
    if (this.curve) { this._curveT += dt; this.vx += Math.sin(this._curveT * 0.005) * 0.2; }

    // Boomerang — flip vx after ~300px of horizontal travel
    if (this.boomerang && !this._boomFlipped) {
      this._boomDist += Math.abs(this.vx);
      if (this._boomDist > 300) { this.vx *= -1; this._boomFlipped = true; }
    }

    // Seeker — gently steer toward opponent after half the arena
    if (this.seeker && this._seekerTargetFn) {
      const tx = this._seekerTargetFn();
      this.vx += (tx - this.x) * 0.0006;
    }

    // Split — after 440ms, fire callback to spawn mini balls then die
    if (this.split && !this._splitDone) {
      this._splitT += dt;
      if (this._splitT >= 440) {
        this._splitDone = true;
        if (this.splitCb) this.splitCb(this.x, this.y, this.vx, this.vy, this.lastThrower);
        this.dead = true; this.inFlight = false; return;
      }
    }

    // Blaze — leave fire particles
    if (this.blaze) {
      this._blazeTimer -= dt;
      if (this._blazeTimer <= 0) {
        this._blazeTimer = 40;
        Particles.emit(this.x, this.y, 3, ['#FF4400','#FF8800','#FFCC00'],
          { upBias: -0.5, minSpeed: 0.5, maxSpeed: 2, gravity: 0.05 });
      }
    }

    const R = this.radius;
    const gravity = this.isRocket ? C.BALL_GRAVITY * 0.4 : this.heavy ? C.BALL_GRAVITY * 1.8 : C.BALL_GRAVITY;
    this.vy += gravity * gravityMult;

    this.x += this.vx;
    this.y += this.vy;

    // Wall bounce (respects worldW for wide arenas)
    if (this.x - R < 0)            { this.x = R;              this.vx =  Math.abs(this.vx) * 0.8; }
    if (this.x + R > this.worldW)  { this.x = this.worldW - R; this.vx = -Math.abs(this.vx) * 0.8; }

    if (gravityMult >= 0) {
      if (this.y - R < 42) { this.y = R + 42; this.vy = Math.abs(this.vy) * 0.65; }
      if (this.y + R >= C.GROUND) {
        this.y = C.GROUND - R;
        this.lastThrower = -1;
        if (this.blazeDeathCb) { this.blazeDeathCb(this.x, this.y); this.blazeDeathCb = null; }
        if (this.groundBounces < 1) {
          this.vy = -Math.abs(this.vy) * 0.58; this.vx *= 0.75; this.groundBounces++;
          if (Math.abs(this.vy) < 1.2) { this.dead = true; this.inFlight = false; this.vx = 0; this.vy = 0; this.spinning = false; }
        } else { this.dead = true; this.inFlight = false; this.vx = 0; this.vy = 0; this.spinning = false; }
      }
    } else {
      if (this.y + R > C.GROUND - 5) { this.y = C.GROUND - 5 - R; this.vy = -Math.abs(this.vy) * 0.65; }
      if (this.y - R <= 90) {
        this.y = 90 + R; this.lastThrower = -1;
        if (this.groundBounces < 1) {
          this.vy = Math.abs(this.vy) * 0.58; this.vx *= 0.75; this.groundBounces++;
          if (Math.abs(this.vy) < 1.2) { this.dead = true; this.inFlight = false; this.vx = 0; this.vy = 0; this.spinning = false; }
        } else { this.dead = true; this.inFlight = false; this.vx = 0; this.vy = 0; this.spinning = false; }
      }
    }

    for (const obs of obstacles) { this._collideObstacle(obs.rect, obs.absorb); }
  }

  _collideObstacle(rect, absorb = false) {
    if (this.shadow) return;
    const R = this.radius;
    const { x, y, w, h } = rect;
    const closestX = Math.max(x, Math.min(this.x, x + w));
    const closestY = Math.max(y, Math.min(this.y, y + h));
    const dx = this.x - closestX, dy = this.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < R * R) {
      const dist = Math.sqrt(distSq) || 1;
      const nx = dx / dist, ny = dy / dist;
      this.x = closestX + nx * (R + 1);
      this.y = closestY + ny * (R + 1);

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
    const dx = this.x - px, dy = this.y - (py - 28);
    return (dx * dx + dy * dy) < catchRadius * catchRadius;
  }

  checkHit(player) {
    if (!this.inFlight || this.dead) return false;
    if (this.lastThrower === player.index) return false;
    const R = this.radius;
    const hitH = player.crouching ? C.CROUCH_H : C.P_H;
    const left = player.x - C.P_W / 2 - 3, right = player.x + C.P_W / 2 + 3;
    const top    = player.invertGravity ? player.y        : player.y - hitH;
    const bottom = player.invertGravity ? player.y + hitH : player.y + 4;
    return (this.x + R > left && this.x - R < right &&
            this.y + R > top  && this.y - R < bottom);
  }

  draw(ctx) {
    if (!this.inFlight && !this.dead) return;
    const R = this.radius;

    // Trail
    if (this.inFlight && !this.isRocket && this._trail.length > 1) {
      const trailCol = this.curve ? C.COL.SP_CURVE
                     : this.boomerang ? C.COL.SP_BOOMERANG
                     : this.seeker   ? C.COL.SP_SEEKER
                     : this.split    ? C.COL.SP_SPLIT
                     : C.COL.BALL;
      for (let i = 0; i < this._trail.length - 1; i++) {
        const t = this._trail[i];
        const frac = (i + 1) / this._trail.length;
        ctx.globalAlpha = frac * 0.32;
        ctx.fillStyle = trailCol;
        ctx.beginPath();
        ctx.arc(t.x, t.y, R * (0.35 + frac * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Auras
    if (this.curve && this.inFlight) {
      const pulse = 0.25 + 0.2 * Math.sin(Date.now() / 80);
      ctx.globalAlpha = pulse; ctx.fillStyle = C.COL.SP_CURVE;
      ctx.beginPath(); ctx.arc(this.x, this.y, R + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.seeker && this.inFlight) {
      const pulse = 0.2 + 0.15 * Math.sin(Date.now() / 60);
      ctx.globalAlpha = pulse; ctx.fillStyle = C.COL.SP_SEEKER;
      ctx.beginPath(); ctx.arc(this.x, this.y, R + 5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.boomerang && this.inFlight) {
      const pulse = 0.2 + 0.15 * Math.sin(Date.now() / 90);
      ctx.globalAlpha = pulse; ctx.fillStyle = C.COL.SP_BOOMERANG;
      ctx.beginPath(); ctx.arc(this.x, this.y, R + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.split && this.inFlight) {
      const pulse = 0.2 + 0.2 * Math.sin(Date.now() / 50);
      ctx.globalAlpha = pulse; ctx.fillStyle = C.COL.SP_SPLIT;
      ctx.beginPath(); ctx.arc(this.x, this.y, R + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    Sprites.drawBall(ctx, this.x, this.y, this.spinning, false, R);

    // Rocket exhaust
    if (this.isRocket && this.inFlight) {
      for (let i = 1; i <= 4; i++) {
        ctx.globalAlpha = 0.3 / i; ctx.fillStyle = C.COL.SP_ROCKET;
        ctx.beginPath();
        ctx.arc(this.x - this.vx*i*0.7, this.y - this.vy*i*0.7, R*(1-i*0.15), 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Heavy — dark ring
    if (this.heavy && this.inFlight) {
      ctx.strokeStyle = C.COL.SP_HEAVY; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, R + 2, 0, Math.PI * 2); ctx.stroke();
    }
  }
}
