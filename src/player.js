class Player {
  constructor(index, startX, keys) {
    this.index = index;
    this.startX = startX;
    this.keys = keys;
    this.isGirl = index === 1;
    this.score = 0;
    this.reset();
  }

  reset() {
    this.x = this.startX;
    this.y = C.GROUND;
    this.vx = 0; this.vy = 0;
    this.onGround = true;
    this.crouching = false;
    // dir: 1 = facing right (P1), -1 = facing left (P2)
    this.dir = this.index === 0 ? 1 : -1;

    this.state = 'idle';
    this.hasBall = false;
    // aimAngle: in [−π/5, π/2]; same for both players.
    // dir is applied when computing vx so P2 throws left.
    this.aimAngle = Math.PI / 8;
    this.throwCharge = 0;
    this.throwing = false;

    this.catchCooldown = 0;
    this.shieldAvailable = true;
    this.shieldActive = false;
    this.shieldCooldown = 0;
    this.stunTimer = 0;

    this.spCharge = 0;
    this.currentPower = null;
    this._powerAssigned = false;
    this.extraThrowCallback = null;

    this.justCaughtFlash = 0;
    this.hitCallback = null; // set by game to trigger scoring
    this.noMidline = false;
    this.hordeMode = false;
    this.gravityMult   = 1;
    this.jumpForceMult = 1;
  }

  get catchRadius() {
    return C.CATCH_RADIUS;
  }

  update(dt, ball, obstacles, otherPlayer, speedMult = 1) {
    const k = this.keys;

    // Tick timers
    if (this.stunTimer > 0) this.stunTimer -= dt;
    if (this.catchCooldown > 0) this.catchCooldown -= dt;
    if (!this.shieldAvailable && this.shieldCooldown > 0) {
      this.shieldCooldown -= dt;
      if (this.shieldCooldown <= 0) { this.shieldAvailable = true; this.shieldCooldown = 0; }
    }
    if (this.justCaughtFlash > 0) this.justCaughtFlash -= dt;

    // Superpower passive charge; randomly assign power when bar first fills
    if (this.spCharge < C.SP_CHARGE_MAX) {
      this.spCharge += C.SP_CHARGE_RATE * (this.hordeMode ? 3.5 : 1);
    } else if (!this._powerAssigned) {
      this.currentPower = C.POWERS[Math.floor(Math.random() * C.POWERS.length)];
      this._powerAssigned = true;
    }

    const stunned = this.stunTimer > 0;

    // Shield toggle (not while holding ball)
    if (!stunned && Input.wasPressed(k.shield) && this.shieldAvailable && !this.hasBall) {
      this.shieldActive = !this.shieldActive;
    }
    if (this.shieldActive && this.hasBall) this.shieldActive = false;

    if (stunned) {
      this.vx *= 0.78;
      this._applyPhysics(obstacles);
      this.state = 'stunned';
      return;
    }

    const isThrowing = Input.isDown(k.throw);
    const prevThrowing = this.throwing;

    // === Throwing ===
    if (this.hasBall) {
      if (isThrowing) {
        this.throwing = true;
        this.throwCharge = Math.min(C.THROW_CHARGE_TIME, this.throwCharge + dt);
        this.state = 'throwing';

        // Aim with jump/crouch keys while holding throw button
        const aimSpeed = 0.035;
        if (Input.isDown(k.jump))   this.aimAngle += aimSpeed;
        if (Input.isDown(k.crouch)) this.aimAngle -= aimSpeed;
        this.aimAngle = Math.max(-Math.PI / 5, Math.min(Math.PI * 0.52, this.aimAngle));
      } else if (prevThrowing) {
        // Released throw button - launch!
        this._doThrow(ball);
      }
    } else {
      this.throwing = false;
      this.throwCharge = 0;
    }

    // === Catching ===
    if (Input.wasPressed(k.catch) && this.catchCooldown <= 0) {
      if (ball.canBeCaught(this.x, this.y, this.catchRadius) && ball.lastThrower !== this.index) {
        this._doCatch(ball);
      } else {
        // Whiff
        this.stunTimer = 180;
        this.vx += this.dir * -1.5;
        this.catchCooldown = 350;
      }
    }

    // === Movement (blocked while aiming) ===
    const blockMove = this.throwing && this.hasBall;
    if (!blockMove) {
      const left  = Input.isDown(k.left);
      const right = Input.isDown(k.right);
      this.crouching = Input.isDown(k.crouch) && this.onGround && !isThrowing;

      if (!this.crouching) {
        if (left && !right)  { this.vx -= C.WALK_SPEED * speedMult; this.dir = -1; }
        if (right && !left)  { this.vx += C.WALK_SPEED * speedMult; this.dir =  1; }
      }

      if (Input.wasPressed(k.jump) && this.onGround && !this.crouching) {
        this.vy = C.JUMP_FORCE * this.jumpForceMult;
        this.onGround = false;
      }
    }

    // Friction
    this.vx *= C.FRICTION;
    if (Math.abs(this.vx) < 0.1) this.vx = 0;

    // State
    if (!this.throwing) {
      if (this.crouching)          this.state = 'crouch';
      else if (!this.onGround)     this.state = 'jumping';
      else if (Math.abs(this.vx) > 0.3) this.state = 'running';
      else                         this.state = 'idle';
    }

    this._applyPhysics(obstacles);

    // Ball hit detection (skip if ghost or horde mode — enemy balls handled separately)
    if (!this.ghostMode && !this.hordeMode && ball.checkHit(this)) {
      if (this.shieldActive) {
        // Shield deflect: send ball back toward thrower
        ball.vx = -ball.vx * 1.15;
        ball.vy = ball.vy * -0.5;
        this.shieldActive = false;
        this.shieldAvailable = false;
        this.shieldCooldown = C.SHIELD_RECHARGE;
      } else {
        this._getHit(ball, otherPlayer);
      }
    }
  }

  _doThrow(ball) {
    const pct = Math.min(1, this.throwCharge / C.THROW_CHARGE_TIME);
    const speed = C.MIN_THROW_SPEED + (C.MAX_THROW_SPEED - C.MIN_THROW_SPEED) * pct;

    const vx = this.dir * Math.cos(this.aimAngle) * speed;
    const vy = -Math.sin(this.aimAngle) * speed;

    const armX = this.x + this.dir * 26;
    const armY = this.y - 34;

    const usePower = this._powerAssigned && this.spCharge >= C.SP_CHARGE_MAX;
    const useRocket = usePower && this.currentPower === 'rocket';
    const useShadow = usePower && this.currentPower === 'shadow';
    const useDouble = usePower && this.currentPower === 'double';

    ball.throw(armX, armY, vx * (useRocket ? 2.2 : 1), vy, useRocket, useShadow);
    ball.lastThrower = this.index;

    if (useDouble && this.extraThrowCallback) {
      // Second ball at a slightly offset angle
      const vx2 = this.dir * Math.cos(this.aimAngle - 0.22) * speed;
      const vy2 = -Math.sin(this.aimAngle - 0.22) * speed;
      this.extraThrowCallback(armX, armY + 10, vx2, vy2, this.index);
    }

    if (usePower) {
      this.spCharge = 0;
      this._powerAssigned = false;
      this.currentPower = null;
    }

    this.hasBall = false;
    this.throwing = false;
    this.throwCharge = 0;
    this.aimAngle = Math.PI / 8;
    this.state = 'idle';
  }

  _doCatch(ball) {
    ball.inFlight = false;
    ball.holder = this.index;
    ball.dead = false;
    this.hasBall = true;
    this.throwing = false;
    this.throwCharge = 0;
    this.justCaughtFlash = 400;
    this.spCharge = Math.min(C.SP_CHARGE_MAX, this.spCharge + C.SP_CHARGE_CATCH);
    this.aimAngle = Math.PI / 8;
  }

  _getHit(ball, otherPlayer) {
    ball.inFlight = false;
    ball.dead = true;
    this.stunTimer = 900;
    this.vx = ball.vx * 0.35;
    this.vy = Math.min(ball.vy * 0.35, -2.5);
    this.hasBall = false;
    this.throwing = false;
    // hitCallback is set by game.js to handle scoring
    if (this.hitCallback) this.hitCallback(this, otherPlayer);
  }

  _applyPhysics(obstacles) {
    if (!this.onGround) this.vy += C.GRAVITY * this.gravityMult;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y >= C.GROUND) { this.y = C.GROUND; this.vy = 0; this.onGround = true; }
    else this.onGround = false;

    const hw = C.P_W / 2;
    if (this.x < hw)        { this.x = hw;        this.vx = 0; }
    if (this.x > C.W - hw)  { this.x = C.W - hw;  this.vx = 0; }
    if (!this.noMidline) {
      const mid = C.W / 2;
      if (this.index === 0 && this.x > mid - hw) { this.x = mid - hw; this.vx = 0; }
      if (this.index === 1 && this.x < mid + hw) { this.x = mid + hw; this.vx = 0; }
    }

    const ph = this.crouching ? C.CROUCH_H : C.P_H;
    for (const obs of obstacles) {
      if (obs.ballOnly) continue;
      this._collideObstacle(obs.rect, ph);
    }
  }

  _collideObstacle(rect, ph) {
    const px1 = this.x - C.P_W / 2, px2 = this.x + C.P_W / 2;
    const py1 = this.y - ph,        py2 = this.y;
    const { x: rx, y: ry, w: rw, h: rh } = rect;
    const rx2 = rx + rw, ry2 = ry + rh;

    if (px2 <= rx || px1 >= rx2 || py2 < ry || py1 >= ry2) return;

    const ol = px2 - rx, or_ = rx2 - px1;
    const ot = py2 - ry, ob = ry2 - py1;
    const minH = Math.min(ol, or_), minV = Math.min(ot, ob);

    if (minV <= minH) {
      if (ot < ob) { this.y = ry;       this.vy = 0; this.onGround = true; }
      else         { this.y = ry2 + ph; this.vy = Math.max(0, this.vy); }
    } else {
      if (ol < or_) this.x = rx  - C.P_W / 2;
      else          this.x = rx2 + C.P_W / 2;
      this.vx = 0;
    }
  }

  draw(ctx, ball) {
    // Catch ring
    if (!this.hasBall && ball.inFlight && !ball.dead &&
        ball.canBeCaught(this.x, this.y, this.catchRadius)) {
      Sprites.drawCatchRing(ctx, this.x, this.y);
    }

    if (this.shieldActive) Sprites.drawShield(ctx, this.x, this.y, this.dir);
    if (this.stunTimer > 0) Sprites.drawStunStars(ctx, this.x, this.y);

    if (this.throwing && this.hasBall) {
      Sprites.drawThrowPower(ctx, this.x, this.y, this.throwCharge, this.dir);
    }

    const drawFn = this.isGirl
      ? Sprites.drawGirl.bind(Sprites)
      : Sprites.drawBoy.bind(Sprites);
    drawFn(ctx, this.x, this.y, this.state, this.dir, this.aimAngle, this.hasBall);

    if (this.justCaughtFlash > 0) {
      ctx.fillStyle = 'rgba(80,255,120,0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 22, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
