// ── Story mode ────────────────────────────────────────────────────────────────

const _ALL_ENEMY_DEFS = () => ({ ...ENEMY_DEFS, ...STORY_ENEMY_DEFS });

// ── StoryEnemy — tracks player instead of always walking left ─────────────────
class StoryEnemy {
  constructor(x, type) {
    const defs = _ALL_ENEMY_DEFS();
    this.x = x; this.y = C.GROUND; this.type = type;
    this.def = defs[type];
    this.hp = this.def.hp; this.maxHp = this.def.hp;
    this.w = this.def.w; this.h = this.def.h;
    this.speed = this.def.speed;
    this.vy = 0; this.onGround = true; this.dead = false;
    this._flashTimer = 0;
    this._floatOffset = Math.random() * Math.PI * 2;
    this.throwTimer = this.def.throwInterval * (0.4 + Math.random() * 0.6);
    this._legAnim = Math.random() * Math.PI * 2;
    this.contactCooldown = 0;
    this._teleportTimer = 1500 + Math.random() * 1000;
  }

  update(dt, players, enemyBalls) {
    if (this.dead) return;
    if (this._flashTimer > 0) this._flashTimer -= dt;
    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    this._legAnim += dt * 0.012;

    const def = this.def;
    let target = players[0];
    for (const p of players) {
      if (Math.abs(this.x - p.x) < Math.abs(this.x - target.x)) target = p;
    }
    if (!target) return;

    if (def.teleports) {
      this._teleportTimer -= dt;
      if (this._teleportTimer <= 0) {
        this._teleportTimer = 1800 + Math.random() * 1200;
        const side = Math.random() > 0.5 ? 1 : -1;
        this.x = Math.max(40, Math.min(STORY_WORLD_W - 40,
          target.x + side * (90 + Math.random() * 80)));
      }
      this.x += Math.sign(target.x - this.x) * this.speed * 0.4;
    } else if (def.floats) {
      this.x += Math.sign(target.x - this.x) * this.speed;
      this.y = (C.GROUND - 90) - 28 * Math.abs(Math.sin(Date.now() * 0.002 + this._floatOffset));
    } else {
      const dx = target.x - this.x;
      if (Math.abs(dx) > 8) this.x += Math.sign(dx) * this.speed;
      if (!this.onGround) {
        this.vy += C.GRAVITY; this.y += this.vy;
        if (this.y >= C.GROUND) { this.y = C.GROUND; this.vy = 0; this.onGround = true; }
      }
    }

    this.throwTimer -= dt;
    if (this.throwTimer <= 0) {
      this.throwTimer = def.throwInterval * (0.8 + Math.random() * 0.4);
      const dx = target.x - this.x;
      const dy = (target.y - 22) - (this.y - this.h * 0.55);
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      enemyBalls.push(new EnemyBall(
        this.x + Math.sign(dx) * this.w * 0.45, this.y - this.h * 0.6,
        (dx / len) * def.throwSpeed, (dy / len) * def.throwSpeed - 1.5
      ));
    }
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
    if (flash) ctx.globalAlpha = 0.3;
    switch (this.type) {
      case 'zombie':     this._drawZombie(ctx, false); break;
      case 'fast_zombie':this._drawZombie(ctx, true);  break;
      case 'ninja':      this._drawNinja(ctx);          break;
      case 'golem':      this._drawGolem(ctx);          break;
      case 'hex_spirit': this._drawHexSpirit(ctx);      break;
      case 'soldier':    this._drawSoldier(ctx);        break;
      case 'drone':
      case 'hack_drone': this._drawDrone(ctx);          break;
      case 'knight':     this._drawKnight(ctx);         break;
      case 'archer':     this._drawArcher(ctx);         break;
      case 'robot':      this._drawRobot(ctx);          break;
      default:           this._drawGeneric(ctx);        break;
    }
    if (this.maxHp > 1) {
      ctx.fillStyle = '#550000'; ctx.fillRect(-this.w / 2, -this.h - 9, this.w, 5);
      ctx.fillStyle = '#FF3333'; ctx.fillRect(-this.w / 2, -this.h - 9, this.w * (this.hp / this.maxHp), 5);
    }
    ctx.restore();
  }

  _drawZombie(ctx, fast) {
    const d = this.def, h = this.h, w = this.w, leg = Math.sin(this._legAnim) * 4;
    Sprites.px(ctx, d.pants, -w*.45,-h*.35, w*.42, h*.35+leg);
    Sprites.px(ctx, d.pants, w*.03, -h*.35, w*.42, h*.35-leg);
    Sprites.px(ctx,'#1A1A1A',-w*.5,-h*.08, w*.44, h*.09);
    Sprites.px(ctx,'#1A1A1A', w*.02,-h*.08, w*.44, h*.09);
    Sprites.px(ctx,'#888', -w/2,-h*.75, w, h*.40);
    Sprites.px(ctx, d.color,-w/2-10,-h*.68,13,7);
    Sprites.px(ctx, d.color, w/2-1,-h*.68,13,7);
    Sprites.px(ctx, d.color,-w/2+2,-h,w-4,h*.27);
    ctx.fillStyle='#FF2222';
    ctx.fillRect(-6,-h+3,3,3);ctx.fillRect(-3,-h+6,3,3);
    ctx.fillRect(2,-h+3,3,3); ctx.fillRect(5,-h+6,3,3);
    if (fast) {
      ctx.strokeStyle='rgba(140,140,255,.75)';ctx.lineWidth=1.5;ctx.setLineDash([2,2]);
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(w/2+3,-h*(.3+i*.15));ctx.lineTo(w/2+12,-h*(.3+i*.15));ctx.stroke();}
      ctx.setLineDash([]);
    }
  }

  _drawNinja(ctx) {
    const h=this.h,w=this.w,leg=Math.sin(this._legAnim)*5;
    Sprites.px(ctx,'#111',-w*.45,-h*.35,w*.42,h*.35+leg);
    Sprites.px(ctx,'#111',w*.03,-h*.35,w*.42,h*.35-leg);
    Sprites.px(ctx,'#111',-w/2,-h*.75,w,h*.42);
    Sprites.px(ctx,'#DDD',-w/2,-h*.44,w,3);
    Sprites.px(ctx,'#111',-w/2-8,-h*.68,10,7);
    Sprites.px(ctx,'#111',w/2-2,-h*.68,10,7);
    Sprites.px(ctx,'#111',-w/2+1,-h,w-2,h*.27);
    Sprites.px(ctx,'#EEE',-w/2+1,-h+2,w-2,h*.09);
    ctx.fillStyle='#FF4400';ctx.fillRect(-5,-h+h*.14,10,4);
  }

  _drawGolem(ctx) {
    const h=this.h,w=this.w,leg=Math.sin(this._legAnim)*3;
    Sprites.px(ctx,'#6B5335',-w*.4,-h*.32,w*.35,h*.32+leg);
    Sprites.px(ctx,'#6B5335', w*.05,-h*.32,w*.35,h*.32-leg);
    Sprites.px(ctx,'#8B7355',-w*.5,-h*.82,w,h*.5);
    Sprites.px(ctx,'#8B7355',-w*.6,-h*.72,w*.16,h*.25);
    Sprites.px(ctx,'#8B7355', w*.44,-h*.72,w*.16,h*.25);
    Sprites.px(ctx,'#7B6345',-w*.44,-h,w*.88,h*.2);
    ctx.fillStyle='#FF8800';
    ctx.beginPath();ctx.arc(-w*.16,-h*.88,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc( w*.16,-h*.88,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#4A3320';
    ctx.fillRect(-w*.3,-h*.78,w*.6,4);
    ctx.strokeStyle='#5A4325';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-w*.2,-h*.6);ctx.lineTo(-w*.05,-h*.45);ctx.stroke();
    ctx.beginPath();ctx.moveTo(w*.1,-h*.65);ctx.lineTo(w*.25,-h*.5);ctx.stroke();
  }

  _drawHexSpirit(ctx) {
    const h=this.h,w=this.w,t=Date.now()*0.004+this._floatOffset;
    ctx.globalAlpha *= 0.75+0.25*Math.sin(t*3);
    ctx.fillStyle='#9955CC';
    ctx.beginPath();
    ctx.moveTo(0,-h); ctx.lineTo(w*.4,-h*.7); ctx.lineTo(w*.4,-h*.3);
    ctx.lineTo(0,-h*.05); ctx.lineTo(-w*.4,-h*.3); ctx.lineTo(-w*.4,-h*.7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#CC44FF';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='#FF88FF';
    ctx.beginPath();ctx.arc(-w*.16,-h*.68,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc( w*.16,-h*.68,4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(200,100,255,0.5)';ctx.lineWidth=1.5;
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2+t;
      ctx.beginPath();ctx.moveTo(0,-h*.5);
      ctx.lineTo(Math.cos(a)*w*.55,-h*.5+Math.sin(a)*h*.3);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  _drawSoldier(ctx) {
    const d=this.def,h=this.h,w=this.w,leg=Math.sin(this._legAnim)*4;
    Sprites.px(ctx,d.pants,-w*.45,-h*.35,w*.42,h*.35+leg);
    Sprites.px(ctx,d.pants,w*.03,-h*.35,w*.42,h*.35-leg);
    Sprites.px(ctx,'#445566',-w*.5,-h*.75,w,h*.4);
    Sprites.px(ctx,'#445566',-w*.5-8,-h*.68,10,7);
    Sprites.px(ctx,'#445566', w*.5-2,-h*.68,10,7);
    Sprites.px(ctx,'#334455',-w*.42,-h,w*.84,h*.27);
    ctx.fillStyle='#AABBCC';ctx.fillRect(-5,-h+2,10,7);
    ctx.fillStyle='#7799BB';ctx.fillRect(-w*.38,-h*.94,w*.76,5);
  }

  _drawDrone(ctx) {
    const h=this.h,w=this.w,t=Date.now()*0.005+this._floatOffset;
    const hov=Math.sin(t)*3;
    ctx.fillStyle=this.type==='hack_drone'?'#00CCAA':'#445566';
    ctx.fillRect(-w*.4,-h*.7+hov,w*.8,h*.45);
    ctx.strokeStyle=this.type==='hack_drone'?'#00FFCC':'#778899';
    ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-w*.5,-h*.75+hov);ctx.lineTo(-w*.9,-h*.75+hov);ctx.stroke();
    ctx.beginPath();ctx.moveTo( w*.5,-h*.75+hov);ctx.lineTo( w*.9,-h*.75+hov);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.beginPath();ctx.arc(-w*.9,-h*.75+hov,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc( w*.9,-h*.75+hov,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=this.type==='hack_drone'?'#00FFCC':'#FF4400';
    ctx.beginPath();ctx.arc(0,-h*.5+hov,4,0,Math.PI*2);ctx.fill();
  }

  _drawKnight(ctx) {
    const h=this.h,w=this.w,leg=Math.sin(this._legAnim)*3;
    Sprites.px(ctx,'#445566',-w*.45,-h*.35,w*.42,h*.35+leg);
    Sprites.px(ctx,'#445566', w*.03,-h*.35,w*.42,h*.35-leg);
    Sprites.px(ctx,'#556677',-w*.5,-h*.82,w,h*.47);
    Sprites.px(ctx,'#556677',-w*.62,-h*.72,w*.18,h*.3);
    Sprites.px(ctx,'#556677', w*.44,-h*.72,w*.18,h*.3);
    Sprites.px(ctx,'#667788',-w*.44,-h,w*.88,h*.22);
    ctx.fillStyle='#CCDDEE';ctx.fillRect(-w*.25,-h*.92,w*.5,5);
    ctx.fillStyle='#1a2030';ctx.fillRect(-w*.3,-h*.86,w*.6,3);
    ctx.fillStyle='#778899';ctx.fillRect(-w*.75,-h*.75,14,22);
    ctx.fillStyle='#CCDDEE';ctx.fillRect(-w*.72,-h*.72,8,16);
  }

  _drawArcher(ctx) {
    const d=this.def,h=this.h,w=this.w,leg=Math.sin(this._legAnim)*4;
    Sprites.px(ctx,d.pants,-w*.45,-h*.35,w*.42,h*.35+leg);
    Sprites.px(ctx,d.pants, w*.03,-h*.35,w*.42,h*.35-leg);
    Sprites.px(ctx,'#8B6914',-w*.5,-h*.75,w,h*.4);
    Sprites.px(ctx,'#8B6914',-w*.5-8,-h*.68,10,7);
    Sprites.px(ctx,'#8B6914', w*.5-2,-h*.68,10,7);
    Sprites.px(ctx,'#7A5810',-w*.42,-h,w*.84,h*.27);
    ctx.fillStyle='#FF8844';
    ctx.beginPath();ctx.moveTo(w*.3,-h);ctx.lineTo(w*.52,-h*1.22);ctx.lineTo(w*.36,-h*.85);ctx.fill();
    ctx.strokeStyle='#6B4A10';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(w*.52,-h*.56,13,-Math.PI*.6,Math.PI*.6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(w*.52,-h*.69);ctx.lineTo(w*.52,-h*.43);ctx.stroke();
  }

  _drawRobot(ctx) {
    const h=this.h,w=this.w,leg=Math.sin(this._legAnim)*4;
    const t=Date.now()*0.003;
    Sprites.px(ctx,'#336677',-w*.42,-h*.35,w*.38,h*.35+leg);
    Sprites.px(ctx,'#336677', w*.04,-h*.35,w*.38,h*.35-leg);
    Sprites.px(ctx,'#5599AA',-w*.5,-h*.82,w,h*.47);
    Sprites.px(ctx,'#5599AA',-w*.62,-h*.75,w*.18,h*.28);
    Sprites.px(ctx,'#5599AA', w*.44,-h*.75,w*.18,h*.28);
    Sprites.px(ctx,'#447788',-w*.44,-h,w*.88,h*.22);
    ctx.shadowColor='#00FFCC';ctx.shadowBlur=6;
    ctx.fillStyle='#00FFCC';
    ctx.beginPath();ctx.arc(-w*.16,-h*.9,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc( w*.16,-h*.9,4,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle=`rgba(0,255,200,${0.25+0.2*Math.sin(t)})`;
    const scanY=-h+((t%1)*h*.22);
    ctx.fillRect(-w*.44,scanY,w*.88,2);
  }

  _drawGeneric(ctx) {
    const d=this.def,h=this.h,w=this.w;
    Sprites.px(ctx,d.pants,-w*.45,-h*.35,w*.42,h*.35);
    Sprites.px(ctx,d.pants, w*.03,-h*.35,w*.42,h*.35);
    Sprites.px(ctx,d.color,-w*.5,-h*.82,w,h*.47);
    Sprites.px(ctx,d.color,-w*.42,-h,w*.84,h*.27);
  }
}

// ── StoryBoss — one per act, unique vulnerability mechanic ────────────────────
class StoryBoss extends StoryEnemy {
  constructor(x, type) {
    super(x, type);
    this._bossMsg = '';
    this._bossMsgTimer = 0;

    if (type === 'stone_guardian') {
      this._hitReady = false;
      this._lastHitTime = 0;
    }
    if (type === 'mech_fluffkins') {
      this._shieldOn = true;
      this._shieldTimer = 2500;
    }
    if (type === 'iron_champion') {
      this._phase = 'walk';
      this._phaseTimer = 3000;
      this._origSpeed = this.speed;
      this._chargeDir = 1;
    }
    if (type === 'nexus_core') {
      this._lastAbsorbTime = 0;
    }
  }

  update(dt, players, enemyBalls) {
    if (this.dead) return;
    if (this._bossMsgTimer > 0) this._bossMsgTimer -= dt;

    if (this.type === 'mech_fluffkins') {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) {
        this._shieldOn = !this._shieldOn;
        this._shieldTimer = this._shieldOn ? 2500 : 2000;
      }
    }

    if (this.type === 'iron_champion') {
      this._phaseTimer -= dt;
      if (this._phaseTimer <= 0) {
        if (this._phase === 'walk') {
          this._phase = 'charge';
          this._phaseTimer = 1500;
          const target = players[0];
          this._chargeDir = target ? Math.sign(target.x - this.x) : 1;
          this.speed = this._origSpeed * 5;
        } else if (this._phase === 'charge') {
          this._phase = 'stumble';
          this._phaseTimer = 1800;
          this.speed = 0.1;
        } else {
          this._phase = 'walk';
          this._phaseTimer = 3000;
          this.speed = this._origSpeed;
        }
      }
      if (this._phase === 'charge') {
        this.x += this._chargeDir * this.speed;
        this.x = Math.max(30, Math.min(STORY_WORLD_W - 30, this.x));
      }
    }

    super.update(dt, players, enemyBalls);
  }

  takeBall(ball) {
    switch (this.type) {
      case 'patient_zero':   return this._takeBallHeadOnly(ball);
      case 'stone_guardian': return this._takeBallDualHit(ball);
      case 'mech_fluffkins': return this._takeBallPhaseWindow(ball);
      case 'iron_champion':  return this._takeBallStunWindow(ball);
      case 'nexus_core':     return this._takeBallSimultaneous(ball);
      default: return super.takeBall(ball);
    }
  }

  _takeBallHeadOnly(ball) {
    const headY = this.y - this.h * 0.68;
    if (ball.y <= headY) {
      this._bossMsg = 'HEAD SHOT!';
      this._bossMsgTimer = 900;
      return super.takeBall(ball);
    }
    ball.vx *= -0.7; ball.vy = -Math.abs(ball.vy) * 0.8;
    this._bossMsg = 'BODY BLOCKED!';
    this._bossMsgTimer = 1000;
    this._flashTimer = 80;
    return false;
  }

  _takeBallDualHit(ball) {
    const now = Date.now();
    if (this._hitReady && (now - this._lastHitTime) <= 400) {
      this._hitReady = false;
      this._bossMsg = 'DUAL HIT!';
      this._bossMsgTimer = 1000;
      return super.takeBall(ball);
    }
    this._hitReady = true;
    this._lastHitTime = now;
    ball.vx *= -0.6; ball.vy = -Math.abs(ball.vy) * 0.7;
    this._bossMsg = 'ABSORBING...';
    this._bossMsgTimer = 700;
    this._flashTimer = 80;
    return false;
  }

  _takeBallPhaseWindow(ball) {
    if (this._shieldOn) {
      ball.vx *= -0.75; ball.vy = -Math.abs(ball.vy) * 0.85;
      this._bossMsg = 'SHIELD ACTIVE!';
      this._bossMsgTimer = 900;
      return false;
    }
    this._bossMsg = 'HIT!';
    this._bossMsgTimer = 500;
    return super.takeBall(ball);
  }

  _takeBallStunWindow(ball) {
    if (this._phase === 'stumble') {
      this._bossMsg = 'CRITICAL HIT!';
      this._bossMsgTimer = 800;
      return super.takeBall(ball);
    }
    ball.vx *= -0.6; ball.vy = -Math.abs(ball.vy) * 0.7;
    this._bossMsg = this._phase === 'charge' ? 'UNSTOPPABLE!' : 'ARMORED!';
    this._bossMsgTimer = 1000;
    this._flashTimer = 80;
    return false;
  }

  _takeBallSimultaneous(ball) {
    const now = Date.now();
    if (ball.exploding) {
      this._bossMsg = 'OVERLOADED!';
      this._bossMsgTimer = 1200;
      this.hp = Math.max(0, this.hp - 3);
      this._flashTimer = 400;
      ball.dead = true; ball.inFlight = false; ball.vx = 0; ball.vy = 0; ball.spinning = false;
      if (this.hp <= 0) { this.dead = true; return true; }
      return false;
    }
    if (this._lastAbsorbTime > 0 && (now - this._lastAbsorbTime) <= 300) {
      this._bossMsg = 'OVERLOADED!';
      this._bossMsgTimer = 1000;
      this._lastAbsorbTime = 0;
      this.hp = Math.max(0, this.hp - 2);
      this._flashTimer = 350;
      ball.dead = true; ball.inFlight = false; ball.vx = 0; ball.vy = 0; ball.spinning = false;
      if (this.hp <= 0) { this.dead = true; return true; }
      return false;
    }
    this._lastAbsorbTime = now;
    this._bossMsg = 'ABSORBED! +HP';
    this._bossMsgTimer = 1000;
    this.hp = Math.min(this.maxHp, this.hp + 1);
    ball.dead = true; ball.inFlight = false; ball.vx = 0; ball.vy = 0; ball.spinning = false;
    this._flashTimer = 60;
    return false;
  }

  draw(ctx) {
    if (this.dead) return;
    const flash = this._flashTimer > 0 && Math.floor(this._flashTimer / 50) % 2 === 0;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    if (flash) ctx.globalAlpha = 0.25;

    switch (this.type) {
      case 'patient_zero':   this._drawPatientZero(ctx); break;
      case 'stone_guardian': this._drawStoneGuardian(ctx); break;
      case 'mech_fluffkins': this._drawMechFluffkins(ctx); break;
      case 'iron_champion':  this._drawIronChampion(ctx); break;
      case 'nexus_core':     this._drawNexusCore(ctx); break;
    }

    if (this._bossMsgTimer > 0 && this._bossMsg) {
      ctx.globalAlpha = Math.min(1, this._bossMsgTimer / 350);
      ctx.font = 'bold 9px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(this._bossMsg, 1, -this.h - 22);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(this._bossMsg, 0, -this.h - 23);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── PATIENT ZERO — diseased colossus (56×88), HEAD ONLY ─────────────────────
  _drawPatientZero(ctx) {
    const h = this.h, w = this.w;
    const leg = Math.sin(this._legAnim) * 5;
    const t = Date.now() * 0.003;

    // Thick rotting legs
    Sprites.px(ctx, '#3a2a1a', -w*.42, -h*.36, w*.38, h*.36 + leg);
    Sprites.px(ctx, '#3a2a1a',  w*.04, -h*.36, w*.38, h*.36 - leg);
    // Big infected feet
    Sprites.px(ctx, '#1a0a00', -w*.5,  -h*.08, w*.44, h*.10);
    Sprites.px(ctx, '#1a0a00',  w*.02, -h*.08, w*.44, h*.10);

    // Massive diseased torso
    Sprites.px(ctx, '#5a3a2a', -w*.52, -h*.78, w*1.04, h*.46);
    // Tumor bumps
    ctx.fillStyle = '#7a5040';
    ctx.beginPath(); ctx.arc(-w*.3, -h*.55, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*.25,-h*.62, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-w*.1, -h*.45, 9, 0, Math.PI*2); ctx.fill();

    // Outstretched arms
    Sprites.px(ctx, '#5a3a2a', -w*.9,  -h*.78, w*.44, h*.2);
    Sprites.px(ctx, '#5a3a2a',  w*.46, -h*.78, w*.44, h*.2);
    // Clawed hands
    ctx.fillStyle = '#3a1a0a';
    ctx.fillRect(-w*.95,-h*.82, 10, 14);
    ctx.fillRect(-w*.9, -h*.92, 6,  10);
    ctx.fillRect( w*.85,-h*.82, 10, 14);
    ctx.fillRect( w*.82,-h*.92, 6,  10);

    // Neck
    Sprites.px(ctx, '#4a2a1a', -w*.16, -h*.88, w*.32, h*.12);

    // Big head
    Sprites.px(ctx, '#5a3a2a', -w*.44, -h, w*.88, h*.26);

    // Barbed wire crown
    ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const cx = -w*.4 + i * w*.11;
      ctx.moveTo(cx, -h - 2);
      ctx.lineTo(cx + w*.06, -h - 10);
      ctx.lineTo(cx + w*.11, -h - 2);
    }
    ctx.stroke();
    ctx.fillStyle = '#880000';
    for (let i = 0; i < 4; i++) ctx.fillRect(-w*.38 + i*w*.25, -h - 7, 3, 3);

    // Glowing infected eyes
    ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF4400';
    ctx.beginPath(); ctx.arc(-w*.18,-h*.94, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*.18,-h*.94, 5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFAA00';
    ctx.beginPath(); ctx.arc(-w*.18,-h*.94, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*.18,-h*.94, 2, 0, Math.PI*2); ctx.fill();

    // Rotting mouth
    ctx.fillStyle = '#1a0000'; ctx.fillRect(-w*.2,-h*.84, w*.4, 5);
    ctx.fillStyle = '#AA3300';
    ctx.fillRect(-w*.15,-h*.84, 4, 5);
    ctx.fillRect(-w*.02,-h*.84, 4, 5);
    ctx.fillRect( w*.10,-h*.84, 4, 5);

    // Infection aura
    const pulse = 0.06 + 0.05 * Math.sin(t * 2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#44FF00';
    ctx.beginPath(); ctx.arc(0,-h*.5, w*.7, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── STONE GUARDIAN — ancient golem (68×100), DUAL HIT ───────────────────────
  _drawStoneGuardian(ctx) {
    const h = this.h, w = this.w;
    const t = Date.now() * 0.001;

    // Column-like legs
    Sprites.px(ctx, '#5a4a3a', -w*.4,  -h*.38, w*.36, h*.38);
    Sprites.px(ctx, '#5a4a3a',  w*.04, -h*.38, w*.36, h*.38);
    // Stone feet
    Sprites.px(ctx, '#4a3a2a', -w*.48,-h*.10, w*.46, h*.12);
    Sprites.px(ctx, '#4a3a2a',  w*.02,-h*.10, w*.46, h*.12);

    // Huge stone torso
    Sprites.px(ctx, '#7a6a4a', -w*.52,-h*.82, w*1.04, h*.48);

    // Stone texture cracks
    ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-w*.3,-h*.68); ctx.lineTo(-w*.1,-h*.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( w*.1,-h*.72); ctx.lineTo( w*.3,-h*.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w*.2,-h*.45); ctx.lineTo( w*.0,-h*.38); ctx.stroke();

    // Giant arms
    Sprites.px(ctx, '#7a6a4a', -w*.96,-h*.86, w*.5, h*.25);
    Sprites.px(ctx, '#7a6a4a',  w*.46,-h*.86, w*.5, h*.25);
    // Massive fists
    Sprites.px(ctx, '#6a5a3a', -w*1.04,-h*.96, w*.28, h*.32);
    Sprites.px(ctx, '#6a5a3a',  w*.76,  -h*.96, w*.28, h*.32);
    // Fist cracks
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w*.96,-h*.88); ctx.lineTo(-w*.82,-h*.72); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( w*.86,-h*.88); ctx.lineTo( w*.72,-h*.72); ctx.stroke();

    // Boulder head
    Sprites.px(ctx, '#8a7a5a', -w*.46,-h, w*.92, h*.22);
    // Mossy top
    Sprites.px(ctx, '#3a5a2a', -w*.42,-h, w*.84, 6);

    // Molten orange eyes
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#FF6600';
    ctx.beginPath(); ctx.arc(-w*.18,-h*.92, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*.18,-h*.92, 6, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Stone grimace
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-w*.28,-h*.82, w*.56, 5);
    ctx.fillStyle = '#aa9a7a';
    for (let i = 0; i < 5; i++) ctx.fillRect(-w*.24 + i*w*.1,-h*.82, w*.07, 5);

    // Dual-hit ready ring
    if (this._hitReady) {
      const pulse = 0.4 + 0.4 * Math.sin(Date.now() * 0.015);
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0,-h*.55, w*.6, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Ground cracks below feet
    ctx.strokeStyle = 'rgba(100,80,50,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-w*.6,0); ctx.lineTo(-w*.3,-8); ctx.lineTo( w*.1,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( w*.3,0); ctx.lineTo( w*.5,-5); ctx.lineTo( w*.8,0); ctx.stroke();
  }

  // ── MECH FLUFFKINS — robotic cat mech (62×90), PHASE WINDOW ─────────────────
  _drawMechFluffkins(ctx) {
    const h = this.h, w = this.w;
    const t = Date.now() * 0.003 + this._floatOffset;
    const hov = Math.sin(t) * 4;

    // Jet thrusters
    ctx.fillStyle = '#223344';
    ctx.fillRect(-w*.3, hov+2, w*.2, 12);
    ctx.fillRect( w*.1, hov+2, w*.2, 12);
    const fh = 4 + 4*Math.sin(Date.now()*0.02);
    ctx.fillStyle = '#00AAFF';
    ctx.fillRect(-w*.28, hov+14, w*.16, fh);
    ctx.fillRect( w*.12, hov+14, w*.16, fh);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-w*.24, hov+14, w*.08, fh*0.5);
    ctx.fillRect( w*.16, hov+14, w*.08, fh*0.5);

    // Leg pylons
    Sprites.px(ctx, '#334455', -w*.32,-h*.3+hov, w*.2, h*.3);
    Sprites.px(ctx, '#334455',  w*.12,-h*.3+hov, w*.2, h*.3);

    // Main mech body
    Sprites.px(ctx, '#445566', -w*.52,-h*.82+hov, w*1.04, h*.54);

    // Shoulder cannons
    Sprites.px(ctx, '#336677', -w*.72,-h*.82+hov, w*.26, h*.22);
    Sprites.px(ctx, '#336677',  w*.46,-h*.82+hov, w*.26, h*.22);
    ctx.fillStyle = '#223344';
    ctx.fillRect(-w*.82,-h*.78+hov, 10, 8);
    ctx.fillRect( w*.72,-h*.78+hov, 10, 8);

    // Chest panel + pulsing heart
    Sprites.px(ctx, '#556677', -w*.3,-h*.74+hov, w*.6, h*.3);
    const hp2 = 0.5 + 0.5*Math.sin(Date.now()*0.006);
    ctx.fillStyle = `rgba(0,200,255,${hp2})`;
    ctx.beginPath(); ctx.arc(0,-h*.62+hov, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#AAEEFF';
    ctx.beginPath(); ctx.arc(0,-h*.62+hov, 3, 0, Math.PI*2); ctx.fill();

    // Mech cat head
    Sprites.px(ctx, '#445566', -w*.4,-h+hov, w*.8, h*.22);
    // Cat ears (triangular)
    ctx.fillStyle = '#556677';
    ctx.beginPath(); ctx.moveTo(-w*.38,-h+hov); ctx.lineTo(-w*.28,-h-14+hov); ctx.lineTo(-w*.18,-h+hov); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( w*.18,-h+hov); ctx.lineTo( w*.28,-h-14+hov); ctx.lineTo( w*.38,-h+hov); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF88CC';
    ctx.beginPath(); ctx.moveTo(-w*.34,-h+2+hov); ctx.lineTo(-w*.28,-h-8+hov); ctx.lineTo(-w*.22,-h+2+hov); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( w*.22,-h+2+hov); ctx.lineTo( w*.28,-h-8+hov); ctx.lineTo( w*.34,-h+2+hov); ctx.closePath(); ctx.fill();

    // Visor
    Sprites.px(ctx, '#001122', -w*.3,-h*.96+hov, w*.6, h*.14);
    ctx.fillStyle = this._shieldOn ? '#00FFFF' : '#FF4488';
    ctx.shadowColor = this._shieldOn ? '#00FFFF' : '#FF4488';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-w*.14,-h*.9+hov, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*.14,-h*.9+hov, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Whiskers
    ctx.strokeStyle = 'rgba(200,200,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-w*.3,-h*.87+hov); ctx.lineTo(-w*.48,-h*.84+hov); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w*.3,-h*.84+hov); ctx.lineTo(-w*.48,-h*.81+hov); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( w*.3,-h*.87+hov); ctx.lineTo( w*.48,-h*.84+hov); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( w*.3,-h*.84+hov); ctx.lineTo( w*.48,-h*.81+hov); ctx.stroke();

    // Shield ring when active
    if (this._shieldOn) {
      const sp = 0.5 + 0.35*Math.sin(Date.now()*0.008);
      ctx.globalAlpha = sp;
      ctx.strokeStyle = '#00AAFF'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0,-h*.55+hov, w*.72, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,200,255,0.4)'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(0,-h*.55+hov, w*.72, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ── IRON CHAMPION — armored warrior (58×96), STUN WINDOW ────────────────────
  _drawIronChampion(ctx) {
    const h = this.h, w = this.w;
    const leg = this._phase === 'stumble'
      ? Math.sin(this._legAnim * 3) * 8
      : this._phase === 'charge'
        ? Math.sin(this._legAnim * 4) * 6
        : Math.sin(this._legAnim) * 4;

    // Armored greaves
    Sprites.px(ctx, '#667788', -w*.44,-h*.38, w*.38, h*.38+leg);
    Sprites.px(ctx, '#667788',  w*.06,-h*.38, w*.38, h*.38-leg);
    // Boot plates
    Sprites.px(ctx, '#778899', -w*.5, -h*.1,  w*.44, h*.12);
    Sprites.px(ctx, '#778899',  w*.02,-h*.1,  w*.44, h*.12);

    // Red charge aura
    if (this._phase === 'charge') {
      const cp = 0.3 + 0.3*Math.sin(Date.now()*0.02);
      ctx.globalAlpha = cp;
      ctx.fillStyle = '#FF2200';
      ctx.beginPath(); ctx.arc(0,-h*.55, w*.7, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Plate body
    const bodyCol = this._phase === 'charge' ? '#887766' : '#778899';
    Sprites.px(ctx, bodyCol, -w*.52,-h*.84, w*1.04, h*.5);
    ctx.fillStyle = '#99AABB'; ctx.fillRect(-w*.28,-h*.8, w*.56, h*.28);
    ctx.fillStyle = '#CCDDEE'; ctx.fillRect(-w*.2,-h*.76, w*.4, 4);

    // Pauldrons
    Sprites.px(ctx, '#889AAA', -w*.72,-h*.88, w*.28, h*.26);
    Sprites.px(ctx, '#889AAA',  w*.44,-h*.88, w*.28, h*.26);
    // Pauldron spikes
    ctx.fillStyle = '#CCDDEE';
    ctx.beginPath(); ctx.moveTo(-w*.76,-h*.88); ctx.lineTo(-w*.82,-h*1.02); ctx.lineTo(-w*.7,-h*.88); ctx.fill();
    ctx.beginPath(); ctx.moveTo( w*.7, -h*.88); ctx.lineTo( w*.76,-h*1.02); ctx.lineTo( w*.82,-h*.88); ctx.fill();

    // Shield arm
    Sprites.px(ctx, '#889AAA', -w*.92,-h*.82, w*.22, h*.42);
    ctx.fillStyle = '#AABBCC'; ctx.fillRect(-w*.96,-h*.88, 18, 36);
    ctx.fillStyle = '#CCDDEE'; ctx.fillRect(-w*.92,-h*.84, 10, 28);
    ctx.fillStyle = '#FF4400';
    ctx.beginPath(); ctx.arc(-w*.88,-h*.72, 4, 0, Math.PI*2); ctx.fill();

    // Sword arm
    Sprites.px(ctx, '#778899', w*.7,-h*.82, w*.18, h*.35);
    ctx.fillStyle = '#DDEEFF'; ctx.fillRect(w*.86,-h*1.1, 6, 50);
    ctx.fillStyle = '#AABBCC'; ctx.fillRect(w*.84,-h*.88, 10, 4);

    // Helmet
    Sprites.px(ctx, '#889AAA', -w*.44,-h, w*.88, h*.2);
    ctx.fillStyle = '#1a2030'; ctx.fillRect(-w*.28,-h*.93, w*.56, 5);
    ctx.fillStyle = '#FF4400'; ctx.fillRect(-4,-h-12, 8, 14);

    // Eyes
    const eyeCol = this._phase === 'charge' ? '#FF4400' : '#88CCFF';
    ctx.shadowColor = eyeCol; ctx.shadowBlur = 8;
    ctx.fillStyle = eyeCol;
    ctx.fillRect(-w*.2,-h*.93, 8, 5);
    ctx.fillRect( w*.12,-h*.93, 8, 5);
    ctx.shadowBlur = 0;

    // Stumble stars
    if (this._phase === 'stumble') {
      const st = Date.now() * 0.003;
      ctx.font = 'bold 11px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      for (let i = 0; i < 3; i++) {
        const a = st + (i / 3) * Math.PI * 2;
        ctx.fillText('*', Math.cos(a) * 18, -h - 10 + Math.sin(a) * 7);
      }
    }
  }

  // ── NEXUS CORE — energy entity (72×80), SIMULTANEOUS ────────────────────────
  _drawNexusCore(ctx) {
    const h = this.h, w = this.w;
    const t = Date.now() * 0.002 + this._floatOffset;
    const hov = Math.sin(t) * 8;

    // Outer orbital rings
    for (let ring = 0; ring < 3; ring++) {
      const r = w * (0.55 + ring * 0.18);
      const rot = t * (0.5 + ring * 0.3) * (ring % 2 === 0 ? 1 : -1);
      const alpha = 0.15 + 0.1*Math.sin(t*2+ring);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring===0 ? '#00AAFF' : ring===1 ? '#0066CC' : '#004499';
      ctx.lineWidth = 3 - ring;
      ctx.beginPath();
      ctx.ellipse(0,-h*.5+hov, r, r*0.35, rot, 0, Math.PI*2);
      ctx.stroke();
      for (let n = 0; n < 4; n++) {
        const na = rot + n * Math.PI / 2;
        const nx2 = Math.cos(na) * r;
        const ny2 = -h*.5+hov + Math.sin(na) * r * 0.35;
        ctx.fillStyle = '#00FFCC';
        ctx.globalAlpha = alpha * 2;
        ctx.beginPath(); ctx.arc(nx2, ny2, 3, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Energy tendrils
    for (let i = 0; i < 6; i++) {
      const a = t * 0.7 + (i/6) * Math.PI * 2;
      const len = w * (0.5 + 0.3*Math.sin(t*1.5+i));
      ctx.strokeStyle = `rgba(0,150,255,${0.3+0.15*Math.sin(t*3+i)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0,-h*.5+hov);
      ctx.lineTo(Math.cos(a)*len, -h*.5+hov+Math.sin(a)*len*0.5);
      ctx.stroke();
    }

    // Core body (hexagonal)
    ctx.fillStyle = '#001833';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2 - Math.PI/6;
      const r = w * 0.46;
      const px = Math.cos(a)*r, py = -h*.5+hov+Math.sin(a)*r*0.65;
      i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#0055AA'; ctx.lineWidth = 3; ctx.stroke();

    // Pulsing inner glow
    const cp = 0.7 + 0.3*Math.sin(t*4);
    ctx.shadowColor = '#00AAFF'; ctx.shadowBlur = 24;
    const cg = ctx.createRadialGradient(0,-h*.5+hov,0, 0,-h*.5+hov, w*0.32);
    cg.addColorStop(0, `rgba(0,255,255,${cp})`);
    cg.addColorStop(0.5,`rgba(0,100,255,${cp*0.7})`);
    cg.addColorStop(1,  'rgba(0,20,80,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0,-h*.5+hov, w*0.32, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Data grid pattern
    ctx.strokeStyle = `rgba(0,200,255,${0.2+0.1*Math.sin(t*5)})`;
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i*8,-h*.82+hov); ctx.lineTo(i*8,-h*.18+hov); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w*.28,-h*.5+hov+i*8); ctx.lineTo(w*.28,-h*.5+hov+i*8); ctx.stroke();
    }

    // Vertical slit eye
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#00FFFF'; ctx.shadowBlur = 10;
    ctx.fillRect(-3,-h*.62+hov, 6, 22);
    ctx.fillStyle = '#00FFFF';
    ctx.fillRect(-1,-h*.6+hov, 2, 18);
    ctx.shadowBlur = 0;

    // Absorbed HP gain flash
    if (this._bossMsgTimer > 0 && this._bossMsg === 'ABSORBED! +HP') {
      ctx.globalAlpha = (this._bossMsgTimer / 800) * 0.4;
      ctx.fillStyle = '#00FF88';
      ctx.beginPath(); ctx.arc(0,-h*.5+hov, w*0.5, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// ── StoryGame ─────────────────────────────────────────────────────────────────
class StoryGame {
  constructor(canvas, coop = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.coop = coop;
    this.returnToMenu = false;

    this.subState = 'world_map';
    this.actIndex = 0;
    this.completedActs = new Set();
    this._unlockedActs = new Set([0]);
    this._mapCursor = 0;

    // Dialogue
    this._dlgPhase = 'intro';
    this._dlgName = '';
    this._dlgCol = '#FFF';
    this._dlgLines = [];
    this._dlgLine = 0;

    // Runtime state (filled by _startActCombat)
    this.p1 = null; this.p2 = null;
    this.p1Ball = null; this.p2Ball = null;
    this._p1BallTimer = 0; this._p2BallTimer = 0;
    this._extraBalls = [];
    this.enemies = [];
    this.enemyBalls = [];
    this.p1Hp = 5; this.p2Hp = 5;
    this.p1Fallen = false; this.p2Fallen = false;
    this._camX = 0;
    this._wave = 0;
    this._waveState = 'idle';
    this._waveTimer = 0;
    this._spawnQueue = [];
    this._spawnTimer = 0;
  }

  // ── Act start: show intro dialogue then begin combat ─────────────────────────
  _startAct(idx) {
    this.actIndex = idx;
    this._dlgPhase = 'intro';
    const act = STORY_ACTS[idx];
    this._startDialogue({ name: act.npc.name, col: act.npc.col, lines: act.npc.introLines });
  }

  // ── Combat setup ─────────────────────────────────────────────────────────────
  _startActCombat(idx) {
    this.actIndex = idx;

    this.p1 = new Player(0, 150, Controls.p1);
    this.p1.noMidline = true; this.p1.hordeMode = true; this.p1.dir = 1;

    if (this.coop) {
      this.p2 = new Player(1, 220, Controls.p2);
      this.p2.noMidline = true; this.p2.hordeMode = true; this.p2.dir = 1;
    } else {
      this.p2 = null;
    }

    this.p1Ball = new Ball(); this.p1Ball.reset(0); this.p1.hasBall = true;
    this._p1BallTimer = 0;
    if (this.coop) {
      this.p2Ball = new Ball(); this.p2Ball.reset(1); this.p2.hasBall = true;
      this._p2BallTimer = 0;
    } else {
      this.p2Ball = null;
    }

    this.p1.extraThrowCallback = (x, y, vx, vy, i) => {
      const b = new Ball(); b.throw(x, y, vx, vy, false, false);
      b.lastThrower = i; this._extraBalls.push(b);
    };
    if (this.coop) {
      this.p2.extraThrowCallback = (x, y, vx, vy, i) => {
        const b = new Ball(); b.throw(x, y, vx, vy, false, false);
        b.lastThrower = i; this._extraBalls.push(b);
      };
    }

    this._extraBalls = [];
    this.enemies = [];
    this.enemyBalls = [];
    this.p1Hp = 5; this.p2Hp = 5;
    this.p1Fallen = false; this.p2Fallen = false;
    this._camX = 0;
    this._wave = 0;
    this._waveState = 'countdown';
    this._waveTimer = 2800;
    this._spawnQueue = [];

    this.subState = 'sidescroll';
  }

  _startDialogue(npc) {
    this._dlgName = npc.name;
    this._dlgCol = npc.col;
    this._dlgLines = npc.lines;
    this._dlgLine = 0;
    this.subState = 'dialogue';
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  update(dt) {
    if (Input.wasPressed('Escape')) {
      if (this.subState !== 'world_map') { this.subState = 'world_map'; }
      else { this.returnToMenu = true; }
      return;
    }
    switch (this.subState) {
      case 'world_map': this._updateWorldMap(); break;
      case 'sidescroll': this._updateSidescroll(dt); break;
      case 'dialogue': this._updateDialogue(); break;
    }
  }

  _updateWorldMap() {
    if (Input.wasPressed('ArrowRight') || Input.wasPressed('KeyD'))
      this._mapCursor = Math.min(STORY_ACTS.length - 1, this._mapCursor + 1);
    if (Input.wasPressed('ArrowLeft') || Input.wasPressed('KeyA'))
      this._mapCursor = Math.max(0, this._mapCursor - 1);
    if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
      if (this._unlockedActs.has(this._mapCursor)) this._startAct(this._mapCursor);
    }
  }

  _updateSidescroll(dt) {
    if (this._waveState === 'game_over' || this._waveState === 'act_clear') {
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
        if (this._waveState === 'act_clear') {
          const act = STORY_ACTS[this.actIndex];
          this._dlgPhase = 'outro';
          this._startDialogue({ name: act.npc.name, col: act.npc.col, lines: act.npc.outroLines });
        } else {
          // Retry: skip intro, go straight to combat
          this._startActCombat(this.actIndex);
        }
      }
      return;
    }

    Particles.update(dt);

    this._positionHeld(this.p1Ball, this.p1);
    if (this.coop && this.p2Ball) this._positionHeld(this.p2Ball, this.p2);

    const p2ref = this.coop ? this.p2 : null;
    if (!this.p1Fallen) this.p1.update(dt, this.p1Ball, [], p2ref);
    if (this.coop && this.p2 && !this.p2Fallen) this.p2.update(dt, this.p2Ball, [], this.p1);

    this.p1.x = Math.max(16, Math.min(STORY_WORLD_W - 16, this.p1.x));
    if (this.coop && this.p2) this.p2.x = Math.max(16, Math.min(STORY_WORLD_W - 16, this.p2.x));

    this.p1Ball.update(dt, []);
    if (this.coop && this.p2Ball) this.p2Ball.update(dt, []);

    this._tickBallRespawn(dt, this.p1Ball, this.p1, '_p1BallTimer', 0);
    if (this.coop && this.p2Ball) this._tickBallRespawn(dt, this.p2Ball, this.p2, '_p2BallTimer', 1);

    for (let i = this._extraBalls.length - 1; i >= 0; i--) {
      const b = this._extraBalls[i];
      b.update(dt, []);
      this._checkBallVsEnemies(b);
      if (b.dead) this._extraBalls.splice(i, 1);
    }

    if (this.p1Ball.inFlight && !this.p1Ball.dead) this._checkBallVsEnemies(this.p1Ball);
    if (this.coop && this.p2Ball && this.p2Ball.inFlight && !this.p2Ball.dead)
      this._checkBallVsEnemies(this.p2Ball);

    for (const eb of this.enemyBalls) {
      eb.update();
      if (!eb.dead) this._checkEnemyBallVsPlayers(eb);
    }
    this.enemyBalls = this.enemyBalls.filter(b => !b.dead);

    if (this._waveState === 'fighting' || this._waveState === 'spawning') {
      const alive = this._alivePlayers();
      for (const e of this.enemies) {
        e.update(dt, alive, this.enemyBalls);
        if (!e.dead) this._checkEnemyContact(e);
      }
      this.enemies = this.enemies.filter(e => !e.dead);
    }

    this._tickWave(dt);

    const cx = this.coop && this.p2
      ? (this.p1.x + this.p2.x) / 2 - C.W / 2
      : this.p1.x - C.W / 2;
    this._camX = Math.max(0, Math.min(STORY_WORLD_W - C.W, cx));
  }

  _alivePlayers() {
    const all = this.coop ? [this.p1, this.p2] : [this.p1];
    return all.filter((p, i) => p && !(i === 0 ? this.p1Fallen : this.p2Fallen));
  }

  _positionHeld(ball, player) {
    if (!ball.inFlight && !ball.dead && player.hasBall) {
      ball.x = player.x + player.dir * 22;
      ball.y = player.y - 34;
    }
  }

  _tickBallRespawn(dt, ball, player, key, idx) {
    if (ball.dead) {
      this[key] += dt;
      const fallen = idx === 0 ? this.p1Fallen : this.p2Fallen;
      if (this[key] >= 900 && !fallen) { this[key] = 0; ball.reset(idx); player.hasBall = true; }
    } else { this[key] = 0; }
  }

  _checkBallVsEnemies(ball) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const r = e.rect;
      const hit = (ball.x + C.BALL_R > r.x && ball.x - C.BALL_R < r.x + r.w &&
                   ball.y + C.BALL_R > r.y && ball.y - C.BALL_R < r.y + r.h);

      if (hit) {
        const killed = e.takeBall(ball);
        if (killed) {
          Particles.emit(e.x, e.y - e.h / 2, 18,
            ['#FF4444','#FF8800','#FFD700','#FFFFFF'],
            { upBias: 2, maxSpeed: 5, minSize: 2, maxSize: 4 });
          const thrower = ball.lastThrower === 0 ? this.p1 : (this.coop ? this.p2 : null);
          if (thrower) thrower.spCharge = Math.min(C.SP_CHARGE_MAX, thrower.spCharge + C.SP_CHARGE_HIT);
        }
        if (ball.exploding) this._doExplosionSplash(ball, e);
        break;
      }

      // Exploding ball proximity trigger (no direct collision needed)
      if (ball.exploding && ball.inFlight && !ball.dead) {
        const ex = e.x, ey = e.y - e.h * 0.5;
        const dx = ball.x - ex, dy = ball.y - ey;
        if (Math.sqrt(dx*dx + dy*dy) <= 70) {
          this._doExplosionSplash(ball, null);
          ball.dead = true; ball.inFlight = false; ball.vx = 0; ball.vy = 0;
          break;
        }
      }
    }
  }

  _doExplosionSplash(ball, hitEnemy) {
    const bx = ball.x, by = ball.y;
    Particles.emit(bx, by, 28,
      ['#FF6B00','#FF4400','#FFCC00','#FF8800','#FFFFFF'],
      { upBias: 0, maxSpeed: 8, minSize: 3, maxSize: 6 });

    for (const e of this.enemies) {
      if (e.dead || e === hitEnemy) continue;
      const dx = bx - e.x, dy = by - (e.y - e.h * 0.5);
      if (Math.sqrt(dx*dx + dy*dy) <= 100) {
        e.hp -= 1;
        e._flashTimer = 250;
        if (e.hp <= 0) {
          e.dead = true;
          Particles.emit(e.x, e.y - e.h / 2, 14,
            ['#FF4444','#FF8800','#FFD700'],
            { upBias: 2, maxSpeed: 4 });
          const thrower = ball.lastThrower === 0 ? this.p1 : (this.coop ? this.p2 : null);
          if (thrower) thrower.spCharge = Math.min(C.SP_CHARGE_MAX, thrower.spCharge + C.SP_CHARGE_HIT);
        }
      }
    }
  }

  _checkEnemyBallVsPlayers(eb) {
    const pairs = this.coop
      ? [[this.p1, this.p1Fallen], [this.p2, this.p2Fallen]]
      : [[this.p1, this.p1Fallen]];
    for (const [player, fallen] of pairs) {
      if (!player || fallen || player.stunTimer > 0) continue;
      const hitH = player.crouching ? C.CROUCH_H : C.P_H;
      if (eb.x + C.BALL_R > player.x - C.P_W/2 - 3 &&
          eb.x - C.BALL_R < player.x + C.P_W/2 + 3 &&
          eb.y + C.BALL_R > player.y - hitH &&
          eb.y - C.BALL_R < player.y + 4) {
        if (player.shieldActive) {
          eb.vx = -eb.vx * 1.1; eb.vy = Math.min(eb.vy * -0.5, -1);
          player.shieldActive = false; player.shieldAvailable = false;
          player.shieldCooldown = C.SHIELD_RECHARGE;
        } else {
          eb.dead = true; this._hitPlayer(player);
        }
        break;
      }
    }
  }

  _checkEnemyContact(enemy) {
    if (enemy.contactCooldown > 0) return;
    const pairs = this.coop
      ? [[this.p1, this.p1Fallen], [this.p2, this.p2Fallen]]
      : [[this.p1, this.p1Fallen]];
    for (const [player, fallen] of pairs) {
      if (!player || fallen || player.stunTimer > 0) continue;
      const er = enemy.rect;
      const hitH = player.crouching ? C.CROUCH_H : C.P_H;
      if (er.x < player.x + C.P_W/2 && er.x + er.w > player.x - C.P_W/2 &&
          er.y < player.y && er.y + er.h > player.y - hitH) {
        enemy.contactCooldown = 1500;
        enemy._flashTimer = 250;
        this._hitPlayer(player);
        break;
      }
    }
  }

  _hitPlayer(player) {
    const isP1 = player === this.p1;
    Particles.emit(player.x, player.y - 22, 16,
      [isP1 ? C.COL.P1_HUD : C.COL.P2_HUD, '#FF4444', '#FFFFFF'],
      { upBias: 2, maxSpeed: 4 });
    if (isP1) { this.p1Hp = Math.max(0, this.p1Hp - 1); if (this.p1Hp <= 0) this.p1Fallen = true; }
    else       { this.p2Hp = Math.max(0, this.p2Hp - 1); if (this.p2Hp <= 0) this.p2Fallen = true; }
    const allFallen = this.p1Fallen && (!this.coop || this.p2Fallen);
    player.stunTimer = allFallen ? 0 : 900;
    player.vx = 4; player.vy = -5;
    if (allFallen) this._waveState = 'game_over';
  }

  _tickWave(dt) {
    const act = STORY_ACTS[this.actIndex];
    switch (this._waveState) {
      case 'countdown':
        this._waveTimer -= dt;
        if (this._waveTimer <= 0) this._beginWave();
        break;
      case 'spawning':
        this._spawnTimer -= dt;
        if (this._spawnQueue.length > 0 && this._spawnTimer <= 0) {
          const spawnX = this._camX + C.W + 60 + Math.random() * 140;
          this.enemies.push(new StoryEnemy(Math.min(spawnX, STORY_WORLD_W - 20), this._spawnQueue.shift()));
          this._spawnTimer = 1200;
        }
        if (this._spawnQueue.length === 0) this._waveState = 'fighting';
        break;
      case 'fighting':
        if (this.enemies.length === 0) {
          if (this._wave >= act.waves.length) {
            this._waveState = 'act_clear';
            this.completedActs.add(this.actIndex);
            if (this.actIndex + 1 < STORY_ACTS.length)
              this._unlockedActs.add(this.actIndex + 1);
          } else {
            this._waveState = 'wave_end';
            this._waveTimer = 2600;
            if (!this.p1Fallen) this.p1Hp = Math.min(5, this.p1Hp + 1);
            if (this.coop && this.p2 && !this.p2Fallen) this.p2Hp = Math.min(5, this.p2Hp + 1);
          }
        }
        break;
      case 'wave_end':
        this._waveTimer -= dt;
        if (this._waveTimer <= 0) { this._waveState = 'countdown'; this._waveTimer = 2200; }
        break;
    }
  }

  _beginWave() {
    this._wave++;
    const waveDef = STORY_ACTS[this.actIndex].waves[this._wave - 1];
    const allDefs = _ALL_ENEMY_DEFS();
    const bossGroup = waveDef.find(g => allDefs[g.type] && allDefs[g.type].isBoss);

    if (bossGroup) {
      const spawnX = Math.min(this._camX + C.W + 160, STORY_WORLD_W - 60);
      this.enemies.push(new StoryBoss(spawnX, bossGroup.type));
      this._spawnQueue = [];
      this._waveState = 'fighting';
    } else {
      this._spawnQueue = waveDef.flatMap(g => Array(g.count).fill(g.type));
      for (let i = this._spawnQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._spawnQueue[i], this._spawnQueue[j]] = [this._spawnQueue[j], this._spawnQueue[i]];
      }
      this._spawnTimer = 500;
      this._waveState = 'spawning';
    }
  }

  _updateDialogue() {
    const confirm = Input.wasPressed('Enter') || Input.wasPressed('Space') ||
                    Input.wasPressed(Controls.p1.catch) || Input.wasPressed(Controls.p2.catch);
    if (confirm) {
      this._dlgLine++;
      if (this._dlgLine >= this._dlgLines.length) {
        if (this._dlgPhase === 'intro') {
          this._startActCombat(this.actIndex);
        } else {
          this.subState = 'world_map';
        }
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, C.W, C.H);
    switch (this.subState) {
      case 'world_map': this._drawWorldMap(ctx); return;
      case 'dialogue':  this._drawDialogue(ctx); return;
    }
    this._drawSidescroll(ctx);
  }

  // ── World map ───────────────────────────────────────────────────────────────
  _drawWorldMap(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, C.H);
    g.addColorStop(0, '#08081e'); g.addColorStop(1, '#12183a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.arc((i*137.5)%C.W, (i*71.3)%(C.H*.85), 0.4+(i%3)*0.4, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px "Courier New"';
    ctx.fillText('STORY MODE', C.W/2, 24);
    ctx.fillStyle = '#555'; ctx.font = '9px "Courier New"';
    ctx.fillText('ARROWS select zone   ENTER enter   ESC menu', C.W/2, 38);

    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=2;ctx.setLineDash([6,6]);
    ctx.beginPath();
    STORY_ACTS.forEach((a,i)=>{ i===0?ctx.moveTo(a.mapPos.x,a.mapPos.y):ctx.lineTo(a.mapPos.x,a.mapPos.y); });
    ctx.stroke(); ctx.setLineDash([]);

    const pulse = 0.55 + 0.45*Math.sin(Date.now()/280);

    for (let i = 0; i < STORY_ACTS.length; i++) {
      const act = STORY_ACTS[i];
      const { x, y } = act.mapPos;
      const done     = this.completedActs.has(i);
      const unlocked = this._unlockedActs.has(i);
      const sel      = i === this._mapCursor;
      const r        = sel ? 22 : 17;

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = done ? '#0d2b0d' : unlocked ? '#101030' : '#0a0a0a';
      ctx.fill();
      ctx.strokeStyle = done ? '#44FF88' : unlocked ? (sel ? act.bg.accent : '#445588') : '#2a2a2a';
      ctx.lineWidth = sel ? 2.5 : 1.5;
      if (sel && unlocked) ctx.globalAlpha = pulse;
      ctx.stroke(); ctx.globalAlpha = 1;

      ctx.textAlign = 'center';
      ctx.font = `${sel?14:12}px "Courier New"`;
      ctx.fillStyle = done ? '#44FF88' : unlocked ? '#eee' : '#333';
      ctx.fillText(done ? 'X' : unlocked ? String(i+1) : '?', x, y+5);

      ctx.font = '8px "Courier New"';
      ctx.fillStyle = sel ? '#FFD700' : unlocked ? '#888' : '#2a2a2a';
      ctx.fillText(act.title, x, y+r+11);
      ctx.fillStyle = sel ? act.bg.accent : unlocked ? '#555' : '#1a1a1a';
      ctx.fillText(act.zone, x, y+r+21);
    }

    const sa = STORY_ACTS[this._mapCursor];
    const done = this.completedActs.has(this._mapCursor);
    const unlocked = this._unlockedActs.has(this._mapCursor);
    const px = C.W/2, py = C.H - 88;
    ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(px-190,py,380,78);
    ctx.strokeStyle = done ? '#44FF88' : unlocked ? sa.bg.accent : '#2a2a2a';
    ctx.lineWidth=1.5; ctx.strokeRect(px-190,py,380,78);
    ctx.textAlign='center';
    ctx.fillStyle = done ? '#44FF88' : unlocked ? sa.bg.accent : '#444';
    ctx.font = 'bold 11px "Courier New"';
    ctx.fillText(`${sa.title} — ${sa.zone}`, px, py+16);
    ctx.fillStyle='#555'; ctx.font='9px "Courier New"';
    ctx.fillText(`Enemies: ${sa.enemyCategory}`, px, py+30);
    ctx.fillStyle = done ? '#44FF88' : unlocked ? '#aaa' : '#333';
    ctx.font = done ? 'bold 10px "Courier New"' : '10px "Courier New"';
    ctx.fillText(
      done ? 'COMPLETED — ENTER to replay' : unlocked ? 'ENTER to begin' : 'Complete previous act first',
      px, py+50
    );
  }

  // ── Sidescroll ──────────────────────────────────────────────────────────────
  _drawSidescroll(ctx) {
    const act = STORY_ACTS[this.actIndex];

    const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
    g.addColorStop(0, act.bg.sky); g.addColorStop(1, act.bg.mid);
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);

    ctx.save();
    ctx.translate(-this._camX, 0);

    ctx.fillStyle = act.bg.ground;
    ctx.fillRect(0, C.GROUND, STORY_WORLD_W, C.H - C.GROUND);
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,C.GROUND);ctx.lineTo(STORY_WORLD_W,C.GROUND);ctx.stroke();

    this._drawScenery(ctx, act.id);

    for (const e of this.enemies) e.draw(ctx);
    for (const eb of this.enemyBalls) eb.draw(ctx);

    if (this.p1Fallen) {
      ctx.save(); ctx.globalAlpha=0.22; this.p1.draw(ctx,this.p1Ball); ctx.restore();
    } else { this.p1.draw(ctx, this.p1Ball); }
    this.p1Ball.draw(ctx);

    if (this.coop && this.p2) {
      if (this.p2Fallen) {
        ctx.save(); ctx.globalAlpha=0.22; this.p2.draw(ctx,this.p2Ball); ctx.restore();
      } else { this.p2.draw(ctx, this.p2Ball); }
      if (this.p2Ball) this.p2Ball.draw(ctx);
    }

    for (const b of this._extraBalls) b.draw(ctx);
    Particles.draw(ctx);

    ctx.restore();

    this._drawSidescrollHUD(ctx);
    this._drawSidescrollOverlay(ctx);
  }

  _drawScenery(ctx, id) {
    switch (id) {
      case 'city': {
        const cols = ['#1e1e2e','#242434','#2a2a3e'];
        for (let i = 0; i < 7; i++) {
          const bx = 80 + i*330, bh = 70+(i*53)%110, bw = 55+(i*19)%35;
          ctx.fillStyle = cols[i%3]; ctx.fillRect(bx, C.GROUND-bh, bw, bh);
          ctx.fillStyle='rgba(255,220,80,0.25)';
          for(let wy=0;wy<4;wy++) for(let wx=0;wx<3;wx++)
            ctx.fillRect(bx+5+wx*16, C.GROUND-bh+6+wy*18, 8, 10);
          ctx.fillStyle='rgba(0,0,0,0.5)';
          ctx.fillRect(bx+5+(i%3)*16, C.GROUND-bh+6+((i+1)%4)*18, 8, 10);
        }
        break;
      }
      case 'jungle': {
        for (let i = 0; i < 13; i++) {
          const tx = 60 + i*185;
          ctx.fillStyle='#2a1a0a'; ctx.fillRect(tx-5, C.GROUND-90, 10, 90);
          ctx.fillStyle='#1a3a1a';
          ctx.beginPath(); ctx.arc(tx, C.GROUND-88, 32, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle='#1e4a1e';
          ctx.beginPath(); ctx.arc(tx-10, C.GROUND-100, 20, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(tx+12, C.GROUND-96,  18, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle='#3a3020'; ctx.fillRect(900,  C.GROUND-100, 200, 100);
        ctx.fillRect(880, C.GROUND-120, 240, 24);
        for(let c=0;c<5;c++) ctx.fillRect(895+c*46, C.GROUND-100, 20, 100);
        break;
      }
      case 'snow': {
        ctx.fillStyle='#dde8f0'; ctx.fillRect(0, C.GROUND-16, STORY_WORLD_W, 16);
        ctx.fillStyle='#fff';    ctx.fillRect(0, C.GROUND-20, STORY_WORLD_W, 6);
        for (let i = 0; i < 7; i++) {
          const mx = 180+i*340;
          ctx.fillStyle='#8899aa';
          ctx.beginPath();ctx.moveTo(mx-55,C.GROUND-16);ctx.lineTo(mx,C.GROUND-130);ctx.lineTo(mx+55,C.GROUND-16);ctx.fill();
          ctx.fillStyle='#eef4ff';
          ctx.beginPath();ctx.moveTo(mx-22,C.GROUND-16);ctx.lineTo(mx,C.GROUND-130);ctx.lineTo(mx+22,C.GROUND-16);ctx.fill();
        }
        ctx.fillStyle='#445566'; ctx.fillRect(1000, C.GROUND-140, 160, 140);
        ctx.fillStyle='#336699';
        ctx.fillRect(1010,C.GROUND-120,40,60);
        ctx.fillRect(1060,C.GROUND-120,40,60);
        ctx.fillRect(1110,C.GROUND-120,40,60);
        break;
      }
      case 'castle': {
        ctx.fillStyle='#3a3020';
        for(let i=0;i<4;i++){
          const tx=100+i*600;
          ctx.fillRect(tx-45,C.GROUND-130,90,130);
          for(let m=0;m<5;m++) ctx.fillRect(tx-52+m*22,C.GROUND-148,16,20);
          ctx.fillStyle='#2a2010'; ctx.fillRect(tx-20,C.GROUND-50,40,50);
          ctx.fillStyle='#3a3020';
        }
        ctx.fillStyle='#554020'; ctx.fillRect(850,C.GROUND-200,300,200);
        for(let m=0;m<8;m++) ctx.fillRect(840+m*38,C.GROUND-218,28,20);
        ctx.fillStyle='#442010'; ctx.fillRect(990,C.GROUND-200,60,90);
        break;
      }
      case 'tower': {
        for(let i=0;i<8;i++){
          ctx.fillStyle=i%2===0?'#0d0d1a':'#080812';
          ctx.fillRect(i*300,0,300,C.GROUND);
        }
        ctx.fillStyle='#1a2a3a'; ctx.fillRect(1100,0,50,C.GROUND);
        ctx.fillStyle='#FF4400';
        const br=6+4*Math.sin(Date.now()*0.005);
        ctx.beginPath();ctx.arc(1125,18,br,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,68,0,0.1)';
        ctx.beginPath();ctx.arc(1125,18,br*3,0,Math.PI*2);ctx.fill();
        break;
      }
    }
  }

  _drawSidescrollHUD(ctx) {
    const act = STORY_ACTS[this.actIndex];
    ctx.fillStyle='rgba(0,0,0,0.84)'; ctx.fillRect(0,0,C.W,48);

    // P1 HP
    ctx.textAlign='left';
    ctx.fillStyle=C.COL.P1_HUD; ctx.font='bold 9px "Courier New"';
    ctx.fillText('P1', 8, 13);
    this._drawHpPips(ctx, 8, 17, this.p1Hp, 5, C.COL.P1_HUD, this.p1Fallen);

    if (this.coop && this.p2) {
      ctx.fillStyle=C.COL.P2_HUD; ctx.font='bold 9px "Courier New"';
      ctx.textAlign='right'; ctx.fillText('P2', C.W-8, 13);
      this._drawHpPips(ctx, C.W-8-5*22, 17, this.p2Hp, 5, C.COL.P2_HUD, this.p2Fallen);
    }

    // Centre — boss bar or wave info
    ctx.textAlign='center';
    const boss = this.enemies.find(e => e instanceof StoryBoss);
    if (boss) {
      const bx = C.W/2 - 110, bw = 220;
      ctx.fillStyle = '#330000'; ctx.fillRect(bx, 28, bw, 10);
      ctx.fillStyle = '#FF2222'; ctx.fillRect(bx, 28, bw * (boss.hp / boss.maxHp), 10);
      ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 1; ctx.strokeRect(bx, 28, bw, 10);
      ctx.fillStyle = '#FF6666'; ctx.font = 'bold 9px "Courier New"';
      ctx.fillText(boss.type.toUpperCase().replace(/_/g,' '), C.W/2, 26);
      const hints = {
        patient_zero:   'AIM FOR THE HEAD',
        stone_guardian: 'HIT TWICE IN 0.4s',
        mech_fluffkins: 'WAIT FOR SHIELD DOWN',
        iron_champion:  'HIT DURING STUMBLE',
        nexus_core:     'TWO QUICK HITS OR EXPLODE',
      };
      ctx.fillStyle = '#FFAA44'; ctx.font = '8px "Courier New"';
      ctx.fillText(hints[boss.type] || '', C.W/2, 44);
    } else {
      ctx.fillStyle = act.bg.accent; ctx.font = 'bold 10px "Courier New"';
      ctx.fillText(`${act.title} — ${act.zone}`, C.W/2, 13);
      ctx.font='9px "Courier New"';
      const ws = this._waveState;
      if (ws==='fighting'||ws==='spawning') {
        const rem = this.enemies.length + this._spawnQueue.length;
        ctx.fillStyle = rem>5 ? '#FF9999' : '#FFCC44';
        ctx.fillText(`WAVE ${this._wave}/${act.waves.length}  ${rem} enemies`, C.W/2, 27);
      } else if (ws==='countdown') {
        ctx.fillStyle='#FFDD44';
        ctx.fillText(
          this._wave===0 ? `GET READY!  ${Math.ceil(this._waveTimer/1000)}s` :
            `WAVE ${this._wave+1} in ${Math.ceil(this._waveTimer/1000)}s`,
          C.W/2, 27);
      } else if (ws==='wave_end') {
        ctx.fillStyle='#88FF88';
        ctx.fillText(`WAVE ${this._wave} CLEAR! +1 HP`, C.W/2, 27);
      }
    }

    ctx.fillStyle='rgba(255,255,255,0.09)'; ctx.font='8px "Courier New"';
    ctx.textAlign='center';
    ctx.fillText('ESC · world map', C.W/2, C.H-5);

    // SP bars
    const sp1 = Math.min(1, this.p1.spCharge / C.SP_CHARGE_MAX);
    ctx.fillStyle='#111'; ctx.fillRect(8,33,100,6);
    ctx.fillStyle=sp1>=1?'#FFD700':C.COL.P1_HUD; ctx.fillRect(8,33,100*sp1,6);
    if (this.coop && this.p2) {
      const sp2=Math.min(1,this.p2.spCharge/C.SP_CHARGE_MAX);
      ctx.fillStyle='#111';ctx.fillRect(C.W-108,33,100,6);
      ctx.fillStyle=sp2>=1?'#FFD700':C.COL.P2_HUD;ctx.fillRect(C.W-108,33,100*sp2,6);
    }
  }

  _drawHpPips(ctx, x, y, hp, max, col, fallen) {
    if (fallen) {
      ctx.fillStyle='#FF4444'; ctx.font='bold 12px "Courier New"';
      ctx.textAlign='left'; ctx.fillText('K.O.', x, y+10); return;
    }
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < hp ? col : '#222';
      ctx.fillRect(x + i*21, y, 17, 8);
      if (i < hp) {
        ctx.fillStyle='rgba(255,255,255,0.15)';
        ctx.fillRect(x+i*21, y, 17, 3);
      }
    }
  }

  _drawSidescrollOverlay(ctx) {
    const ws = this._waveState;

    if (ws === 'act_clear') {
      ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,C.W,C.H);
      ctx.textAlign='center';
      ctx.shadowColor='#FFD700'; ctx.shadowBlur=22;
      ctx.fillStyle='#FFD700'; ctx.font='bold 34px "Courier New"';
      ctx.fillText('AREA CLEAR!', C.W/2, C.H/2-24);
      ctx.shadowBlur=0;
      ctx.fillStyle='#aaa'; ctx.font='13px "Courier New"';
      ctx.fillText('A survivor wants to talk to you...', C.W/2, C.H/2+14);
      ctx.fillStyle='#555'; ctx.font='10px "Courier New"';
      ctx.fillText('ENTER to continue', C.W/2, C.H/2+38);
    } else if (ws === 'game_over') {
      ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,C.W,C.H);
      ctx.textAlign='center';
      ctx.shadowColor='#FF3333'; ctx.shadowBlur=16;
      ctx.fillStyle='#FF3333'; ctx.font='bold 36px "Courier New"';
      ctx.fillText('GAME OVER', C.W/2, C.H/2-26);
      ctx.shadowBlur=0;
      ctx.fillStyle='#aaa'; ctx.font='13px "Courier New"';
      ctx.fillText(`Wave ${this._wave}  -  ${STORY_ACTS[this.actIndex].zone}`, C.W/2, C.H/2+12);
      ctx.fillStyle='#555'; ctx.font='10px "Courier New"';
      ctx.fillText('ENTER to retry from wave 1', C.W/2, C.H/2+36);
    }

    // Act intro banner (first countdown)
    if (ws === 'countdown' && this._wave === 0 && this._waveTimer > 600) {
      const t = (this._waveTimer - 600) / 2200;
      ctx.fillStyle=`rgba(0,0,0,${t*0.72})`;
      ctx.fillRect(C.W/2-230, C.H/2-52, 460, 104);
      ctx.textAlign='center';
      const act = STORY_ACTS[this.actIndex];
      ctx.fillStyle=`rgba(255,215,0,${t})`;
      ctx.font='bold 22px "Courier New"'; ctx.fillText(act.title, C.W/2, C.H/2-18);
      ctx.fillStyle=`rgba(255,255,255,${t})`;
      ctx.font='14px "Courier New"'; ctx.fillText(act.zone, C.W/2, C.H/2+10);
      ctx.fillStyle=`rgba(180,100,40,${t*.9})`;
      ctx.font='9px "Courier New"'; ctx.fillText(`ENEMY TYPE: ${act.enemyCategory}`, C.W/2, C.H/2+32);
    }

    // Boss wave announcement (wave 9 countdown = wave 10 incoming)
    if (ws === 'countdown' && this._wave === 9 && this._waveTimer > 600) {
      const t = (this._waveTimer - 600) / 2200;
      ctx.fillStyle = `rgba(80,0,0,${t*0.85})`;
      ctx.fillRect(C.W/2 - 230, C.H/2 - 52, 460, 104);
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 20 * t;
      ctx.fillStyle = `rgba(255,50,0,${t})`;
      ctx.font = 'bold 24px "Courier New"'; ctx.fillText('!! BOSS INCOMING !!', C.W/2, C.H/2 - 14);
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,180,50,${t})`;
      ctx.font = '11px "Courier New"'; ctx.fillText('Prepare yourself...', C.W/2, C.H/2 + 16);
    }
  }

  // ── Dialogue ────────────────────────────────────────────────────────────────
  _drawDialogue(ctx) {
    const act = STORY_ACTS[this.actIndex];

    const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
    g.addColorStop(0, act.bg.sky); g.addColorStop(1, act.bg.mid);
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);
    ctx.fillStyle = act.bg.ground;
    ctx.fillRect(0, C.GROUND, C.W, C.H - C.GROUND);
    ctx.save();
    ctx.translate(-this._camX * 0.5, 0);
    this._drawScenery(ctx, act.id);
    ctx.restore();

    // Phase label
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '8px "Courier New"';
    ctx.fillText(this._dlgPhase === 'intro' ? 'PRE-BATTLE' : 'POST-BATTLE', C.W - 12, C.H - 162);

    // Dialogue box
    const bx=36, by=C.H-148, bw=C.W-72, bh=128;
    ctx.fillStyle='rgba(0,0,0,0.9)'; ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle=this._dlgCol; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,bh);

    ctx.fillStyle=this._dlgCol; ctx.font='bold 10px "Courier New"';
    ctx.textAlign='left'; ctx.fillText(this._dlgName, bx+12, by+16);
    ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(bx+2,by+2,bw-4,18);

    ctx.fillStyle='#eee'; ctx.font='11px "Courier New"';
    const line = this._dlgLines[this._dlgLine] || '';
    const maxW = bw - 28;
    let row = '', rows = [];
    for (const word of line.split(' ')) {
      const test = row ? row + ' ' + word : word;
      if (ctx.measureText(test).width > maxW) { rows.push(row); row = word; }
      else row = test;
    }
    rows.push(row);
    rows.forEach((r, i) => ctx.fillText(r, bx+12, by+36+i*18));

    const adv = 0.5 + 0.5*Math.sin(Date.now()/320);
    ctx.globalAlpha = adv;
    const last = this._dlgLine >= this._dlgLines.length - 1;
    ctx.fillStyle = this._dlgCol; ctx.font='9px "Courier New"';
    ctx.textAlign='right';
    ctx.fillText(last ? 'ENTER - done' : 'ENTER - next', bx+bw-10, by+bh-10);
    ctx.globalAlpha = 1;

    ctx.fillStyle='#333'; ctx.font='8px "Courier New"';
    ctx.textAlign='right';
    ctx.fillText(`${this._dlgLine+1}/${this._dlgLines.length}`, bx+bw-10, by+16);
  }
}
