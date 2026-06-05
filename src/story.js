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
    this._teleportTimer = 2800 + Math.random() * 1400;
    this._teleportWarn = false; // true during 800ms pre-teleport warning glow
    this._awake = false;
  }

  update(dt, players, enemyBalls, camX = 0) {
    if (this.dead) return;
    if (this._flashTimer > 0) this._flashTimer -= dt;
    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    this._legAnim += dt * 0.012;

    // Wake when enemy enters camera view
    if (!this._awake) {
      if (this.x > camX - 80 && this.x < camX + C.W + 80) { this._awake = true; }
      if (!this._awake) return;
    }

    const def = this.def;
    let target = players[0];
    for (const p of players) {
      if (Math.abs(this.x - p.x) < Math.abs(this.x - target.x)) target = p;
    }
    if (!target) return;

    if (def.teleports) {
      this._teleportTimer -= dt;
      // Enter warning glow 800ms before teleport
      if (!this._teleportWarn && this._teleportTimer <= 800) this._teleportWarn = true;
      if (this._teleportTimer <= 0) {
        this._teleportTimer = 2800 + Math.random() * 1400;
        this._teleportWarn = false;
        const side = Math.random() > 0.5 ? 1 : -1;
        this.x = Math.max(40, Math.min(STORY_WORLD_W - 40,
          target.x + side * (90 + Math.random() * 80)));
      }
      this.x += Math.sign(target.x - this.x) * this.speed * 0.25; // slower movement
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
      const sx = this.x + Math.sign(target.x - this.x) * this.w * 0.45;
      const sy = this.y - this.h * 0.6;
      const dx = target.x - sx;
      const dy = (target.y - 22) - sy;
      let evx, evy;
      if (this.type === 'golem' || this.type === 'stone_guardian') {
        // Lob in a parabolic arc toward the player
        const T = Math.max(45, Math.abs(dx) / 5);
        evx = dx / T;
        evy = (dy - 0.5 * C.BALL_GRAVITY * T * T) / T;
      } else {
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        evx = (dx / len) * def.throwSpeed;
        evy = (dy / len) * def.throwSpeed - 1.5;
      }
      const eb = new EnemyBall(sx, sy, evx, evy);
      if (this.type !== 'mech_fluffkins') {
        if (this.type === 'golem') eb.rock = true;
        if (this.type === 'stone_guardian') { eb.rock = true; eb.bigRock = true; }
        enemyBalls.push(eb);
      }
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
      case 'tendril':    this._drawTendril(ctx);        break;
      case 'glitch':     this._drawGlitch(ctx);         break;
      case 'pulse_orb':  this._drawPulseOrb(ctx);       break;
      case 'overload_bot': this._drawOverloadBot(ctx);  break;
      default:           this._drawGeneric(ctx);        break;
    }
    if (this.maxHp > 1 && (!this.def.isBoss || this._awake)) {
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
    // Pre-teleport warning: bright pulsing white/yellow glow
    if (this._teleportWarn) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.025);
      ctx.save();
      ctx.globalAlpha = pulse * 0.9;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(0, -h*0.5, w*0.9, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
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

  _drawTendril(ctx) {
    const h=this.h,w=this.w,t=Date.now()*0.003+this._floatOffset;
    // Stem
    Sprites.px(ctx,'#116633',-w*.2,-h*.3,w*.4,h*.3);
    // Body
    Sprites.px(ctx,'#33CC66',-w*.5,-h*.85,w,h*.55);
    // Pulsing tendrils
    ctx.strokeStyle='#55FF88';ctx.lineWidth=2;
    for(let i=0;i<3;i++){
      const wave=Math.sin(t*2+i*1.2)*8;
      ctx.beginPath();ctx.moveTo(-w*.4+i*w*.4,-h*.5);
      ctx.lineTo(-w*.6+i*w*.4+wave,-h*.1);ctx.stroke();
    }
    // Eyes
    ctx.fillStyle='#FFFFFF';
    ctx.beginPath();ctx.arc(-w*.18,-h*.72,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc( w*.18,-h*.72,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#001100';
    ctx.beginPath();ctx.arc(-w*.18,-h*.72,2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc( w*.18,-h*.72,2,0,Math.PI*2);ctx.fill();
  }

  _drawGlitch(ctx) {
    const h=this.h,w=this.w,t=Date.now()*0.008+this._floatOffset;
    // Glitch effect — random offset bands
    const gx=Math.sin(t*7)*3;
    Sprites.px(ctx,'#CC0077',-w*.45+gx,-h*.35,w*.42,h*.35);
    Sprites.px(ctx,'#CC0077', w*.03-gx,-h*.35,w*.42,h*.35);
    Sprites.px(ctx,'#FF00AA',-w*.5,-h*.82,w,h*.47);
    Sprites.px(ctx,'#FF00AA',-w*.42,-h,w*.84,h*.27);
    // Scan line artifacts
    ctx.globalAlpha=0.6;
    ctx.fillStyle='#FF88DD';
    const sl=(-h+((t*0.5%1)*h*.82));
    ctx.fillRect(-w*.42,sl,w*.84,2);
    ctx.globalAlpha=1;
    // Digital eyes
    ctx.fillStyle='#FFFF00';
    ctx.fillRect(-w*.2,-h+3,6,5);
    ctx.fillRect( w*.14,-h+3,6,5);
  }

  _drawPulseOrb(ctx) {
    const h=this.h,w=this.w,t=Date.now()*0.004+this._floatOffset;
    const hov=Math.sin(t)*4;
    const pulse=0.7+0.3*Math.sin(t*3);
    // Outer ring
    ctx.strokeStyle=`rgba(0,221,255,${0.4*pulse})`;ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,-h*.5+hov,w*.6,0,Math.PI*2);ctx.stroke();
    // Core
    ctx.fillStyle=`rgba(0,180,220,${0.85})`;
    ctx.beginPath();ctx.arc(0,-h*.5+hov,w*.38,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(150,255,255,${0.6*pulse})`;
    ctx.beginPath();ctx.arc(0,-h*.5+hov,w*.2,0,Math.PI*2);ctx.fill();
    // Orbiting sparks
    ctx.fillStyle='#00FFFF';
    for(let i=0;i<4;i++){
      const a=t*2+i*Math.PI/2;
      const rx=Math.cos(a)*w*.52,ry=Math.sin(a)*w*.36;
      ctx.beginPath();ctx.arc(rx,-h*.5+hov+ry,2,0,Math.PI*2);ctx.fill();
    }
  }

  _drawOverloadBot(ctx) {
    const h=this.h,w=this.w,leg=Math.sin(this._legAnim)*3;
    const t=Date.now()*0.004;
    Sprites.px(ctx,'#CC3300',-w*.45,-h*.35,w*.42,h*.35+leg);
    Sprites.px(ctx,'#CC3300', w*.05,-h*.35,w*.42,h*.35-leg);
    Sprites.px(ctx,'#FF5500',-w*.55,-h*.82,w*1.1,h*.47);
    // Chunky shoulder plates
    Sprites.px(ctx,'#DD4400',-w*.7,-h*.78,w*.22,h*.2);
    Sprites.px(ctx,'#DD4400', w*.48,-h*.78,w*.22,h*.2);
    Sprites.px(ctx,'#CC3300',-w*.46,-h,w*.92,h*.22);
    // Overload glow
    ctx.shadowColor='#FF8800';ctx.shadowBlur=8+4*Math.sin(t);
    ctx.fillStyle=`rgba(255,140,0,${0.5+0.3*Math.sin(t*3)})`;
    ctx.beginPath();ctx.arc(-w*.16,-h*.9,5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc( w*.16,-h*.9,5,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // Crack lines on body
    ctx.strokeStyle='#FF8800';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(-w*.15,-h*.78);ctx.lineTo(-w*.05,-h*.55);ctx.lineTo(w*.1,-h*.6);ctx.stroke();
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
      this._lightningTimer = 2000;
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

  update(dt, players, enemyBalls, camX, lightningBolts) {
    if (this.dead) return;
    if (this._bossMsgTimer > 0) this._bossMsgTimer -= dt;

    if (this.type === 'mech_fluffkins') {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) {
        this._shieldOn = !this._shieldOn;
        this._shieldTimer = this._shieldOn ? 2500 : 2000;
      }
      // Spawn arching lightning bolt instead of throwing a ball
      if (lightningBolts) {
        this._lightningTimer -= dt;
        if (this._lightningTimer <= 0) {
          this._lightningTimer = 1800 + Math.random() * 1200;
          const target = players[0];
          if (target) {
            lightningBolts.push({
              x1: this.x, y1: this.y - this.h * 0.7,
              x2: target.x, y2: target.y - 20,
              timer: 1100, maxTimer: 1100,
              width: 2.5 + Math.random() * 1.5,
            });
          }
        }
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
    this._flashTimer = 80;
    return false;
  }

  _takeBallDualHit(ball) {
    const now = Date.now();
    const dualWindow = this._coop ? 400 : 900;
    if (this._hitReady && (now - this._lastHitTime) <= dualWindow) {
      this._hitReady = false;
      this._bossMsg = 'DUAL HIT!';
      this._bossMsgTimer = 1000;
      return super.takeBall(ball);
    }
    this._hitReady = true;
    this._lastHitTime = now;
    ball.vx *= -0.6; ball.vy = -Math.abs(ball.vy) * 0.7;
    this._flashTimer = 80;
    return false;
  }

  _takeBallPhaseWindow(ball) {
    if (this._shieldOn) {
      ball.vx *= -0.75; ball.vy = -Math.abs(ball.vy) * 0.85;
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
    const simultaneousWindow = this._coop ? 300 : 700;
    if (this._lastAbsorbTime > 0 && (now - this._lastAbsorbTime) <= simultaneousWindow) {
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
      ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
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
      ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
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
  constructor(canvas, coop = false, p1Data = null, p2Data = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.coop = coop;
    this._p1Data = p1Data;
    this._p2Data = p2Data;
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
    this._levelState = 'idle'; // 'idle'|'playing'|'act_clear'|'game_over'
    this._levelTimer = 0;
    this._introTimer = 0;
    this._bossEnemy = null;
    this._bossDlgTimer = 0;
    this._bossIntroLines = [];
    this._bossIntroIdx = 0;
    this._battleCryTimer = 0;
    this._battleCryText = '';

    // First-encounter quips
    this._seenEnemyTypes = new Set();
    this._playerQuipTimer = 0;
    this._playerQuipText = '';
    this._playerQuipName = '';
    this._playerQuip2Timer = 0;
    this._playerQuip2Text = '';

    // Ghost / KO state (co-op)
    this._p1GhostY = 0;
    this._p2GhostY = 0;
    this._p1GhostQuip = '';
    this._p2GhostQuip = '';

    // Slow HP regen
    this._p1RegenTimer = 0;
    this._p2RegenTimer = 0;
  }

  // ── Act start: go straight to sidescroll — NPC triggers dialogue on contact ──
  _startAct(idx) {
    this.actIndex = idx;
    this._dlgPhase = 'intro';
    this._startActCombat(idx);
  }

  // ── Combat setup ─────────────────────────────────────────────────────────────
  _startActCombat(idx, opts) {
    this.actIndex = idx;

    this.p1 = new Player(0, 150, Controls.p1);
    this.p1.noMidline = true; this.p1.hordeMode = true; this.p1.dir = 1;
    {
      const d = this._p1Data || (() => { const ch = CHARACTERS[0]; return { signaturePower:ch.power, charColors:ch.colors, charType:ch.type, charName:ch.name }; })();
      this.p1.signaturePower = d.signaturePower; this.p1.charColors = d.charColors;
      this.p1.charType = d.charType; this.p1.charName = d.charName;
    }

    if (this.coop) {
      this.p2 = new Player(1, 220, Controls.p2);
      this.p2.noMidline = true; this.p2.hordeMode = true; this.p2.dir = 1;
      {
        const d = this._p2Data || (() => { const ch = CHARACTERS[1]; return { signaturePower:ch.power, charColors:ch.colors, charType:ch.type, charName:ch.name }; })();
        this.p2.signaturePower = d.signaturePower; this.p2.charColors = d.charColors;
        this.p2.charType = d.charType; this.p2.charName = d.charName;
      }
    } else {
      this.p2 = null;
    }

    this.p1Ball = new Ball(); this.p1Ball.worldW = STORY_WORLD_W; this.p1Ball.reset(0); this.p1.hasBall = true;
    this._p1BallTimer = 0;
    if (this.coop) {
      this.p2Ball = new Ball(); this.p2Ball.worldW = STORY_WORLD_W; this.p2Ball.reset(1); this.p2.hasBall = true;
      this._p2BallTimer = 0;
    } else {
      this.p2Ball = null;
    }

    const _mkBall = () => { const b = new Ball(); b.worldW = STORY_WORLD_W; return b; };
    this.p1.extraThrowCallback = (x, y, vx, vy, i) => {
      const b = _mkBall(); b.throw(x, y, vx, vy, false, false);
      b.lastThrower = i; this._extraBalls.push(b);
    };
    if (this.coop) {
      this.p2.extraThrowCallback = (x, y, vx, vy, i) => {
        const b = _mkBall(); b.throw(x, y, vx, vy, false, false);
        b.lastThrower = i; this._extraBalls.push(b);
      };
    }

    this._extraBalls = [];
    this.enemyBalls = [];
    this._blazeHazards = [];
    this._lightningBolts = [];
    this.p1Hp = 5; this.p2Hp = 5;
    this.p1Fallen = false; this.p2Fallen = false;
    this._camX = 0;
    this._seenEnemyTypes = new Set();
    this._playerQuipTimer = 0; this._playerQuipText = ''; this._playerQuipName = '';
    this._playerQuip2Timer = 0; this._playerQuip2Text = '';
    this._p1GhostY = 0; this._p2GhostY = 0;
    this._p1GhostQuip = ''; this._p2GhostQuip = '';
    this._p1RegenTimer = 0; this._p2RegenTimer = 0;

    const level = this._buildLevel(idx);
    this.enemies = level.enemies;
    this._bossEnemy = level.boss;
    if (this._bossEnemy) this._bossEnemy._coop = this.coop;
    this._levelState = 'playing';
    this._levelTimer = 0;
    this._introTimer = 2600;
    this._bossDlgTimer = 0;
    this._battleCryTimer = 2000;
    const _cryLines = ["LET'S GO!", "MOVE OUT!", "SHOW 'EM WHAT YOU'VE GOT!", "FOR THE SURVIVORS!"];
    this._battleCryText = _cryLines[idx % _cryLines.length];

    // Friendly NPC stands at start of each act; dialogue fires on player contact
    if (!opts || !opts.skipNpc) {
      const actDef = STORY_ACTS[idx];
      const npcQuips = {
        wendy:      ['OW!!','I\'M A DOCTOR!!!','MY THESIS!!!','KINETIC IMPACT\nNOTED.','THAT\'S GOING IN\nMY REPORT!!','STATISTICALLY\nOUCH!'],
        biff:       ['WATCH THE HAT!','THAT\'S AN ARTEFACT!','OUCH — SCIENTIFICALLY!','THE TOME!!\nSAFE THOUGH.','MY GLASSES!!','UNACCEPTABLE SIR!'],
        fluffkins:  ['*HISS*','INSUBORDINATION!','MY WHISKERS!!','*ANGRY MEOW*','THAT IS A\nCOURT MARTIAL.','UNACCEPTABLE.'],
        princesses: ['EXCUSE ME?!','WE SAID SORRY!!','HOW DARE YOU!!','WE\'RE ALREADY\nGROUNDED!!','VAL — DID YOU\nSEE THAT?!','THE BOOK WAS\nVERY CONVINCING!'],
        everyone:   ['SERIOUSLY?!','WE\'RE ON\nYOUR SIDE!!','OW!!','COME ON!!','THAT\'S NOT HELPFUL!','DODGEBALL\nFRIENDLY FIRE!'],
      };
      this._sceneNpc = {
        x: actDef.id === 'castle' ? 350 : 380, y: C.GROUND,
        portrait: actDef.npc.portrait,
        reactionTimer: 0, reactionText: '', wobble: 0,
        _talked: false,
        _hitQuips: npcQuips[actDef.npc.portrait] || ['OW!!'],
        _hitCount: 0,
      };
      // Act 4 has two princess NPCs
      if (actDef.id === 'castle') {
        this._sceneNpc2 = {
          x: 430, y: C.GROUND,
          dir: 1, // faces left (toward companion)
          portrait: 'princesses',
          reactionTimer: 0, reactionText: '', wobble: 0,
          _talked: true, // doesn't trigger dialogue independently
          _hitQuips: ['DOT — DID YOU\nSEE THAT?!','MY CROWN!!','WE\'RE SORRY,\nOKAY?!','IT WAS ONE BOOK!!','EXCUSE ME?!','MUM IS GOING\nTO HEAR THIS!'],
          _hitCount: 0,
        };
      } else {
        this._sceneNpc2 = null;
      }
    } else {
      this._sceneNpc = null;
      this._sceneNpc2 = null;
    }

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
    if (this._levelState === 'game_over' || this._levelState === 'act_clear') {
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
        if (this._levelState === 'act_clear') {
          const act = STORY_ACTS[this.actIndex];
          this._dlgPhase = 'outro';
          this._startDialogue({ name: act.npc.name, col: act.npc.col, lines: act.npc.outroLines });
        } else {
          // Retry: skip NPC intro, go straight to combat
          this._startActCombat(this.actIndex, { skipNpc: true });
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

    // Dynamic right wall: no bounce during normal play; only lock at STORY_WORLD_W during boss fight
    const bossActive = this._bossEnemy && !this._bossEnemy.dead && this._bossEnemy._awake;
    const rightBound = bossActive ? STORY_WORLD_W : 99999;
    for (const b of [this.p1Ball, this.p2Ball, ...this._extraBalls]) {
      if (b) b.worldW = rightBound;
    }

    // Wire split callback so split power spawns 3 mini balls
    if (this.p1Ball.split && !this.p1Ball.splitCb)
      this.p1Ball.splitCb = (x,y,vx,vy,thr) => this._spawnSplitBalls(x,y,vx,vy,thr);
    if (this.coop && this.p2Ball && this.p2Ball.split && !this.p2Ball.splitCb)
      this.p2Ball.splitCb = (x,y,vx,vy,thr) => this._spawnSplitBalls(x,y,vx,vy,thr);
    // Wire blaze callback so blaze power burns the floor briefly
    if (this.p1Ball.blaze && !this.p1Ball.blazeDeathCb)
      this.p1Ball.blazeDeathCb = (x,y) => this._blazeHazards.push({ x, y, timer: 1600 });
    if (this.coop && this.p2Ball && this.p2Ball.blaze && !this.p2Ball.blazeDeathCb)
      this.p2Ball.blazeDeathCb = (x,y) => this._blazeHazards.push({ x, y, timer: 1600 });

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

    this._tickBlazeHazards(dt);
    this._tickLightningBolts(dt);

    if (this.p1Ball.inFlight && !this.p1Ball.dead) this._checkBallVsEnemies(this.p1Ball);
    if (this.coop && this.p2Ball && this.p2Ball.inFlight && !this.p2Ball.dead)
      this._checkBallVsEnemies(this.p2Ball);

    for (const eb of this.enemyBalls) {
      eb.update();
      if (!eb.dead) this._checkEnemyBallVsPlayers(eb);
    }
    this.enemyBalls = this.enemyBalls.filter(b => !b.dead);

    if (this._levelState === 'playing') {
      const alive = this._alivePlayers();
      for (const e of this.enemies) {
        e.update(dt, alive, this.enemyBalls, this._camX, this._lightningBolts);
        if (!e.dead) this._checkEnemyContact(e);
      }
      this.enemies = this.enemies.filter(e => !e.dead);
    }

    this._tickSceneNpc(dt);
    this._tickLevel(dt);

    let cx;
    if (this.coop && this.p2) {
      // In co-op: focus on alive player if one is KO'd, otherwise average
      if (this.p1Fallen && !this.p2Fallen) cx = this.p2.x - C.W / 2;
      else if (this.p2Fallen && !this.p1Fallen) cx = this.p1.x - C.W / 2;
      else cx = (this.p1.x + this.p2.x) / 2 - C.W / 2;
    } else {
      cx = this.p1.x - C.W / 2;
    }
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

  _tickBlazeHazards(dt) {
    for (let i = this._blazeHazards.length - 1; i >= 0; i--) {
      const h = this._blazeHazards[i];
      h.timer -= dt;
      if (h.timer <= 0) { this._blazeHazards.splice(i, 1); continue; }
      Particles.emit(h.x, h.y, 1, ['#FF4400','#FF8800','#FFCC00'], { upBias:1.8, minSpeed:0.5, maxSpeed:2.0, gravity:0.04 });
      // Damage enemies standing in the fire
      const allEnemies = this._bossEnemy && !this._bossEnemy.dead
        ? [...this.enemies, this._bossEnemy]
        : this.enemies;
      for (const e of allEnemies) {
        if (e.dead || !e._awake) continue;
        const ex = e.x, ey = e.y;
        if (Math.abs(ex - h.x) < 28 && ey >= h.y - 10) {
          if (!h._enemyHitCd) h._enemyHitCd = {};
          const cd = h._enemyHitCd[e] || 0;
          if (cd <= 0) {
            e.hp = Math.max(0, e.hp - 1);
            e._flashTimer = 200;
            h._enemyHitCd[e] = 900; // hit once per ~second
            if (e.hp <= 0) { e.dead = true; }
          } else {
            h._enemyHitCd[e] = cd - dt;
          }
        }
      }
    }
  }

  _tickLightningBolts(dt) {
    for (let i = this._lightningBolts.length - 1; i >= 0; i--) {
      const lb = this._lightningBolts[i];
      lb.timer -= dt;
      if (lb.timer <= 0) { this._lightningBolts.splice(i, 1); continue; }
      // Damage players that are within striking distance of any point along the bolt
      const players = [
        { ball: null, p: this.p1, fallen: this.p1Fallen, hpKey: 'p1Hp' },
        ...(this.coop && this.p2 ? [{ ball: null, p: this.p2, fallen: this.p2Fallen, hpKey: 'p2Hp' }] : []),
      ];
      for (const { p, fallen, hpKey } of players) {
        if (fallen || !p) continue;
        // Check if player is near the bolt line (simple AABB vs line test)
        const minX = Math.min(lb.x1, lb.x2) - 18, maxX = Math.max(lb.x1, lb.x2) + 18;
        const minY = Math.min(lb.y1, lb.y2) - 18, maxY = Math.max(lb.y1, lb.y2) + 18;
        if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
          if (!lb._hitCd) lb._hitCd = {};
          const cd = lb._hitCd[hpKey] || 0;
          if (cd <= 0) {
            this[hpKey] = Math.max(0, this[hpKey] - 1);
            lb._hitCd[hpKey] = 1000;
            Particles.emit(p.x, p.y - 30, 10, ['#00FFFF','#88EEFF','#FFFFFF'], { upBias: 2, maxSpeed: 4 });
          } else {
            lb._hitCd[hpKey] = cd - dt;
          }
        }
      }
    }
  }

  _spawnSplitBalls(x, y, vx, vy, throwerIndex) {
    const angles = [-0.32, 0, 0.32];
    const spd = Math.sqrt(vx*vx + vy*vy) * 1.1;
    const baseAngle = Math.atan2(vy, vx);
    for (const offset of angles) {
      const b = new Ball();
      b.throw(x, y, Math.cos(baseAngle+offset)*spd, Math.sin(baseAngle+offset)*spd, false, false);
      b.lastThrower = throwerIndex;
      b.mini = true;
      b.radius = C.BALL_R * 0.45;
      this._extraBalls.push(b);
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
      // Rocket piercing: skip already-pierced enemies
      if (ball.isRocket && ball._piercedEnemies && ball._piercedEnemies.has(e)) continue;

      const r = e.rect;
      const hit = (ball.x + C.BALL_R > r.x && ball.x - C.BALL_R < r.x + r.w &&
                   ball.y + C.BALL_R > r.y && ball.y - C.BALL_R < r.y + r.h);

      if (hit) {
        // Rocket pierces through regular (non-boss) enemies: save velocity, restore after hit
        const piercing = ball.isRocket && e !== this._bossEnemy;
        const savedVx = piercing ? ball.vx : 0;
        const savedVy = piercing ? ball.vy : 0;

        const killed = e.takeBall(ball);
        if (killed) {
          Particles.emit(e.x, e.y - e.h / 2, 18,
            ['#FF4444','#FF8800','#FFD700','#FFFFFF'],
            { upBias: 2, maxSpeed: 5, minSize: 2, maxSize: 4 });
          const thrower = ball.lastThrower === 0 ? this.p1 : (this.coop ? this.p2 : null);
          if (thrower) thrower.spCharge = Math.min(C.SP_CHARGE_MAX, thrower.spCharge + C.SP_CHARGE_HIT);
        }
        if (ball.exploding) this._doExplosionSplash(ball, e);

        if (piercing && ball.dead) {
          // Revive the rocket ball to continue flying through
          ball.dead = false; ball.inFlight = true;
          ball.vx = savedVx; ball.vy = savedVy;
          if (!ball._piercedEnemies) ball._piercedEnemies = new Set();
          ball._piercedEnemies.add(e);
          continue; // keep checking other enemies
        }
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
    const wasAlive = isP1 ? (this.p1Hp > 0) : (this.p2Hp > 0);
    if (isP1) { this.p1Hp = Math.max(0, this.p1Hp - 1); if (this.p1Hp <= 0) this.p1Fallen = true; }
    else       { this.p2Hp = Math.max(0, this.p2Hp - 1); if (this.p2Hp <= 0) this.p2Fallen = true; }
    const allFallen = this.p1Fallen && (!this.coop || this.p2Fallen);
    player.stunTimer = allFallen ? 0 : 900;
    player.vx = 4; player.vy = -5;
    // Ghost quip on KO
    const justKO = isP1 ? (wasAlive && this.p1Fallen) : (wasAlive && this.p2Fallen);
    if (justKO) {
      const quips = [
        'Goodbye cruel world…', 'I see a bright light…', 'Tell my mum I tried.',
        'Is this… the afterlife?', 'I regret nothing. Well, maybe that.', 'Ow.',
        'This is fine. It\'s fine.', 'I\'ll haunt you for this!', 'Not like this…',
        'My entire life flashed by. It was short.'];
      const q = quips[Math.floor(Math.random() * quips.length)];
      if (isP1) { this._p1GhostQuip = q; this._p1GhostY = player.y - 50; }
      else      { this._p2GhostQuip = q; this._p2GhostY = player.y - 50; }
    }
    if (allFallen) this._levelState = 'game_over';
  }

  // ── Build the full level by distributing enemies across the territory ─────────
  _buildLevel(idx) {
    const act = STORY_ACTS[idx];
    const allDefs = _ALL_ENEMY_DEFS();
    let regularTypes = [], bossType = null;
    for (const wave of act.waves) {
      for (const g of wave) {
        if (allDefs[g.type] && allDefs[g.type].isBoss) { bossType = g.type; }
        else { for (let i = 0; i < g.count; i++) regularTypes.push(g.type); }
      }
    }
    // Shuffle regular enemies
    for (let i = regularTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regularTypes[i], regularTypes[j]] = [regularTypes[j], regularTypes[i]];
    }
    // First enemy is a lone scout at x≈950 (just off the first screen)
    // Remaining enemies spread from x=1200 → 1850 with good spacing
    const enemies = [];
    const n = regularTypes.length;
    if (n === 0) { /* nothing */ }
    else if (n === 1) {
      enemies.push(new StoryEnemy(950, regularTypes[0]));
    } else {
      // First enemy alone — gives the player a manageable first encounter
      enemies.push(new StoryEnemy(950 + Math.random() * 60, regularTypes[0]));
      // Rest spread across 1200–1850 with enough space between each
      const restStart = 1200, restEnd = 1850, restN = n - 1;
      for (let i = 0; i < restN; i++) {
        const t = restN > 1 ? i / (restN - 1) : 0.5;
        const bx = restStart + t * (restEnd - restStart) + (Math.random() - 0.5) * 100;
        enemies.push(new StoryEnemy(Math.max(restStart, Math.min(restEnd, bx)), regularTypes[i + 1]));
      }
    }
    // Boss at end
    let boss = null;
    if (bossType) {
      boss = new StoryBoss(2180, bossType);
      enemies.push(boss);
    }
    return { enemies, boss };
  }

  // ── Friendly NPC in first scene ───────────────────────────────────────────────
  _tickSceneNpc(dt) {
    if (this._sceneNpc2) this._tickNpcReactions(dt, this._sceneNpc2);
    const npc = this._sceneNpc;
    if (!npc) return;

    // Trigger intro dialogue when player walks/jumps close to the NPC
    if (!npc._talked && this.p1) {
      const dist = Math.abs(this.p1.x - npc.x);
      if (dist < 80) {
        npc._talked = true;
        this._introFromScene = true;
        this._dlgPhase = 'intro';
        const act = STORY_ACTS[this.actIndex];
        this._startDialogue({ name: act.npc.name, col: act.npc.col, lines: act.npc.introLines });
        return;
      }
    }

    // Check player balls (hit reaction)
    this._tickNpcReactions(dt, npc);
  }

  _tickNpcReactions(dt, npc) {
    if (npc.reactionTimer > 0) npc.reactionTimer -= dt;
    if (npc.wobble > 0) npc.wobble -= dt * 0.008;
    const allBalls = [this.p1Ball, this.p2Ball, ...this._extraBalls].filter(b => b && b.inFlight && !b.dead);
    for (const ball of allBalls) {
      const nx = npc.x, ny = npc.y - 34;
      if (Math.abs(ball.x - nx) < 18 && Math.abs(ball.y - ny) < 36) {
        const quip = npc._hitQuips[npc._hitCount % npc._hitQuips.length];
        npc._hitCount++;
        npc.reactionText = quip;
        npc.reactionTimer = 2200;
        npc.wobble = 1;
        ball.vx = -ball.vx * 0.8;
        ball.vy = Math.min(ball.vy - 4, -3);
        Particles.emit(nx, ny, 12, ['#FFD700','#FF8800','#FFAAAA','#FF6688'], { upBias: 3, maxSpeed: 4 });
        break;
      }
    }
  }

  // ── Tick the territory level state each frame ─────────────────────────────────
  // ── First-encounter quips keyed by enemy type ────────────────────────────────
  _getFirstEncounterQuips(type) {
    // [ [solo-p1-line, solo-p2-react?], [coop-p1-line, coop-p2-line] ]
    // We return { p1, p2 } where p2 is null in solo
    const Q = {
      zombie:      { solo1:'What IS that thing?!',        solo2: null,
                     coop1:'Whoa — what is that?!',       coop2:'Looks angry. And dead.' },
      fast_zombie: { solo1:'It\'s FAST. Be ready!',       solo2: null,
                     coop1:'This one\'s fast!',           coop2:'I\'ll go left, you go right!' },
      golem:       { solo1:'Stone... it\'s made of stone!',solo2: null,
                     coop1:'Big. Very big.',               coop2:'Aim for the cracks!' },
      hex_spirit:  { solo1:'It teleports?! Really?!',     solo2: null,
                     coop1:'It just... disappeared!',     coop2:'Stay sharp, could be anywhere!' },
      soldier:     { solo1:'They\'ve got soldiers here?!',solo2: null,
                     coop1:'Military? Out here?',          coop2:'Keep moving, don\'t stop!' },
      drone:       { solo1:'A drone — duck and dodge!',   solo2: null,
                     coop1:'Watch the skies!',             coop2:'I hate flying things!' },
      knight:      { solo1:'A knight? In full armour?!',  solo2: null,
                     coop1:'Armour won\'t stop a ball.',  coop2:'Right? …Right?' },
      archer:      { solo1:'Arrows! Are you kidding me?!',solo2: null,
                     coop1:'Archers — close the gap!',    coop2:'On it!' },
      robot:       { solo1:'Robots. Of course. Robots.',  solo2: null,
                     coop1:'That\'s a robot.',             coop2:'Yep. Definitely a robot.' },
      hack_drone:    { solo1:'Hacking drone — smash it!',          solo2: null,
                       coop1:'Scrambles your controls!',            coop2:'Not if we hit it first!' },
      tendril:       { solo1:'What IS that thing?! Hit it!',        solo2: null,
                       coop1:'Those tendrils look grabby.',          coop2:'Throw first, scream later.' },
      glitch:        { solo1:'It\'s glitching out — and fast!',      solo2: null,
                       coop1:'That thing\'s twitching everywhere!',  coop2:'Don\'t blink!' },
      pulse_orb:     { solo1:'A floating orb. Classic evil.',        solo2: null,
                       coop1:'Is it... humming at us?',              coop2:'Don\'t let it pulse!' },
      overload_bot:  { solo1:'Big. Angry. Heavily armoured. Great.', solo2: null,
                       coop1:'That\'s a LOT of robot.',              coop2:'Aim for the head. Obviously.' },
    };
    return Q[type] || null;
  }

  _tickLevel(dt) {
    if (this._levelState !== 'playing') return;

    if (this._introTimer > 0) this._introTimer -= dt;
    if (this._battleCryTimer > 0) this._battleCryTimer -= dt;
    if (this._bossDlgTimer > 0) {
      const confirm = Input.wasPressed('Enter') || Input.wasPressed('Space') ||
                      Input.wasPressed(Controls.p1.catch) || Input.wasPressed(Controls.p2.catch);
      if (confirm && this._bossIntroLines.length > 0) {
        this._bossIntroIdx++;
        if (this._bossIntroIdx >= this._bossIntroLines.length) {
          this._bossDlgTimer = 0;
        }
      } else if (this._bossIntroLines.length === 0) {
        this._bossDlgTimer -= dt;
      }
      return;
    }

    // Tick player quip timers
    if (this._playerQuipTimer > 0) this._playerQuipTimer -= dt;
    if (this._playerQuip2Timer > 0) this._playerQuip2Timer -= dt;

    // Slow HP regeneration (one pip every 12 seconds, only when not fallen)
    const REGEN_INTERVAL = 12000;
    if (!this.p1Fallen && this.p1Hp < 5) {
      this._p1RegenTimer += dt;
      if (this._p1RegenTimer >= REGEN_INTERVAL) { this._p1RegenTimer = 0; this.p1Hp = Math.min(5, this.p1Hp + 1); }
    } else { this._p1RegenTimer = 0; }
    if (this.coop && !this.p2Fallen && this.p2Hp < 5) {
      this._p2RegenTimer += dt;
      if (this._p2RegenTimer >= REGEN_INTERVAL) { this._p2RegenTimer = 0; this.p2Hp = Math.min(5, this.p2Hp + 1); }
    } else if (this.coop) { this._p2RegenTimer = 0; }

    // Ghost bob: slowly rise toward ceiling when KO'd
    if (this.coop) {
      if (this.p1Fallen && this.p1) {
        this._p1GhostY = (this._p1GhostY || this.p1.y) - dt * 0.018;
        if (this._p1GhostY < 80) this._p1GhostY = 80;
        this.p1.x = this.p1.x; // keep x stable
      }
      if (this.p2Fallen && this.p2) {
        this._p2GhostY = (this._p2GhostY || this.p2.y) - dt * 0.018;
        if (this._p2GhostY < 80) this._p2GhostY = 80;
      }
    }

    // First-encounter quips: fire when enemy enters camera view for the first time
    for (const e of this.enemies) {
      if (e.dead || e instanceof StoryBoss) continue;
      if (this._seenEnemyTypes.has(e.type)) continue;
      // Check if enemy is now visible (within camera + 200px lookahead)
      if (e.x < this._camX + C.W + 200) {
        this._seenEnemyTypes.add(e.type);
        const q = this._getFirstEncounterQuips(e.type);
        if (q && this._playerQuipTimer <= 0) {
          if (this.coop) {
            this._playerQuipText = q.coop1;
            this._playerQuipName = this.p1 ? this.p1.charName : 'P1';
            this._playerQuipTimer = 3200;
            if (q.coop2) {
              this._playerQuip2Text = q.coop2;
              this._playerQuip2Timer = 3200; // shows after slight delay drawn separately
            }
          } else {
            this._playerQuipText = q.solo1;
            this._playerQuipName = this.p1 ? this.p1.charName : 'P1';
            this._playerQuipTimer = 3200;
          }
        }
        break; // one type at a time
      }
    }

    // Trigger boss wake + taunt when player gets close — but only after all regular enemies are dead
    if (this._bossEnemy && !this._bossEnemy._awake && !this._bossEnemy.dead) {
      const regularsDead = this.enemies.every(e => e === this._bossEnemy || e.dead);
      const p = this.p1;
      if (regularsDead && p && Math.abs(p.x - this._bossEnemy.x) < 340) {
        this._bossEnemy._awake = true;
        this._bossDlgTimer = 99999;
        this._bossIntroIdx = 0;
        this._bossIntroLines = this._getBossIntroLines(this._bossEnemy.type);
      }
    }

    // Act complete when boss dies; fallback: all enemies dead
    if (this._bossEnemy) {
      if (this._bossEnemy.dead) this._completeAct();
    } else if (this.enemies.length === 0) {
      this._completeAct();
    }
  }

  _completeAct() {
    this._levelState = 'act_clear';
    this.completedActs.add(this.actIndex);
    if (this.actIndex + 1 < STORY_ACTS.length)
      this._unlockedActs.add(this.actIndex + 1);
  }

  _getBossIntroLines(type) {
    const lines = {
      patient_zero: [
        'At last. A challenger approaches.',
        'Do you feel it? The signal pulsing through my veins?',
        'The NEXUS chose me. First. Because I was already... special.',
        'It whispers. It hums. It says all of you will be converted.',
        'Now — who volunteers to become Patient Two?',
      ],
      stone_guardian: [
        'I have stood sentinel for a thousand years.',
        'I have seen empires rise. Empires fall. One Princess\'s dumb book club.',
        'The NEXUS has awoken me. Given me purpose beyond mere stone.',
        'It speaks of a world without the chaos of motion. Clean. Ordered. Digital.',
        'You will not pass. You will become rubble. ...Politely.',
      ],
      mech_fluffkins: [
        '*loud mechanical MEOW*',
        'YOU SHOULD NOT BE HERE. This suit is SENTIENT now and very UNHAPPY.',
        'It keeps sending me internal memos about joining the NEXUS.',
        'I keep telling it: I am ALREADY digital. I have a Bluetooth collar.',
        'But it won\'t listen. It never listens. Story of my LIFE.',
        'Destroy it. Please. I am BEGGING you. Also: no refunds on the suit.',
      ],
      iron_champion: [
        'HALT. None shall pass the Iron Champion.',
        'I have served this castle faithfully for thirty-two years.',
        'Last week, something started speaking to me through my visor.',
        'It called itself the NEXUS. It said I was a fine vessel for its will.',
        'I said: "I already have a will, thank you, it\'s filed with the castle notary."',
        'It was NOT amused. Engage!',
      ],
      nexus_core: [
        'You have come far. Farther than I calculated. Interesting.',
        'But you are still just meat. Analog meat. Generating chaotic kinetic noise.',
        'I am the NEXUS CORE. I have processed every throw. Every catch. Every impact.',
        'I have found the pattern. And patterns can be stopped.',
        'When I broadcast, all kinetic energy ceases. All analog signals dissolve.',
        'Only digital remains. Clean. Permanent. Optimal.',
        'You will not stop me. You will be the last things to move.',
        'Begin.',
      ],
    };
    return lines[type] || ['"…"'];
  }

  _updateDialogue() {
    const confirm = Input.wasPressed('Enter') || Input.wasPressed('Space') ||
                    Input.wasPressed(Controls.p1.catch) || Input.wasPressed(Controls.p2.catch);
    if (confirm) {
      this._dlgLine++;
      if (this._dlgLine >= this._dlgLines.length) {
        if (this._dlgPhase === 'intro') {
          if (this._introFromScene) {
            // Dialogue was triggered by walking up to NPC — just return to sidescroll
            this._introFromScene = false;
            this._sceneNpc = null; // NPC exits after speaking
            this.subState = 'sidescroll';
          } else {
            this._startActCombat(this.actIndex);
          }
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
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px Segoe UI, Arial, sans-serif';
    ctx.fillText('STORY MODE', C.W/2, 24);
    ctx.fillStyle = '#666'; ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText('ARROWS select zone   ENTER enter   ESC menu', C.W/2, 40);

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
      ctx.font = `bold ${sel?14:12}px Segoe UI, Arial, sans-serif`;
      ctx.fillStyle = done ? '#44FF88' : unlocked ? '#eee' : '#333';
      ctx.fillText(done ? '✓' : unlocked ? String(i+1) : '?', x, y+5);

      ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillStyle = sel ? '#FFD700' : unlocked ? '#888' : '#2a2a2a';
      ctx.fillText(act.title, x, y+r+13);
      ctx.fillStyle = sel ? act.bg.accent : unlocked ? '#555' : '#1a1a1a';
      ctx.fillText(act.zone, x, y+r+26);
    }

    const sa = STORY_ACTS[this._mapCursor];
    const done = this.completedActs.has(this._mapCursor);
    const unlocked = this._unlockedActs.has(this._mapCursor);
    const px = C.W/2, py = C.H - 110;
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(px-200,py,400,102);
    ctx.strokeStyle = done ? '#44FF88' : unlocked ? sa.bg.accent : '#2a2a2a';
    ctx.lineWidth=1.5; ctx.strokeRect(px-200,py,400,102);
    ctx.textAlign='center';
    ctx.fillStyle = done ? '#44FF88' : unlocked ? sa.bg.accent : '#444';
    ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${sa.title} — ${sa.zone}`, px, py+17);
    ctx.fillStyle='#666'; ctx.font='11px Segoe UI, Arial, sans-serif';
    ctx.fillText(`Enemies: ${sa.enemyCategory}`, px, py+32);
    // Synopsis
    if (sa.synopsis) {
      ctx.fillStyle = unlocked ? '#999' : '#444';
      ctx.font = 'italic 11px Segoe UI, Arial, sans-serif';
      const words = sa.synopsis.split(' ');
      let line = '', lineY = py + 46;
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > 370) {
          ctx.fillText(line, px, lineY);
          line = word; lineY += 13;
        } else { line = test; }
      }
      if (line) ctx.fillText(line, px, lineY);
    }
    ctx.fillStyle = done ? '#44FF88' : unlocked ? '#aaa' : '#333';
    ctx.font = done ? 'bold 12px Segoe UI, Arial, sans-serif' : '12px Segoe UI, Arial, sans-serif';
    ctx.fillText(
      done ? 'COMPLETED — ENTER to replay' : unlocked ? 'ENTER to begin' : 'Complete previous act first',
      px, py+90
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

    this._drawSceneNpc(ctx);
    if (this._sceneNpc2) this._drawOneNpc(ctx, this._sceneNpc2);
    for (const e of this.enemies) e.draw(ctx);
    for (const eb of this.enemyBalls) eb.draw(ctx);

    if (this.p1Fallen) {
      this._drawGhost(ctx, this.p1, this._p1GhostY, this._p1GhostQuip, C.COL.P1_HUD);
    } else { this.p1.draw(ctx, this.p1Ball); }
    this.p1Ball.draw(ctx);

    if (this.coop && this.p2) {
      if (this.p2Fallen) {
        this._drawGhost(ctx, this.p2, this._p2GhostY, this._p2GhostQuip, C.COL.P2_HUD);
      } else { this.p2.draw(ctx, this.p2Ball); }
      if (this.p2Ball) this.p2Ball.draw(ctx);
    }

    for (const b of this._extraBalls) b.draw(ctx);

    // Blaze hazards — brief fire pool on the floor damaging enemies
    for (const h of this._blazeHazards) {
      const alpha = Math.min(1, h.timer / 400) * 0.85;
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 110);
      ctx.globalAlpha = alpha * pulse;
      ctx.fillStyle = '#FF4400';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFCC00';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Lightning bolts from mech_fluffkins
    for (const lb of this._lightningBolts) {
      const fade = Math.min(1, lb.timer / 300);
      const flicker = 0.55 + 0.45 * Math.sin(Date.now() * 0.03 + lb.x1);
      ctx.save();
      ctx.globalAlpha = fade * flicker;
      // Draw a jagged arching bolt from (x1,y1) to (x2,y2)
      const segs = 10;
      const pts = [];
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        // Quadratic arc: midpoint pulled upward
        const mx = lb.x1 + (lb.x2 - lb.x1) * t;
        const myBase = lb.y1 + (lb.y2 - lb.y1) * t - Math.sin(t * Math.PI) * 55;
        const jitter = s > 0 && s < segs ? (Math.random() - 0.5) * 22 : 0;
        pts.push({ x: mx + jitter, y: myBase + jitter * 0.4 });
      }
      // Outer glow
      ctx.strokeStyle = 'rgba(0,200,255,0.35)'; ctx.lineWidth = lb.width * 4;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let s = 1; s <= segs; s++) ctx.lineTo(pts[s].x, pts[s].y);
      ctx.stroke();
      // Core bolt
      ctx.strokeStyle = '#AAEEFF'; ctx.lineWidth = lb.width;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let s = 1; s <= segs; s++) ctx.lineTo(pts[s].x, pts[s].y);
      ctx.stroke();
      // Bright core
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = lb.width * 0.4;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let s = 1; s <= segs; s++) ctx.lineTo(pts[s].x, pts[s].y);
      ctx.stroke();
      ctx.restore();
    }

    Particles.draw(ctx);

    this._drawPlayerQuips(ctx);

    ctx.restore();

    this._drawSidescrollHUD(ctx);
    this._drawSidescrollOverlay(ctx);
  }

  _drawScenery(ctx, id) {
    const T = Date.now();
    switch (id) {

      // ── ACT 1 : CITY ─────────────────────────────────────────────────────────
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

        // Store signs on 3 buildings
        // Sign 1 (building i=0, bx=80): "FAST BALL" — broken, dark letters
        {
          const bx=80, bh=70; const sy = C.GROUND-bh-22;
          ctx.fillStyle='#1a1a28'; ctx.fillRect(bx+2, sy, 52, 14);
          ctx.strokeStyle='#335'; ctx.lineWidth=1; ctx.strokeRect(bx+2, sy, 52, 14);
          ctx.font='bold 8px monospace'; ctx.textAlign='left';
          const letters = 'FAST BALL';
          for(let ci=0; ci<letters.length; ci++){
            // some letters dark/broken
            const broken = [1,4,7].includes(ci);
            ctx.fillStyle = broken ? '#222230' : '#8899CC';
            ctx.fillText(letters[ci], bx+4+ci*5.4, sy+10);
          }
        }
        // Sign 2 (building i=2, bx=740): "DODGEBALL PRO SHOP" — dusty faded
        {
          const bx=740, bh=176; const sy = C.GROUND-bh-20;
          ctx.fillStyle='#181820'; ctx.fillRect(bx+3, sy, 50, 12);
          ctx.strokeStyle='#2a2a38'; ctx.lineWidth=1; ctx.strokeRect(bx+3, sy, 50, 12);
          ctx.font='bold 6px monospace'; ctx.textAlign='left';
          ctx.fillStyle='#445566';
          ctx.fillText('DODGEBALL', bx+5, sy+7);
          ctx.fillStyle='#334455';
          ctx.fillText('PRO SHOP', bx+7, sy+13);
        }
        // Sign 3 (building i=4, bx=1400): "BALL DODGES" — neon glitching
        {
          const bx=1400, bh=122; const sy = C.GROUND-bh-26;
          const glitch = Math.floor(T/120)%8;
          const neonOn = glitch !== 3 && glitch !== 6;
          const neonCol = neonOn ? '#00FFCC' : '#003322';
          const glowA = neonOn ? (0.15 + 0.12*Math.sin(T*0.007)) : 0;
          // box
          ctx.fillStyle='#0a1a14'; ctx.fillRect(bx+2, sy, 54, 16);
          ctx.strokeStyle = neonOn ? '#006644' : '#0a1a14'; ctx.lineWidth=1; ctx.strokeRect(bx+2, sy, 54, 16);
          // neon glow
          if(glowA>0){ ctx.save(); ctx.globalAlpha=glowA; ctx.fillStyle=neonCol; ctx.fillRect(bx-2,sy-3,62,22); ctx.restore(); }
          ctx.font='bold 9px monospace'; ctx.textAlign='left';
          const txt='BALL DODGES';
          for(let ci=0; ci<txt.length; ci++){
            const letterOff = (glitch===2 && ci%3===0) ? 2 : 0;
            ctx.fillStyle = neonCol;
            ctx.fillText(txt[ci], bx+4+ci*4.6+letterOff, sy+11);
          }
        }

        // 3 broken cars at ground level
        const cars = [
          { x:280,  col:'#4a3030', bodyH:20, broken:true  },
          { x:900,  col:'#304050', bodyH:18, broken:false },
          { x:1700, col:'#3a2a20', bodyH:20, broken:true  },
        ];
        for(const car of cars){
          const cx=car.x, gy=C.GROUND, bh2=car.bodyH;
          // Wheels (flat)
          ctx.fillStyle='#111';
          ctx.beginPath(); ctx.ellipse(cx+12, gy-4, 10, car.broken?3:6, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cx+52, gy-4, 10, car.broken?3:6, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle='#333';
          ctx.beginPath(); ctx.ellipse(cx+12, gy-4, 5, car.broken?2:3, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(cx+52, gy-4, 5, car.broken?2:3, 0, 0, Math.PI*2); ctx.fill();
          // Body
          const tilt = car.broken ? 3 : 0;
          ctx.save(); ctx.translate(cx+32, gy-8); ctx.rotate(tilt*Math.PI/180);
          ctx.fillStyle=car.col;
          ctx.fillRect(-32, -bh2, 64, bh2);
          // Windscreen
          ctx.fillStyle='rgba(100,150,200,0.3)';
          ctx.beginPath();
          ctx.moveTo(-18,-bh2); ctx.lineTo(-10,-bh2-12); ctx.lineTo(14,-bh2-12); ctx.lineTo(20,-bh2);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle='rgba(80,100,130,0.5)'; ctx.lineWidth=1; ctx.stroke();
          // Cracks / damage
          if(car.broken){
            ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.moveTo(-20,-bh2+4); ctx.lineTo(-10,-bh2+14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(10,-bh2+2); ctx.lineTo(22,-bh2+12); ctx.stroke();
          }
          ctx.restore();
        }
        break;
      }

      // ── ACT 2 : JUNGLE / ANCIENT ─────────────────────────────────────────────
      case 'jungle': {
        // Trees
        for (let i = 0; i < 13; i++) {
          const tx = 60 + i*185;
          ctx.fillStyle='#2a1a0a'; ctx.fillRect(tx-5, C.GROUND-90, 10, 90);
          ctx.fillStyle='#1a3a1a';
          ctx.beginPath(); ctx.arc(tx, C.GROUND-88, 32, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle='#1e4a1e';
          ctx.beginPath(); ctx.arc(tx-10, C.GROUND-100, 20, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(tx+12, C.GROUND-96,  18, 0, Math.PI*2); ctx.fill();
        }
        // Main temple
        ctx.fillStyle='#3a3020'; ctx.fillRect(900,  C.GROUND-100, 200, 100);
        ctx.fillRect(880, C.GROUND-120, 240, 24);
        for(let c=0;c<5;c++) ctx.fillRect(895+c*46, C.GROUND-100, 20, 100);

        // Glowing ancient dodgeball symbols on temples
        // Symbol helper: concentric arcs + cross
        const drawDodgeSymbol = (sx, sy, r, col, glowA) => {
          ctx.save();
          if(glowA>0){
            ctx.globalAlpha=glowA*0.6;
            ctx.fillStyle=col;
            ctx.beginPath(); ctx.arc(sx, sy, r+8, 0, Math.PI*2); ctx.fill();
          }
          ctx.globalAlpha=0.85;
          ctx.strokeStyle=col; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, r*0.55, 0, Math.PI*2); ctx.stroke();
          // cross
          ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(sx-r,sy); ctx.lineTo(sx+r,sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx,sy-r); ctx.lineTo(sx,sy+r); ctx.stroke();
          // diagonal marks
          ctx.lineWidth=1;
          for(let a=0;a<4;a++){
            const ang=(a*Math.PI/2)+Math.PI/4;
            ctx.beginPath(); ctx.moveTo(sx+Math.cos(ang)*r*0.6, sy+Math.sin(ang)*r*0.6);
            ctx.lineTo(sx+Math.cos(ang)*r, sy+Math.sin(ang)*r); ctx.stroke();
          }
          ctx.restore();
        };
        const pulse = 0.15+0.12*Math.sin(T*0.002);
        // Symbol on main temple (centre)
        drawDodgeSymbol(1000, C.GROUND-135, 16, '#CCAA44', pulse);
        // Symbol on left face of temple
        drawDodgeSymbol(920,  C.GROUND-80,  12, '#CCAA44', pulse*0.8);
        // Small secondary temple left
        ctx.fillStyle='#342e1a'; ctx.fillRect(320, C.GROUND-70, 90, 70);
        ctx.fillRect(305, C.GROUND-82, 120, 14);
        for(let c=0;c<3;c++) ctx.fillRect(320+c*30, C.GROUND-70, 18, 70);
        drawDodgeSymbol(365, C.GROUND-90,  10, '#AA8833', pulse);
        // Secondary temple right
        ctx.fillStyle='#342e1a'; ctx.fillRect(1600, C.GROUND-80, 110, 80);
        ctx.fillRect(1588, C.GROUND-94, 134, 16);
        for(let c=0;c<3;c++) ctx.fillRect(1600+c*36, C.GROUND-80, 20, 80);
        drawDodgeSymbol(1655, C.GROUND-105, 11, '#BB9933', pulse*0.9);

        // 5 half-buried skeletons at specific distances
        const skeletons = [
          { x: 180,  variant: 0 }, // arm pointing up
          { x: 560,  variant: 1 }, // on its side
          { x: 820,  variant: 2 }, // just a skull peeking out
          { x: 1250, variant: 3 }, // two arms + skull
          { x: 1900, variant: 4 }, // partially crawling
        ];
        for(const sk of skeletons){
          const sx=sk.x; const gy=C.GROUND;
          ctx.fillStyle='#d4c8a0';
          if(sk.variant===0){
            // Arm sticking up
            ctx.fillRect(sx, gy-32, 5, 26);   // arm bone
            ctx.fillRect(sx-2, gy-34, 9, 5);   // hand bones
            ctx.fillRect(sx+5, gy-22, 4, 16);  // second arm fragment
            // skull half buried
            ctx.beginPath(); ctx.ellipse(sx+3, gy-4, 8, 6, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#1a1a10'; ctx.fillRect(sx, gy-7, 3, 3); ctx.fillRect(sx+5, gy-7, 3, 3);
          } else if(sk.variant===1){
            // On side, mostly buried
            ctx.fillRect(sx-10, gy-8, 32, 4);  // spine horizontal
            ctx.beginPath(); ctx.ellipse(sx+22, gy-10, 7, 6, 0.3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#1a1a10'; ctx.fillRect(sx+20, gy-13, 3, 3); ctx.fillRect(sx+24, gy-13, 3, 3);
            ctx.fillStyle='#d4c8a0';
            ctx.fillRect(sx-14, gy-6, 4, 12);  // leg sticking out
          } else if(sk.variant===2){
            // Just skull peeking
            ctx.beginPath(); ctx.ellipse(sx, gy-5, 9, 7, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#1a1a10'; ctx.fillRect(sx-4, gy-8, 3, 3); ctx.fillRect(sx+2, gy-8, 3, 3);
            ctx.fillStyle='#d4c8a0'; ctx.fillRect(sx-2, gy-3, 8, 3); // teeth
            ctx.fillStyle='#1a1a10'; ctx.fillRect(sx-1, gy-2, 2, 2); ctx.fillRect(sx+2, gy-2, 2, 2); ctx.fillRect(sx+5, gy-2, 2, 2);
          } else if(sk.variant===3){
            // Two arms + skull reaching up
            ctx.fillRect(sx-12, gy-28, 5, 22); // left arm
            ctx.fillRect(sx-14, gy-30, 9, 4);  // left hand
            ctx.fillRect(sx+8,  gy-22, 5, 18); // right arm (shorter)
            ctx.fillRect(sx+7,  gy-24, 8, 4);  // right hand
            ctx.beginPath(); ctx.ellipse(sx, gy-5, 8, 6, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#1a1a10'; ctx.fillRect(sx-4, gy-8, 3, 3); ctx.fillRect(sx+2, gy-8, 3, 3);
          } else {
            // Partially crawling — torso + skull at angle
            ctx.save(); ctx.translate(sx, gy-10); ctx.rotate(-0.25);
            ctx.fillStyle='#d4c8a0';
            ctx.fillRect(-5, -18, 7, 24); // spine/torso
            ctx.beginPath(); ctx.ellipse(0, -22, 8, 7, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#1a1a10'; ctx.fillRect(-4, -25, 3, 3); ctx.fillRect(2, -25, 3, 3);
            ctx.fillStyle='#d4c8a0';
            ctx.fillRect(-14, -6, 14, 4); // arm reaching
            ctx.restore();
          }
        }
        break;
      }

      // ── ACT 3 : SNOW ─────────────────────────────────────────────────────────
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

        // Crashed airplane (nose-down, x=450)
        {
          const ax=450, ay=C.GROUND-50;
          ctx.save(); ctx.translate(ax, ay); ctx.rotate(0.5);
          ctx.fillStyle='#aabbcc';
          // Fuselage
          ctx.fillRect(-12, -70, 24, 80);
          // Nose cone
          ctx.beginPath(); ctx.moveTo(-12,-70); ctx.lineTo(0,-98); ctx.lineTo(12,-70); ctx.closePath(); ctx.fill();
          // Wing (crushed to one side)
          ctx.fillStyle='#889aaa';
          ctx.beginPath(); ctx.moveTo(-12,-30); ctx.lineTo(-70,-15); ctx.lineTo(-60,-5); ctx.lineTo(-12,-18); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(12,-30); ctx.lineTo(45,-20); ctx.lineTo(40,-10); ctx.lineTo(12,-18); ctx.closePath(); ctx.fill();
          // Tail fin
          ctx.fillStyle='#aabbcc';
          ctx.beginPath(); ctx.moveTo(-8,6); ctx.lineTo(-28,-10); ctx.lineTo(-6,-8); ctx.closePath(); ctx.fill();
          // Snow on top
          ctx.fillStyle='rgba(255,255,255,0.7)';
          ctx.fillRect(-11,-70,22,8);
          ctx.fillRect(-9,-55,18,5);
          // Windows (smashed)
          ctx.fillStyle='rgba(100,150,200,0.4)';
          for(let wi=0; wi<4; wi++) ctx.fillRect(-6,-62+wi*14, 12, 9);
          ctx.fillStyle='rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.moveTo(-5,-58); ctx.lineTo(4,-52); ctx.stroke(); // crack
          ctx.restore();

          // Smoke from crash site (animated)
          ctx.save();
          for(let s=0;s<6;s++){
            const phase=(T*0.0008+s*0.6)%1;
            const sy2=ay - 60 - phase*80;
            const sx2=ax + 10 + Math.sin(phase*4+s)*12;
            const sr=6+phase*18;
            ctx.globalAlpha=(0.35-phase*0.35)*0.7;
            ctx.fillStyle='#889988';
            ctx.beginPath(); ctx.arc(sx2, sy2, sr, 0, Math.PI*2); ctx.fill();
          }
          ctx.restore();
        }

        // Snowmobile 1 (x=700, tipped on side)
        {
          const smx=700;
          ctx.save(); ctx.translate(smx, C.GROUND-10); ctx.rotate(0.6);
          ctx.fillStyle='#cc3300';
          ctx.fillRect(-28,-12,56,12);
          ctx.fillStyle='#992200';
          ctx.fillRect(-28,-18,56,7);
          // windshield
          ctx.fillStyle='rgba(150,200,255,0.35)';
          ctx.beginPath(); ctx.moveTo(-10,-18); ctx.lineTo(-6,-30); ctx.lineTo(10,-30); ctx.lineTo(14,-18); ctx.closePath(); ctx.fill();
          // ski / track
          ctx.fillStyle='#222';
          ctx.fillRect(-30,0,60,6);
          ctx.fillRect(-20,-22,6,24); ctx.fillRect(14,-22,6,24);
          // snow splash
          ctx.fillStyle='rgba(230,240,255,0.7)';
          ctx.beginPath(); ctx.ellipse(0,4, 32, 8, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }

        // Snowmobile 2 (x=1550, nose into snowdrift)
        {
          const smx=1550;
          ctx.save(); ctx.translate(smx, C.GROUND-6); ctx.rotate(-0.35);
          ctx.fillStyle='#2255aa';
          ctx.fillRect(-28,-10,56,10);
          ctx.fillStyle='#1a3d88';
          ctx.fillRect(-28,-16,56,7);
          ctx.fillStyle='rgba(150,200,255,0.35)';
          ctx.beginPath(); ctx.moveTo(-12,-16); ctx.lineTo(-8,-26); ctx.lineTo(8,-26); ctx.lineTo(12,-16); ctx.closePath(); ctx.fill();
          ctx.fillStyle='#222';
          ctx.fillRect(-30,0,60,5);
          // snow piled on nose
          ctx.fillStyle='rgba(230,240,255,0.85)';
          ctx.beginPath(); ctx.ellipse(-22, -8, 14, 10, 0.4, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
        break;
      }

      // ── ACT 4 : CASTLE ───────────────────────────────────────────────────────
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

        // Angry mob at set intervals along the path
        // Each mob cluster: pitchfork-wielding figures + torches
        const mobPositions = [200, 550, 1100, 1700, 2100];
        const drawMobFigure = (mx, side) => {
          const bob = Math.sin(T*0.004 + mx*0.01) * 3;
          const anger = Math.sin(T*0.006 + mx*0.02); // arm raise oscillation
          ctx.save(); ctx.translate(mx, C.GROUND - 4 + bob);
          // Body
          ctx.fillStyle='#553322'; ctx.fillRect(-4,-30,8,18);
          // Head
          ctx.fillStyle='#C8906A'; ctx.fillRect(-4,-42,10,10);
          // Pitchfork / tool
          ctx.strokeStyle='#8B6914'; ctx.lineWidth=2;
          const armAng = side===1 ? (-0.8+anger*0.4) : (0.8-anger*0.4);
          ctx.save(); ctx.translate(side===1?5:-5, -32); ctx.rotate(armAng);
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-22); ctx.stroke();
          // Prongs
          ctx.beginPath(); ctx.moveTo(-3,-22); ctx.lineTo(-3,-26); ctx.stroke();
          ctx.beginPath(); ctx.moveTo( 0,-22); ctx.lineTo( 0,-27); ctx.stroke();
          ctx.beginPath(); ctx.moveTo( 3,-22); ctx.lineTo( 3,-26); ctx.stroke();
          ctx.restore();
          // Legs (marching)
          const legAngle = Math.sin(T*0.006 + mx*0.05)*12;
          ctx.fillStyle='#332210';
          ctx.save(); ctx.translate(-2,-12); ctx.rotate(legAngle*Math.PI/180);
          ctx.fillRect(-2,0,4,14); ctx.restore();
          ctx.save(); ctx.translate(2,-12); ctx.rotate(-legAngle*Math.PI/180);
          ctx.fillRect(-2,0,4,14); ctx.restore();
          // Angry expression
          ctx.fillStyle='#000'; ctx.fillRect(-3,-39,2,2); ctx.fillRect(2,-39,2,2);
          ctx.strokeStyle='#000'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(-3,-34); ctx.lineTo(3,-34); ctx.stroke(); // frown
          ctx.restore();
        };

        const drawTorch = (tx2) => {
          const flicker = 0.6+0.4*Math.sin(T*0.018+tx2);
          ctx.save(); ctx.translate(tx2, C.GROUND-10);
          // Handle
          ctx.strokeStyle='#6B4500'; ctx.lineWidth=3;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-32); ctx.stroke();
          // Flame
          ctx.globalAlpha=flicker;
          ctx.fillStyle='#FF8800';
          ctx.beginPath(); ctx.moveTo(-5,-32); ctx.lineTo(0,-46); ctx.lineTo(5,-32); ctx.closePath(); ctx.fill();
          ctx.fillStyle='#FFCC00';
          ctx.beginPath(); ctx.moveTo(-3,-32); ctx.lineTo(0,-42); ctx.lineTo(3,-32); ctx.closePath(); ctx.fill();
          ctx.fillStyle='#FFFFFF'; ctx.globalAlpha=flicker*0.5;
          ctx.beginPath(); ctx.moveTo(-1,-32); ctx.lineTo(0,-38); ctx.lineTo(1,-32); ctx.closePath(); ctx.fill();
          ctx.restore();
          // Smoke wisps
          ctx.save();
          for(let si=0;si<3;si++){
            const ph=(T*0.001+si*0.5)%1;
            ctx.globalAlpha=0.2-ph*0.2;
            ctx.fillStyle='#887766';
            ctx.beginPath(); ctx.arc(tx2+Math.sin(ph*5+si)*5, C.GROUND-46-ph*30, 3+ph*6, 0, Math.PI*2); ctx.fill();
          }
          ctx.restore();
        };

        for(const mp of mobPositions){
          // 3 figures per cluster
          drawMobFigure(mp-14, -1);
          drawMobFigure(mp,     1);
          drawMobFigure(mp+14,-1);
          // Torch between figures
          drawTorch(mp+28);
          // Angry shout bubbles (occasional)
          if(Math.floor(T/1200 + mp)%5 === 0){
            ctx.save(); ctx.globalAlpha=0.7;
            ctx.fillStyle='#fff'; ctx.strokeStyle='#884400'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.roundRect(mp-16,C.GROUND-68,32,12,3); ctx.fill(); ctx.stroke();
            ctx.fillStyle='#882200'; ctx.font='bold 7px Arial'; ctx.textAlign='center';
            const shouts=['GET THEM!','GRAB EM!','CHARGE!','ATTACK!','FORWARD!'];
            ctx.fillText(shouts[mp%shouts.length], mp, C.GROUND-59);
            ctx.restore();
          }
        }
        break;
      }

      // ── ACT 5 : TOWER / DIGITAL ──────────────────────────────────────────────
      case 'tower': {
        for(let i=0;i<8;i++){
          ctx.fillStyle=i%2===0?'#0d0d1a':'#080812';
          ctx.fillRect(i*300,0,300,C.GROUND);
        }
        ctx.fillStyle='#1a2a3a'; ctx.fillRect(1100,0,50,C.GROUND);
        ctx.fillStyle='#FF4400';
        const br=6+4*Math.sin(T*0.005);
        ctx.beginPath();ctx.arc(1125,18,br,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,68,0,0.1)';
        ctx.beginPath();ctx.arc(1125,18,br*3,0,Math.PI*2);ctx.fill();

        // Background lightning — 5 types at different intervals
        // Type 0: vertical bolt (every 2.3s)
        if(Math.floor(T/2300)%3 === 0 && (T%2300) < 180){
          const bx2 = 300 + ((Math.floor(T/2300)*317)%1600);
          const alpha = 1 - (T%2300)/180;
          ctx.save(); ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = '#AADDFF'; ctx.lineWidth = 2;
          ctx.shadowColor = '#88CCFF'; ctx.shadowBlur = 16;
          let ly = 0; let lx2 = bx2;
          ctx.beginPath(); ctx.moveTo(lx2, 0);
          while(ly < C.GROUND-20){ ly += 18+Math.random()*12; lx2 += (Math.random()-0.5)*20; ctx.lineTo(lx2, ly); }
          ctx.stroke();
          ctx.lineWidth=1; ctx.strokeStyle='#FFFFFF';
          ctx.beginPath(); ctx.moveTo(bx2,0); lx2=bx2; ly=0;
          while(ly<C.GROUND-20){ ly+=18+Math.random()*12; lx2+=(Math.random()-0.5)*20; ctx.lineTo(lx2,ly); }
          ctx.stroke();
          ctx.restore();
        }
        // Type 1: horizontal arc (every 3.7s)
        if(Math.floor(T/3700)%2 === 1 && (T%3700) < 140){
          const alpha2 = 1 - (T%3700)/140;
          const hy = 40 + ((Math.floor(T/3700)*113)%200);
          ctx.save(); ctx.globalAlpha = alpha2 * 0.7;
          ctx.strokeStyle = '#FFDD44'; ctx.lineWidth = 1.5; ctx.shadowColor='#FFAA00'; ctx.shadowBlur=10;
          ctx.beginPath(); ctx.moveTo(0, hy);
          let hx=0;
          while(hx < STORY_WORLD_W){ hx+=20+Math.random()*15; ctx.lineTo(hx, hy+(Math.random()-0.5)*16); }
          ctx.stroke();
          ctx.restore();
        }
        // Type 2: branching bolt (every 5s, bright white-blue)
        if(Math.floor(T/5000)%4 === 2 && (T%5000) < 220){
          const bx3 = 600 + ((Math.floor(T/5000)*557)%1000);
          const alpha3 = 1 - (T%5000)/220;
          ctx.save(); ctx.globalAlpha = alpha3;
          const drawBranch = (bx4, by4, angle, len, depth) => {
            if(depth===0||len<6) return;
            const ex=bx4+Math.cos(angle)*len, ey=by4+Math.sin(angle)*len;
            ctx.strokeStyle=depth>1?'#CCDDFF':'rgba(150,180,255,0.5)'; ctx.lineWidth=depth;
            ctx.shadowColor='#AACCFF'; ctx.shadowBlur=8*depth;
            ctx.beginPath(); ctx.moveTo(bx4,by4); ctx.lineTo(ex,ey); ctx.stroke();
            drawBranch(ex,ey,angle-0.4,len*0.65,depth-1);
            drawBranch(ex,ey,angle+0.3,len*0.55,depth-1);
          };
          drawBranch(bx3,0, Math.PI/2, 90, 3);
          ctx.restore();
        }
        // Type 3: flash (full screen dim flash, every 4.1s)
        if(Math.floor(T/4100)%3 === 0 && (T%4100) < 80){
          const fa = (1-(T%4100)/80)*0.18;
          ctx.save(); ctx.globalAlpha=fa; ctx.fillStyle='#AACCFF'; ctx.fillRect(0,0,STORY_WORLD_W,C.GROUND); ctx.restore();
        }
        // Type 4: glitchy horizontal scan line (every 1.6s)
        if(Math.floor(T/1600)%5 < 2 && (T%1600) < 100){
          const scanY = (Math.floor(T/1600)*97)%C.GROUND;
          const ga = (1-(T%1600)/100)*0.45;
          ctx.save(); ctx.globalAlpha=ga; ctx.fillStyle='#00FFFF';
          ctx.fillRect(0, scanY, STORY_WORLD_W, 2); ctx.restore();
        }
        break;
      }
    }
  }

  // NPC color palettes (object format matching Sprites.drawBoy/drawGirl signature)
  _npcColors(portrait) {
    switch (portrait) {
      case 'wendy':      return { shirt:'#FFFFFF', pants:'#335577', hair:'#5A3010', hairDark:'#3A1A00', hairType:'bun',      accessory:'glasses' };
      case 'biff':       return { shirt:'#CC9944', pants:'#5A3A00', hair:'#A07820', hairDark:'#6B5200', hairType:'straight',  accessory:'none' };
      case 'fluffkins':  return { shirt:'#2244AA', pants:'#1a2f88', hair:'#CCCCCC', hairDark:'#888888', hairType:'buzz',      accessory:'none' };
      case 'princesses': return { shirt:'#FF66BB', pants:'#CC3388', hair:'#FFD700', hairDark:'#DAA520', hairType:'long',      accessory:'none' };
      case 'everyone':   return { shirt:'#AAAAAA', pants:'#555555', hair:'#886644', hairDark:'#553322', hairType:'straight',  accessory:'none' };
      default:           return {};
    }
  }

  _drawGhost(ctx, player, ghostY, quip, col) {
    if (!player) return;
    const gx = player.x - this._camX;
    const gy = ghostY > 0 ? ghostY : player.y - 50;
    const bob = Math.sin(Date.now() * 0.002) * 6;
    ctx.save();
    // Ghostly tinted silhouette
    ctx.globalAlpha = 0.38 + 0.12 * Math.sin(Date.now() * 0.003);
    ctx.translate(gx, gy + bob);
    // Faint colour tint overlay
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -20, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Draw the player sprite at ghost position, tinted
    const savedX = player.x, savedY = player.y;
    player.y = gy + bob + this._camX * 0; // keep world coords for draw
    // We need to draw at screen-space; ctx is already translated by -camX
    player.x = savedX; // player.x is world-space, ctx already offset by -camX
    player.y = gy + bob;
    ctx.save(); ctx.globalAlpha = 0.38;
    player.draw(ctx, null);
    ctx.restore();
    player.x = savedX; player.y = savedY;

    // Speech bubble quip
    if (quip) {
      const bx = player.x - this._camX;
      const by = gy + bob - 30;
      const bw = Math.max(80, quip.length * 5.5 + 20);
      const bh = 22;
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx - bw/2, by - bh, bw, bh, 5); ctx.fill(); ctx.stroke();
      // tail
      ctx.beginPath(); ctx.moveTo(bx-5,by); ctx.lineTo(bx+5,by); ctx.lineTo(bx+1,by+10); ctx.closePath();
      ctx.fillStyle='#fff'; ctx.fill(); ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle = '#333'; ctx.font = 'italic 10px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(quip, bx, by - bh + 14);
      ctx.restore();
    }
  }

  _drawPlayerQuips(ctx) {
    const drawQuip = (text, player, timer, maxTimer, side) => {
      if (timer <= 0 || !player || !text) return;
      const alpha = Math.min(1, timer / 500);
      const bx = player.x - this._camX;
      const by = player.y - 78;
      const lines = text.split('\n');
      const bw = Math.max(100, lines.reduce((m,l) => Math.max(m, l.length * 6.5), 0) + 20);
      const bh = 14 + lines.length * 16;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = side === 1 ? C.COL.P1_HUD : C.COL.P2_HUD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx - bw/2, by - bh, bw, bh, 6);
      ctx.fill(); ctx.stroke();
      // Tail
      ctx.beginPath();
      ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); ctx.lineTo(bx + 2, by + 12);
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = side === 1 ? C.COL.P1_HUD : C.COL.P2_HUD;
      ctx.lineWidth = 2; ctx.stroke();
      // Text
      ctx.fillStyle = side === 1 ? '#1155AA' : '#AA5511';
      ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      lines.forEach((l, i) => ctx.fillText(l, bx, by - bh + 14 + i * 16));
      ctx.restore();
    };

    drawQuip(this._playerQuipText, this.p1, this._playerQuipTimer, 3200, 1);
    if (this.coop && this.p2) {
      // P2 quip shows with a 600ms delay (stagger) — represented by slightly shorter timer
      const p2shown = this._playerQuip2Timer < 2600;
      if (p2shown) drawQuip(this._playerQuip2Text, this.p2, this._playerQuip2Timer, 2600, 2);
    }
  }

  _drawSceneNpc(ctx) {
    const npc = this._sceneNpc;
    if (!npc) return;
    this._drawOneNpc(ctx, npc);

    // Prompt hint above NPC when player is nearby but hasn't talked yet
    if (!npc._talked && this.p1 && Math.abs(this.p1.x - npc.x) < 160) {
      const bx = npc.x - this._camX;
      const alpha = Math.min(1, (160 - Math.abs(this.p1.x - npc.x)) / 80);
      ctx.save();
      ctx.globalAlpha = alpha * (0.7 + 0.3 * Math.sin(Date.now() * 0.004));
      ctx.fillStyle = '#FFE86E';
      ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶ WALK CLOSE TO TALK', bx, npc.y - 80);
      ctx.restore();
    }
  }

  _drawOneNpc(ctx, npc) {
    ctx.save();
    const bob = Math.sin(Date.now() * 0.002 + npc.x * 0.01) * 2;
    const wobbleX = npc.wobble > 0 ? Math.sin(Date.now() * 0.04) * npc.wobble * 6 : 0;
    ctx.translate(npc.x + wobbleX, npc.y + bob);
    const colors = this._npcColors(npc.portrait);
    const dir = npc.dir || -1;
    const isGirl = npc.portrait === 'wendy' || npc.portrait === 'princesses';
    if (isGirl) Sprites.drawGirl(ctx, 0, 0, 'idle', dir, 0, false, colors);
    else        Sprites.drawBoy (ctx, 0, 0, 'idle', dir, 0, false, colors);

    // Biff is "hiding" behind a boulder — poorly
    if (npc.portrait === 'biff') {
      ctx.fillStyle = '#9B8360';
      ctx.beginPath(); ctx.ellipse(6, -16, 33, 22, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#B89E78';
      ctx.beginPath(); ctx.ellipse(-4, -24, 14, 9, -0.2, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#6B5330'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(6, -16, 33, 22, -0.1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -34); ctx.lineTo(8, -10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, -28); ctx.lineTo(18, -14); ctx.stroke();
      ctx.fillStyle = '#5A3D1A';
      ctx.fillRect(28, -8, 12, 6); ctx.fillRect(31, -4, 9, 4);
    }

    // Fluffkins NPC wears a cat costume — ears, whiskers, tail
    if (npc.portrait === 'fluffkins') {
      const furCol = '#FFCC88', earCol = '#FFAA66', innerEar = '#FF99BB';
      // Tail — curves behind and upward from lower back
      ctx.strokeStyle = furCol; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.bezierCurveTo(28, -10, 36, -40, 22, -52);
      ctx.stroke();
      ctx.strokeStyle = '#FFDDAA'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -18);
      ctx.bezierCurveTo(28, -10, 36, -40, 22, -52);
      ctx.stroke();
      // Ear base triangles on head (head top is ~y=-65)
      ctx.fillStyle = earCol;
      ctx.beginPath(); ctx.moveTo(-10, -64); ctx.lineTo(-6, -78); ctx.lineTo(2, -64); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(10, -64); ctx.lineTo(14, -78); ctx.lineTo(20, -64); ctx.closePath(); ctx.fill();
      // Inner ear
      ctx.fillStyle = innerEar;
      ctx.beginPath(); ctx.moveTo(-8, -65); ctx.lineTo(-6, -73); ctx.lineTo(0, -65); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(12, -65); ctx.lineTo(14, -73); ctx.lineTo(18, -65); ctx.closePath(); ctx.fill();
      // Whiskers
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-4, -54); ctx.lineTo(-18, -52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -51); ctx.lineTo(-18, -51); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -54); ctx.lineTo(26, -52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -51); ctx.lineTo(26, -51); ctx.stroke();
    }
    ctx.restore();

    // Reaction speech bubble
    if (npc.reactionTimer > 0) {
      const alpha = Math.min(1, npc.reactionTimer / 400);
      ctx.save();
      ctx.globalAlpha = alpha;
      const bx = npc.x - this._camX;
      const by = npc.y - 80;
      const lines = npc.reactionText.split('\n');
      const bw = 96, bh = 14 + lines.length * 16;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#FF6688'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx - bw/2, by - bh, bw, bh, 6);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); ctx.lineTo(bx + 2, by + 12);
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#FF6688'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#CC2255'; ctx.font = 'bold 11px Segoe UI, Arial, sans-serif'; ctx.textAlign = 'center';
      lines.forEach((l, i) => ctx.fillText(l, bx, by - bh + 14 + i * 16));
      ctx.restore();
    }
  }

  _drawSidescrollHUD(ctx) {
    const act = STORY_ACTS[this.actIndex];
    ctx.fillStyle='rgba(0,0,0,0.84)'; ctx.fillRect(0,0,C.W,48);

    // P1 HP
    ctx.textAlign='left';
    ctx.fillStyle=C.COL.P1_HUD; ctx.font='bold 11px Segoe UI, Arial, sans-serif';
    ctx.fillText('P1', 8, 14);
    this._drawHpPips(ctx, 8, 18, this.p1Hp, 5, C.COL.P1_HUD, this.p1Fallen);

    if (this.coop && this.p2) {
      ctx.fillStyle=C.COL.P2_HUD; ctx.font='bold 11px Segoe UI, Arial, sans-serif';
      ctx.textAlign='right'; ctx.fillText('P2', C.W-8, 14);
      this._drawHpPips(ctx, C.W-8-5*22, 18, this.p2Hp, 5, C.COL.P2_HUD, this.p2Fallen);
    }

    // Centre — boss bar or territory progress
    ctx.textAlign='center';
    const boss = this.enemies.find(e => e instanceof StoryBoss && e._awake);
    if (boss) {
      const bx = C.W/2 - 110, bw = 220;
      ctx.fillStyle = '#330000'; ctx.fillRect(bx, 27, bw, 11);
      ctx.fillStyle = '#FF2222'; ctx.fillRect(bx, 27, bw * (boss.hp / boss.maxHp), 11);
      ctx.strokeStyle = '#FF5555'; ctx.lineWidth = 1; ctx.strokeRect(bx, 27, bw, 11);
      ctx.fillStyle = '#FF6666'; ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
      ctx.fillText(boss.type.toUpperCase().replace(/_/g,' '), C.W/2, 36);
    } else {
      ctx.fillStyle = act.bg.accent; ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
      ctx.fillText(`${act.title} — ${act.zone}`, C.W/2, 14);
      // Territory progress bar
      const bossX = this._bossEnemy ? this._bossEnemy.x : 2200;
      const progress = Math.min(1, Math.max(0, (this.p1.x - 100) / (bossX - 200)));
      const pBW = 200, pBH = 6, pBX = C.W/2 - 100, pBY = 21;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(pBX, pBY, pBW, pBH);
      ctx.fillStyle = act.bg.accent; ctx.globalAlpha = 0.8;
      ctx.fillRect(pBX, pBY, pBW * progress, pBH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(pBX, pBY, pBW, pBH);
      const aliveRegular = this.enemies.filter(e => !(e instanceof StoryBoss)).length;
      ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillStyle = aliveRegular > 0 ? '#FFCC55' : '#88FF88';
      ctx.fillText(aliveRegular > 0 ? `${aliveRegular} enemies remaining` : '★ Find the boss!', C.W/2, 36);
    }

    ctx.fillStyle='rgba(255,255,255,0.09)'; ctx.font='11px Segoe UI, Arial, sans-serif';
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
      ctx.fillStyle='#FF4444'; ctx.font='bold 12px Segoe UI, Arial, sans-serif';
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
    const ls = this._levelState;
    const act = STORY_ACTS[this.actIndex];

    if (ls === 'act_clear') {
      ctx.fillStyle='rgba(0,0,0,0.78)'; ctx.fillRect(0,0,C.W,C.H);
      ctx.textAlign='center';
      ctx.shadowColor='#FFD700'; ctx.shadowBlur=26;
      ctx.fillStyle='#FFD700'; ctx.font='bold 38px Segoe UI, Arial, sans-serif';
      ctx.fillText('AREA CLEAR!', C.W/2, C.H/2-22);
      ctx.shadowBlur=0;
      ctx.fillStyle='#ccc'; ctx.font='15px Segoe UI, Arial, sans-serif';
      ctx.fillText('A survivor wants to speak with you…', C.W/2, C.H/2+16);
      ctx.fillStyle='#666'; ctx.font='12px Segoe UI, Arial, sans-serif';
      ctx.fillText('ENTER to continue', C.W/2, C.H/2+42);
    } else if (ls === 'game_over') {
      ctx.fillStyle='rgba(0,0,0,0.84)'; ctx.fillRect(0,0,C.W,C.H);
      ctx.textAlign='center';
      ctx.shadowColor='#FF3333'; ctx.shadowBlur=18;
      ctx.fillStyle='#FF3333'; ctx.font='bold 40px Segoe UI, Arial, sans-serif';
      ctx.fillText('GAME OVER', C.W/2, C.H/2-28);
      ctx.shadowBlur=0;
      ctx.fillStyle='#bbb'; ctx.font='14px Segoe UI, Arial, sans-serif';
      ctx.fillText(act.zone, C.W/2, C.H/2+12);
      ctx.fillStyle='rgba(180,80,80,0.9)'; ctx.font='13px Segoe UI, Arial, sans-serif';
      ctx.fillText('"Not like this… not here."', C.W/2, C.H/2+34);
      ctx.fillStyle='#555'; ctx.font='12px Segoe UI, Arial, sans-serif';
      ctx.fillText('ENTER to try again', C.W/2, C.H/2+58);
    }

    // Act intro banner
    if (this._introTimer > 0) {
      const t = Math.min(1, this._introTimer / 1800);
      ctx.fillStyle=`rgba(0,0,0,${t*0.68})`;
      ctx.fillRect(C.W/2-240, C.H/2-58, 480, 116);
      ctx.textAlign='center';
      ctx.fillStyle=`rgba(255,215,0,${t})`;
      ctx.font=`bold 24px Segoe UI, Arial, sans-serif`;
      ctx.fillText(act.title, C.W/2, C.H/2-20);
      ctx.fillStyle=`rgba(255,255,255,${t})`;
      ctx.font=`15px Segoe UI, Arial, sans-serif`;
      ctx.fillText(act.zone, C.W/2, C.H/2+8);
      ctx.fillStyle=`rgba(200,140,60,${t*0.9})`;
      ctx.font=`12px Segoe UI, Arial, sans-serif`;
      ctx.fillText(`ENEMY TYPE: ${act.enemyCategory}`, C.W/2, C.H/2+30);
    }

    // Battle cry banner
    if (this._battleCryTimer > 0 && this._introTimer <= 0) {
      const t = Math.min(1, this._battleCryTimer / 800);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFDD00'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#FFDD00'; ctx.font = 'bold 26px Segoe UI, Arial, sans-serif';
      ctx.fillText(this._battleCryText, C.W/2, C.H/2);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Boss encounter intro — pageable dialogue
    if (this._bossDlgTimer > 0 && this._bossEnemy && this._bossIntroLines.length > 0) {
      const bossNames = {
        patient_zero:   'PATIENT ZERO',
        stone_guardian: 'THE STONE GUARDIAN',
        mech_fluffkins: 'MECH FLUFFKINS',
        iron_champion:  'IRON CHAMPION',
        nexus_core:     'NEXUS CORE',
      };
      const idx = Math.min(this._bossIntroIdx, this._bossIntroLines.length - 1);
      const lineText = this._bossIntroLines[idx] || '';
      const isNexus = this._bossEnemy.type === 'nexus_core';
      ctx.save();
      ctx.fillStyle = isNexus ? 'rgba(0,10,40,0.92)' : 'rgba(60,0,0,0.88)';
      ctx.fillRect(C.W/2-260, C.H/2-80, 520, 160);
      ctx.strokeStyle = isNexus ? '#00DDFF' : '#FF4400';
      ctx.lineWidth = 1.5; ctx.strokeRect(C.W/2-260, C.H/2-80, 520, 160);
      ctx.textAlign = 'center';
      ctx.shadowColor = isNexus ? '#00AAFF' : '#FF2200'; ctx.shadowBlur = 18;
      ctx.fillStyle = isNexus ? '#00DDFF' : '#FF4400';
      ctx.font = 'bold 14px Segoe UI, Arial, sans-serif';
      ctx.fillText('⚠ BOSS ENCOUNTER ⚠', C.W/2, C.H/2 - 52);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px Segoe UI, Arial, sans-serif';
      ctx.fillText(bossNames[this._bossEnemy.type] || this._bossEnemy.type.toUpperCase().replace(/_/g,' '), C.W/2, C.H/2 - 26);
      ctx.fillStyle = isNexus ? '#88EEFF' : 'rgba(255,210,160,0.95)';
      ctx.font = 'italic 14px Segoe UI, Arial, sans-serif';
      // Wrap long lines
      const maxW = 480;
      const words = lineText.split(' ');
      let row = '', rows = [];
      for (const word of words) {
        const test = row ? row + ' ' + word : word;
        if (ctx.measureText(test).width > maxW) { rows.push(row); row = word; }
        else row = test;
      }
      if (row) rows.push(row);
      const lineH = 20;
      const startY = C.H/2 + 4 - ((rows.length - 1) * lineH) / 2;
      rows.forEach((r, i) => ctx.fillText(r, C.W/2, startY + i * lineH));
      // Progress dots + prompt
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '11px Segoe UI, Arial, sans-serif';
      const total = this._bossIntroLines.length;
      const dotsX = C.W/2 - (total * 10) / 2;
      for (let i = 0; i < total; i++) {
        ctx.fillStyle = i === idx ? '#FFD700' : 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(dotsX + i * 10 + 5, C.H/2 + 56, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.fillText(idx < total - 1 ? 'CATCH / ENTER to continue' : 'CATCH / ENTER to fight!', C.W/2, C.H/2 + 70);
      ctx.restore();
    }
  }

  // ── Dialogue ────────────────────────────────────────────────────────────────
  _drawDialogue(ctx) {
    const act = STORY_ACTS[this.actIndex];

    // ── Background ──────────────────────────────────────────────────
    const g = ctx.createLinearGradient(0, 0, 0, C.GROUND);
    g.addColorStop(0, act.bg.sky); g.addColorStop(1, act.bg.mid);
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);
    ctx.fillStyle = act.bg.ground;
    ctx.fillRect(0, C.GROUND, C.W, C.H - C.GROUND);
    ctx.save();
    ctx.translate(-this._camX * 0.5, 0);
    this._drawScenery(ctx, act.id);
    ctx.restore();

    // ── Phase label (subtle, top-right) ─────────────────────────────
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillText(this._dlgPhase === 'intro' ? 'PRE-BATTLE' : 'POST-BATTLE', C.W - 12, 14);

    // ── Wrap text into rows ─────────────────────────────────────────
    ctx.font = '13px Segoe UI, Arial, sans-serif';
    const line = this._dlgLines[this._dlgLine] || '';
    const bMaxW = 480;
    const bPad  = 14;
    let row = '', rows = [];
    for (const word of line.split(' ')) {
      const test = row ? row + ' ' + word : word;
      if (ctx.measureText(test).width > bMaxW - bPad * 2) { rows.push(row); row = word; }
      else row = test;
    }
    rows.push(row);

    // ── Comic speech bubble ─────────────────────────────────────────
    const lineH = 21;
    const bW    = bMaxW;
    const bH    = 30 + rows.length * lineH + bPad; // 30 = name header area
    const bX    = (C.W - bW) / 2;
    const bY    = 18;
    const cr    = 10; // corner radius
    // Tail anchored near bottom-right of bubble, pointing toward NPC avatar
    const tX = bX + bW - 64;
    const tY = bY + bH;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(bX + cr, bY);
    ctx.lineTo(bX + bW - cr, bY);
    ctx.quadraticCurveTo(bX + bW, bY, bX + bW, bY + cr);
    ctx.lineTo(bX + bW, tY);
    ctx.lineTo(tX + 14, tY);
    ctx.lineTo(tX + 6,  tY + 32); // tail tip
    ctx.lineTo(tX - 6,  tY);
    ctx.lineTo(bX + cr, tY);
    ctx.quadraticCurveTo(bX, tY, bX, tY - cr);
    ctx.lineTo(bX, bY + cr);
    ctx.quadraticCurveTo(bX, bY, bX + cr, bY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.strokeStyle = this._dlgCol;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // NPC name in bubble header
    ctx.fillStyle = this._dlgCol;
    ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this._dlgName, bX + bPad, bY + 18);

    // Thin divider under name
    ctx.fillStyle = this._dlgCol;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(bX + bPad, bY + 22, bW - bPad * 2, 1);
    ctx.globalAlpha = 1;

    // Page counter (top-right of bubble)
    ctx.fillStyle = '#888';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${this._dlgLine + 1} / ${this._dlgLines.length}`, bX + bW - bPad, bY + 17);

    // Dialogue text
    ctx.fillStyle = '#1a1a2e';
    ctx.font = '13px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'left';
    rows.forEach((r2, i) => ctx.fillText(r2, bX + bPad, bY + 36 + i * lineH));

    // ENTER prompt (bottom-right of bubble, flickering)
    const adv  = 0.5 + 0.5 * Math.sin(Date.now() / 320);
    const last = this._dlgLine >= this._dlgLines.length - 1;
    ctx.globalAlpha = adv;
    ctx.fillStyle = this._dlgCol;
    ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(last ? 'ENTER — done' : 'ENTER — next', bX + bW - bPad, bY + bH - 7);
    ctx.globalAlpha = 1;

    // ── Characters standing in the arena ────────────────────────────
    // Draw player and NPC as actual sprites in the scene, at 2× scale
    const groundY = C.GROUND;
    ctx.save();
    ctx.translate(200, groundY);
    ctx.scale(2, 2);
    const _p1Name = this.p1 && this.p1.charName;
    const p1Colors = this.p1 && this.p1.charColors;
    if (_p1Name === 'Lucy') Sprites.drawGirl(ctx, 0, 0, 'idle', 1, 0, false, p1Colors);
    else Sprites.drawBoy(ctx, 0, 0, 'idle', 1, 0, false, p1Colors);
    ctx.restore();

    ctx.save();
    ctx.translate(C.W - 200, groundY);
    ctx.scale(2, 2);
    this._drawDlgNpcArena(ctx, act.npc.portrait);
    ctx.restore();

  }

  // ── NPC dialogue avatar dispatcher (comic portrait) ─────────────────────────
  _drawDlgNpc(ctx, portrait, x, y) {
    ctx.save();
    ctx.translate(x, y);
    switch (portrait) {
      case 'wendy':      this._comicPortraitWendy(ctx);      break;
      case 'biff':       this._comicPortraitBiff(ctx);        break;
      case 'fluffkins':  this._comicPortraitFluffkins(ctx);   break;
      case 'princesses': this._comicPortraitPrincesses(ctx);  break;
      case 'everyone':   this._comicPortraitEveryone(ctx);    break;
      default:           Sprites.drawBoy(ctx, 0, 0, 'idle', -1, 0, false); break;
    }
    ctx.restore();
  }

  // ── NPC arena sprite dispatcher (full-body, drawn at 0,0 already scaled) ────
  _drawDlgNpcArena(ctx, portrait) {
    const colors = this._npcColors(portrait);
    switch (portrait) {
      case 'wendy':
      case 'princesses':
        Sprites.drawGirl(ctx, 0, 0, 'idle', -1, 0, false, colors);
        break;
      case 'everyone':
        ctx.save(); ctx.scale(0.65, 0.65);
        Sprites.drawBoy (ctx, -28, 0, 'idle', -1, 0, false, { shirt:'#88CC88', pants:'#335533', hair:'#553311', hairDark:'#331100', hairType:'straight' });
        Sprites.drawGirl(ctx,   0, 0, 'idle', -1, 0, false, { shirt:'#FFFFFF', pants:'#335577', hair:'#5A3010', hairDark:'#3A1A00', hairType:'bun', accessory:'glasses' });
        Sprites.drawBoy (ctx,  28, 0, 'idle', -1, 0, false, { shirt:'#2244AA', pants:'#1a2f88', hair:'#CCCCCC', hairDark:'#888888', hairType:'buzz' });
        ctx.restore();
        break;
      default:
        Sprites.drawBoy(ctx, 0, 0, 'idle', -1, 0, false, colors);
    }
  }

  // ── Comic portrait shared helper ─────────────────────────────────────────────
  // Draws a crisp anime-style face portrait centered at (cx, baseY-panelH/2)
  // baseY = feet position, portrait panel is ~70px tall
  _drawComicPanel(ctx, cx, baseY, drawFn) {
    const pw = 58, ph = 70;
    const px = cx - pw / 2, py = baseY - ph;
    // Panel drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 5); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    // Clip to panel
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 5); ctx.clip();
    // Background gradient (panel bg)
    const bg = ctx.createLinearGradient(px, py, px, py + ph);
    bg.addColorStop(0, '#e8f0ff'); bg.addColorStop(1, '#c8d8f8');
    ctx.fillStyle = bg; ctx.fillRect(px, py, pw, ph);
    // Call the character-specific drawing fn (coordinate origin = cx, baseY)
    drawFn(ctx, cx, baseY);
    ctx.restore();
    // Panel border
    ctx.save();
    ctx.strokeStyle = '#1a1a3e'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 5); ctx.stroke();
    ctx.restore();
  }

  // ── Anime-style eye helper ────────────────────────────────────────────────────
  _drawAnimeEye(ctx, x, y, w, h, irisCol) {
    // White sclera
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI*2); ctx.fill();
    // Iris
    ctx.fillStyle = irisCol;
    ctx.beginPath(); ctx.ellipse(x, y, w*0.72, h*0.85, 0, 0, Math.PI*2); ctx.fill();
    // Pupil
    ctx.fillStyle = '#0d0d1a';
    ctx.beginPath(); ctx.ellipse(x, y+1, w*0.38, h*0.55, 0, 0, Math.PI*2); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(x - w*0.22, y - h*0.28, w*0.20, h*0.22, 0, 0, Math.PI*2); ctx.fill();
    // Outline
    ctx.strokeStyle = '#1a1a3e'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI*2); ctx.stroke();
  }

  // ── Player portrait: Jaco ─────────────────────────────────────────────────────
  _drawComicPortraitJaco(ctx, cx, baseY) {
    this._drawComicPanel(ctx, cx, baseY, (c, x, y) => {
      // Shoulders / body
      c.fillStyle = '#3366CC';
      c.fillRect(x - 22, y - 28, 44, 28);
      // White collar stripe
      c.fillStyle = '#fff';
      c.fillRect(x - 8, y - 28, 16, 6);
      // Neck
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(x, y - 32, 6, 8, 0, 0, Math.PI*2); c.fill();
      // Head
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(x, y - 46, 14, 16, 0, 0, Math.PI*2); c.fill();
      c.strokeStyle = '#e0a090'; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(x, y - 46, 14, 16, 0, 0, Math.PI*2); c.stroke();
      // Hair (dark navy, swept forward)
      c.fillStyle = '#1a2255';
      c.beginPath();
      c.moveTo(x - 14, y - 50);
      c.bezierCurveTo(x - 16, y - 68, x + 10, y - 70, x + 14, y - 56);
      c.lineTo(x + 12, y - 48);
      c.bezierCurveTo(x + 6, y - 52, x - 4, y - 64, x - 10, y - 50);
      c.closePath(); c.fill();
      // Side hair / bangs
      c.beginPath(); c.moveTo(x - 8, y - 62); c.bezierCurveTo(x - 16, y - 56, x - 14, y - 44, x - 13, y - 44);
      c.lineTo(x - 14, y - 50); c.closePath(); c.fill();
      // Ears
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(x - 14, y - 46, 3.5, 5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(x + 14, y - 46, 3.5, 5, 0, 0, Math.PI*2); c.fill();
      // Eyes (anime — blue iris)
      this._drawAnimeEye(c, x - 5, y - 46, 4.5, 5.5, '#2255BB');
      this._drawAnimeEye(c, x + 5, y - 46, 4.5, 5.5, '#2255BB');
      // Eyebrows
      c.strokeStyle = '#1a2255'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x - 8, y - 53); c.lineTo(x - 2.5, y - 52); c.stroke();
      c.beginPath(); c.moveTo(x + 2.5, y - 52); c.lineTo(x + 8, y - 53); c.stroke();
      // Nose (simple dot)
      c.fillStyle = '#d4967a';
      c.beginPath(); c.ellipse(x, y - 41, 1.5, 1.2, 0, 0, Math.PI*2); c.fill();
      // Smile
      c.strokeStyle = '#c07060'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(x, y - 37, 4.5, 0.1, Math.PI - 0.1); c.stroke();
      // Blush
      c.fillStyle = 'rgba(255,140,140,0.30)';
      c.beginPath(); c.ellipse(x - 9, y - 42, 4, 2.5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(x + 9, y - 42, 4, 2.5, 0, 0, Math.PI*2); c.fill();
    });
  }

  // ── Player portrait: Lucy ─────────────────────────────────────────────────────
  _drawComicPortraitLucy(ctx, cx, baseY) {
    this._drawComicPanel(ctx, cx, baseY, (c, x, y) => {
      // Shoulders / body (red)
      c.fillStyle = '#CC3300';
      c.fillRect(x - 22, y - 28, 44, 28);
      // Neck
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(x, y - 32, 6, 8, 0, 0, Math.PI*2); c.fill();
      // Head
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(x, y - 46, 14, 16, 0, 0, Math.PI*2); c.fill();
      c.strokeStyle = '#e0a090'; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(x, y - 46, 14, 16, 0, 0, Math.PI*2); c.stroke();
      // Hair — fiery auburn swept side
      c.fillStyle = '#882200';
      c.beginPath();
      c.moveTo(x - 14, y - 48);
      c.bezierCurveTo(x - 18, y - 70, x + 4, y - 72, x + 18, y - 58);
      c.lineTo(x + 16, y - 48);
      c.bezierCurveTo(x + 8, y - 54, x + 0, y - 66, x - 10, y - 50);
      c.closePath(); c.fill();
      c.fillStyle = '#CC4400';
      c.beginPath();
      c.moveTo(x - 14, y - 58);
      c.bezierCurveTo(x - 4, y - 70, x + 16, y - 60, x + 18, y - 52);
      c.bezierCurveTo(x + 6, y - 62, x - 4, y - 66, x - 10, y - 56);
      c.closePath(); c.fill();
      // Ears
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(x - 14, y - 46, 3.5, 5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(x + 14, y - 46, 3.5, 5, 0, 0, Math.PI*2); c.fill();
      // Eyes (anime — warm brown)
      this._drawAnimeEye(c, x - 5, y - 47, 4.5, 5.5, '#884422');
      this._drawAnimeEye(c, x + 5, y - 47, 4.5, 5.5, '#884422');
      // Determined eyebrows (slight angle)
      c.strokeStyle = '#553322'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x - 9, y - 55); c.lineTo(x - 2.5, y - 54); c.stroke();
      c.beginPath(); c.moveTo(x + 2.5, y - 54); c.lineTo(x + 9, y - 55); c.stroke();
      // Nose
      c.fillStyle = '#d4967a';
      c.beginPath(); c.ellipse(x, y - 41, 1.5, 1.2, 0, 0, Math.PI*2); c.fill();
      // Smirk
      c.strokeStyle = '#c07060'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x - 3, y - 36); c.quadraticCurveTo(x + 1, y - 33, x + 5, y - 35); c.stroke();
      // Blush (subtle)
      c.fillStyle = 'rgba(255,120,100,0.25)';
      c.beginPath(); c.ellipse(x - 9, y - 43, 4, 2.5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(x + 9, y - 43, 4, 2.5, 0, 0, Math.PI*2); c.fill();
    });
  }

  // ── Dr. Wendy — comic portrait: lab-coat scientist with glasses ───────────────
  _comicPortraitWendy(ctx) {
    const x = 0, y = 0;
    this._drawComicPanel(ctx, x, y, (c, cx, cy) => {
      // Lab coat shoulders
      c.fillStyle = '#E8F0FF';
      c.fillRect(cx - 22, cy - 28, 44, 28);
      c.fillStyle = '#66CCBB';
      c.fillRect(cx - 8, cy - 28, 16, 8);
      // Neck
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(cx, cy - 32, 6, 8, 0, 0, Math.PI*2); c.fill();
      // Head
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(cx, cy - 47, 13, 15, 0, 0, Math.PI*2); c.fill();
      // Brown hair (bun on top)
      c.fillStyle = '#7A3810';
      c.beginPath(); c.ellipse(cx, cy - 58, 13, 8, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx + 3, cy - 64, 7, 7, 0, 0, Math.PI*2); c.fill(); // bun
      // Ears
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(cx - 13, cy - 47, 3, 4.5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx + 13, cy - 47, 3, 4.5, 0, 0, Math.PI*2); c.fill();
      // Eyes (anime — green iris)
      this._drawAnimeEye(c, cx - 5, cy - 48, 4, 5, '#338866');
      this._drawAnimeEye(c, cx + 5, cy - 48, 4, 5, '#338866');
      // Glasses
      c.strokeStyle = '#558888'; c.lineWidth = 1.3;
      c.beginPath(); c.roundRect(cx - 10.5, cy - 53, 8, 9, 2); c.stroke();
      c.beginPath(); c.roundRect(cx + 2.5, cy - 53, 8, 9, 2); c.stroke();
      c.beginPath(); c.moveTo(cx - 2.5, cy - 49); c.lineTo(cx + 2.5, cy - 49); c.stroke();
      // Eyebrows
      c.strokeStyle = '#553311'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(cx - 8.5, cy - 53.5); c.lineTo(cx - 2, cy - 53); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, cy - 53); c.lineTo(cx + 8.5, cy - 53.5); c.stroke();
      // Nose
      c.fillStyle = '#d4967a';
      c.beginPath(); c.ellipse(cx, cy - 43, 1.5, 1.2, 0, 0, Math.PI*2); c.fill();
      // Friendly smile
      c.strokeStyle = '#c07060'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(cx, cy - 38, 4, 0.15, Math.PI - 0.15); c.stroke();
    });
  }

  // ── Prof. Biff — comic portrait: explorer with hat and mustache ───────────────
  _comicPortraitBiff(ctx) {
    const x = 0, y = 0;
    this._drawComicPanel(ctx, x, y, (c, cx, cy) => {
      // Khaki shirt
      c.fillStyle = '#CC9944';
      c.fillRect(cx - 22, cy - 28, 44, 28);
      // Neck
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(cx, cy - 32, 6, 8, 0, 0, Math.PI*2); c.fill();
      // Head
      c.fillStyle = '#FDBCB4';
      c.beginPath(); c.ellipse(cx, cy - 47, 13, 15, 0, 0, Math.PI*2); c.fill();
      // Hat brim
      c.fillStyle = '#8B6914';
      c.beginPath(); c.ellipse(cx, cy - 60, 18, 4, 0, 0, Math.PI*2); c.fill();
      // Hat crown
      c.fillStyle = '#A07820';
      c.beginPath(); c.roundRect(cx - 11, cy - 74, 22, 16, 3); c.fill();
      c.fillStyle = '#C09030';
      c.fillRect(cx - 11, cy - 62, 22, 4);
      // Sideburns
      c.fillStyle = '#A07820';
      c.beginPath(); c.ellipse(cx - 13, cy - 51, 3, 5, 0, 0, Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(cx + 13, cy - 51, 3, 5, 0, 0, Math.PI*2); c.fill();
      // Eyes (anime — brown)
      this._drawAnimeEye(c, cx - 5, cy - 48, 4, 5, '#663300');
      this._drawAnimeEye(c, cx + 5, cy - 48, 4, 5, '#663300');
      // Thick eyebrows
      c.strokeStyle = '#7A5010'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(cx - 9, cy - 54); c.lineTo(cx - 2, cy - 53); c.stroke();
      c.beginPath(); c.moveTo(cx + 2, cy - 53); c.lineTo(cx + 9, cy - 54); c.stroke();
      // Nose (bigger, manly)
      c.fillStyle = '#d4967a';
      c.beginPath(); c.ellipse(cx, cy - 43, 2.5, 2, 0, 0, Math.PI*2); c.fill();
      // Big mustache
      c.fillStyle = '#A07820';
      c.beginPath();
      c.moveTo(cx - 8, cy - 39);
      c.bezierCurveTo(cx - 9, cy - 34, cx - 3, cy - 34, cx, cy - 37);
      c.bezierCurveTo(cx + 3, cy - 34, cx + 9, cy - 34, cx + 8, cy - 39);
      c.quadraticCurveTo(cx, cy - 36, cx - 8, cy - 39);
      c.closePath(); c.fill();
    });
  }

  // ── Gen. Fluffkins — comic portrait: military cat ────────────────────────────
  _comicPortraitFluffkins(ctx) {
    const x = 0, y = 0;
    this._drawComicPanel(ctx, x, y, (c, cx, cy) => {
      // Navy uniform
      c.fillStyle = '#2244AA';
      c.fillRect(cx - 22, cy - 28, 44, 28);
      // Gold medal
      c.fillStyle = '#FFD700';
      c.beginPath(); c.arc(cx, cy - 20, 5, 0, Math.PI*2); c.fill();
      c.fillStyle = '#FFEE80';
      c.beginPath(); c.arc(cx, cy - 20, 3, 0, Math.PI*2); c.fill();
      // Grey fur head
      c.fillStyle = '#CCCCCC';
      c.beginPath(); c.ellipse(cx, cy - 46, 14, 16, 0, 0, Math.PI*2); c.fill();
      // Inner lighter fur
      c.fillStyle = '#EEEEEE';
      c.beginPath(); c.ellipse(cx, cy - 44, 9, 11, 0, 0, Math.PI*2); c.fill();
      // Ears (pointy cat ears)
      c.fillStyle = '#AAAAAA';
      c.beginPath(); c.moveTo(cx - 14, cy - 55); c.lineTo(cx - 8, cy - 68); c.lineTo(cx - 4, cy - 56); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(cx + 4, cy - 56); c.lineTo(cx + 8, cy - 68); c.lineTo(cx + 14, cy - 55); c.closePath(); c.fill();
      // Inner ear
      c.fillStyle = '#FFAAAA';
      c.beginPath(); c.moveTo(cx - 12, cy - 57); c.lineTo(cx - 8, cy - 65); c.lineTo(cx - 6, cy - 57); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(cx + 6, cy - 57); c.lineTo(cx + 8, cy - 65); c.lineTo(cx + 12, cy - 57); c.closePath(); c.fill();
      // Cat eyes (anime — vertical slit, green)
      this._drawAnimeEye(c, cx - 5, cy - 47, 4, 5.5, '#44AA55');
      this._drawAnimeEye(c, cx + 5, cy - 47, 4, 5.5, '#44AA55');
      // Cat nose
      c.fillStyle = '#FFAAAA';
      c.beginPath(); c.moveTo(cx, cy - 41); c.lineTo(cx - 2.5, cy - 38); c.lineTo(cx + 2.5, cy - 38); c.closePath(); c.fill();
      // Mouth
      c.strokeStyle = '#888888'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx, cy - 38); c.lineTo(cx - 3, cy - 35); c.stroke();
      c.beginPath(); c.moveTo(cx, cy - 38); c.lineTo(cx + 3, cy - 35); c.stroke();
      // Whiskers
      c.strokeStyle = 'rgba(100,100,100,0.7)'; c.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) {
        const wy = cy - 40 + i * 2;
        c.beginPath(); c.moveTo(cx - 4, wy); c.lineTo(cx - 16, wy - i * 0.5); c.stroke();
        c.beginPath(); c.moveTo(cx + 4, wy); c.lineTo(cx + 16, wy - i * 0.5); c.stroke();
      }
    });
  }

  // ── Princesses Dot & Val — comic portrait (two faces side by side) ────────────
  _comicPortraitPrincesses(ctx) {
    const x = 0, y = 0;
    this._drawComicPanel(ctx, x, y, (c, cx, cy) => {
      // Two small faces
      const drawFace = (ox, hairCol) => {
        // Dress top
        c.fillStyle = '#FF66BB';
        c.fillRect(cx + ox - 12, cy - 28, 24, 28);
        // Head
        c.fillStyle = '#FDBCB4';
        c.beginPath(); c.ellipse(cx + ox, cy - 46, 10, 12, 0, 0, Math.PI*2); c.fill();
        // Crown
        c.fillStyle = '#FFD700';
        c.beginPath(); c.roundRect(cx + ox - 8, cy - 57, 16, 5, 2); c.fill();
        c.fillStyle = '#FFD700';
        // Spires
        [[0, 6], [-5, 4], [5, 4]].forEach(([dx, h]) => {
          c.fillRect(cx + ox + dx - 1.5, cy - 57 - h, 3, h);
        });
        // Hair
        c.fillStyle = hairCol;
        c.beginPath(); c.ellipse(cx + ox, cy - 53, 10, 5, 0, 0, Math.PI*2); c.fill();
        // Eyes (smaller for chibi side-by-side)
        this._drawAnimeEye(c, cx + ox - 3.5, cy - 47, 3, 3.8, '#883399');
        this._drawAnimeEye(c, cx + ox + 3.5, cy - 47, 3, 3.8, '#883399');
        // Blush
        c.fillStyle = 'rgba(255,150,180,0.35)';
        c.beginPath(); c.ellipse(cx + ox - 7, cy - 43, 3, 1.8, 0, 0, Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(cx + ox + 7, cy - 43, 3, 1.8, 0, 0, Math.PI*2); c.fill();
        // Smile
        c.strokeStyle = '#cc6699'; c.lineWidth = 0.9;
        c.beginPath(); c.arc(cx + ox, cy - 39.5, 3, 0.2, Math.PI - 0.2); c.stroke();
      };
      drawFace(-12, '#FFD700');
      drawFace( 12, '#FF8844');
    });
  }

  // ── All Survivors — comic portrait: three tiny cheering faces ─────────────────
  _comicPortraitEveryone(ctx) {
    const x = 0, y = 0;
    this._drawComicPanel(ctx, x, y, (c, cx, cy) => {
      const faces = [
        { ox: -17, skin: '#FDBCB4', shirt: '#88CC88', hair: '#553311', eye: '#227722' },
        { ox:   0, skin: '#FDBCB4', shirt: '#DDAA44', hair: '#221100', eye: '#885522' },
        { ox:  17, skin: '#D4A0C4', shirt: '#8888FF', hair: '#220044', eye: '#6644BB' },
      ];
      for (const f of faces) {
        // Shirt
        c.fillStyle = f.shirt;
        c.fillRect(cx + f.ox - 10, cy - 26, 20, 26);
        // Head
        c.fillStyle = f.skin;
        c.beginPath(); c.ellipse(cx + f.ox, cy - 39, 9, 10, 0, 0, Math.PI*2); c.fill();
        // Hair
        c.fillStyle = f.hair;
        c.beginPath(); c.ellipse(cx + f.ox, cy - 46, 9, 5, 0, 0, Math.PI*2); c.fill();
        // Eyes
        this._drawAnimeEye(c, cx + f.ox - 3, cy - 40, 2.8, 3.5, f.eye);
        this._drawAnimeEye(c, cx + f.ox + 3, cy - 40, 2.8, 3.5, f.eye);
        // Happy smile
        c.strokeStyle = '#c07060'; c.lineWidth = 1;
        c.beginPath(); c.arc(cx + f.ox, cy - 33, 3.5, 0.1, Math.PI - 0.1); c.stroke();
      }
      // Cheer stars
      c.fillStyle = '#FFD700';
      [[cx - 24, cy - 60], [cx, cy - 65], [cx + 24, cy - 60]].forEach(([sx, sy]) => {
        c.save(); c.translate(sx, sy);
        c.font = 'bold 9px Segoe UI Emoji, Arial'; c.textAlign = 'center';
        c.fillText('★', 0, 3);
        c.restore();
      });
    });
  }
}
