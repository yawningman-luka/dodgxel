// ── Horde mode: wave-based co-op survival ────────────────────────────────────

const HORDE_WAVES = [
  { label: 'ZOMBIES',          spawnInterval: 1500, enemies: [{ type: 'zombie',      count: 6  }] },
  { label: 'MORE ZOMBIES',     spawnInterval: 1200, enemies: [{ type: 'zombie',      count: 9  }] },
  { label: 'FAST ZOMBIES',     spawnInterval: 1000, enemies: [{ type: 'fast_zombie', count: 6  }] },
  { label: 'MIXED HORDE',      spawnInterval: 950,  enemies: [{ type: 'fast_zombie', count: 4  }, { type: 'zombie',      count: 4 }] },
  { label: 'NINJAS',           spawnInterval: 950,  enemies: [{ type: 'ninja',       count: 5  }] },
  { label: 'NINJAS + ZOMBIES', spawnInterval: 900,  enemies: [{ type: 'ninja',       count: 4  }, { type: 'zombie',      count: 5 }] },
  { label: 'DINOSAURS',        spawnInterval: 1200, enemies: [{ type: 'dino',        count: 4  }, { type: 'ninja',       count: 3 }] },
  { label: 'HEAVY ASSAULT',    spawnInterval: 1000, enemies: [{ type: 'dino',        count: 5  }, { type: 'ninja',       count: 3 }] },
  { label: 'SPAGHETTI CHAOS',  spawnInterval: 1000, enemies: [{ type: 'fsm',         count: 3  }, { type: 'ninja',       count: 4 }] },
  { label: 'EVERYTHING',       spawnInterval: 850,  enemies: [{ type: 'fsm',         count: 3  }, { type: 'dino',        count: 3 }, { type: 'ninja', count: 4 }] },
];

const ENEMY_DEFS = {
  zombie:      { speed: 0.65, hp: 1, w: 20, h: 44, throwInterval: 3200, throwSpeed: 3.5, color: '#4A8A3C', pants: '#3A2A1A' },
  fast_zombie: { speed: 1.75, hp: 1, w: 20, h: 44, throwInterval: 2000, throwSpeed: 5.0, color: '#3A7A5C', pants: '#4A3A7A' },
  ninja:       { speed: 2.0,  hp: 1, w: 16, h: 44, throwInterval: 1300, throwSpeed: 7.0, color: '#181818', pants: '#101010' },
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
    const _worldW = this.worldW || C.W;
    if (this.x < -40 || this.x > _worldW + 40) { this.dead = true; return; }
    if (this.y + C.BALL_R >= C.GROUND) {
      this.y = C.GROUND - C.BALL_R;
      this.groundBounces++;
      if (this.groundBounces >= 5) { this.dead = true; return; }
      this.vy = -Math.abs(this.vy) * 0.55; this.vx *= 0.80;
      if (Math.abs(this.vy) < 0.8) this.dead = true; // dead ball — too slow to bounce
    }
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    if (this.rock || this.bigRock) {
      const r = C.BALL_R * (this.bigRock ? 1.5 : 1.0);
      ctx.shadowColor = '#8B7355'; ctx.shadowBlur = 4;
      ctx.fillStyle = '#8B7355';
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#A89060';
      ctx.beginPath(); ctx.arc(this.x - r*0.25, this.y - r*0.25, r*0.35, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6B5335'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
      // crack lines
      ctx.beginPath();
      ctx.moveTo(this.x - r*0.1, this.y - r*0.6);
      ctx.lineTo(this.x + r*0.2, this.y + r*0.1);
      ctx.stroke();
    } else {
      ctx.shadowColor = '#FF4444'; ctx.shadowBlur = 6;
      ctx.fillStyle = '#AA0000';
      ctx.beginPath(); ctx.arc(this.x, this.y, C.BALL_R * 0.85, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#FF6666'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Enemy ─────────────────────────────────────────────────────────────────────
class Enemy {
  constructor(x, type, waveNum = 1) {
    this.x = x; this.y = C.GROUND; this.type = type;
    this.def = ENEMY_DEFS[type];
    this.hp = this.def.hp; this.maxHp = this.def.hp;
    this.w = this.def.w; this.h = this.def.h;
    // Progressive difficulty: speed ramps from wave 3 (+9%/wave), extra HP late game
    this.speed = this.def.speed * (1 + Math.max(0, waveNum - 3) * 0.09);
    if (waveNum >= 7) { this.hp += 1; this.maxHp += 1; }
    this._throwScale = Math.max(0.55, 1 - Math.max(0, waveNum - 3) * 0.055);
    this.vy = 0; this.onGround = true; this.dead = false;
    this._flashTimer = 0; this._floatOffset = Math.random() * Math.PI * 2;
    this.throwTimer = this.def.throwInterval * this._throwScale * (0.4 + Math.random() * 0.6);
    this._legAnim = Math.random() * Math.PI * 2;
    this.contactCooldown = 0;
  }

  update(dt, players, enemyBalls) {
    if (this.dead) return;
    if (this._flashTimer > 0) this._flashTimer -= dt;
    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    this._legAnim += dt * 0.012;
    const def = this.def;
    if (def.floats) {
      this.x -= this.speed;
      this.y = (C.GROUND - 90) - 28 * Math.abs(Math.sin(Date.now() * 0.002 + this._floatOffset));
    } else {
      this.x -= this.speed;
      if (!this.onGround) {
        this.vy += C.GRAVITY; this.y += this.vy;
        if (this.y >= C.GROUND) { this.y = C.GROUND; this.vy = 0; this.onGround = true; }
      }
    }
    this.throwTimer -= dt;
    if (this.throwTimer <= 0 && players.length > 0) {
      this.throwTimer = def.throwInterval * this._throwScale * (0.8 + Math.random() * 0.4);
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
    const lurch = Math.sin(this._legAnim * 0.5) * 2;
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 2, w * .7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(lurch, 0); ctx.rotate(-0.06);
    // torn rotted legs, one dragging
    Sprites.px(ctx, '#2A1F12', -w*.45, -h*.35, w*.42, h*.35+leg);
    Sprites.px(ctx, '#241A0E', w*.03, -h*.35+3, w*.42, h*.35-leg-3);
    Sprites.px(ctx, '#4A3A28', -w*.38, -h*.22, 4, 3); // torn knee hole
    // exposed shin bone on drag leg
    Sprites.px(ctx, '#D8CFC0', w*.12, -h*.14, 4, h*.12);
    // rotting torso — torn shirt, exposed ribs
    Sprites.px(ctx, '#3A3F35', -w/2, -h*.75, w, h*.40);
    Sprites.px(ctx, d.color, -w*.18, -h*.66, w*.42, h*.20); // flesh through tear
    ctx.fillStyle = '#B8AF9E'; // ribs
    for (let i=0;i<3;i++) ctx.fillRect(-w*.12, -h*(.62-i*.06), w*.3, 2);
    // dark gore stain
    ctx.fillStyle = 'rgba(90,10,10,0.8)';
    ctx.beginPath(); ctx.ellipse(-w*.2, -h*.5, 5, 7, 0.4, 0, Math.PI*2); ctx.fill();
    // arms reaching forward (toward players — left)
    Sprites.px(ctx, d.color, -w/2-13, -h*.66+Math.sin(this._legAnim)*2, 15, 6);
    Sprites.px(ctx, d.color, -w/2-11, -h*.55-Math.sin(this._legAnim)*2, 13, 6);
    ctx.fillStyle = '#2A2A2A'; // clawed fingers
    ctx.fillRect(-w/2-16, -h*.66, 3, 4); ctx.fillRect(-w/2-14, -h*.55, 3, 4);
    // decayed head, tilted
    ctx.save(); ctx.translate(0, -h); ctx.rotate(0.12);
    Sprites.px(ctx, d.color, -w/2+2, 0, w-4, h*.27);
    Sprites.px(ctx, '#5A6A4A', -w/2+2, 0, w*.3, h*.1); // decay patch
    // sunken glowing eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(-7, 4, 6, 6); ctx.fillRect(2, 4, 6, 6);
    ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 6; ctx.fillStyle = '#FF3300';
    ctx.fillRect(-6, 6, 3, 3); ctx.fillRect(3, 6, 3, 3);
    ctx.shadowBlur = 0;
    // unhinged hanging jaw with teeth
    Sprites.px(ctx, d.color, -4, h*.24, 9, 5);
    ctx.fillStyle = '#D8CFC0';
    ctx.fillRect(-3, h*.24, 2, 2); ctx.fillRect(1, h*.24, 2, 2);
    ctx.fillStyle = 'rgba(120,10,10,0.9)'; ctx.fillRect(-2, h*.27, 5, 2); // blood drool
    ctx.restore();
    ctx.restore();
    if (this.type === 'fast_zombie') {
      ctx.strokeStyle='rgba(255,60,40,.6)'; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(w/2+3,-h*(.3+i*.18));ctx.lineTo(w/2+15,-h*(.3+i*.18));ctx.stroke();}
      ctx.setLineDash([]);
    }
  }

  _drawNinja(ctx) {
    const h = this.h, w = this.w, leg = Math.sin(this._legAnim) * 5;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 2, w * .7, 4, 0, 0, Math.PI * 2); ctx.fill();
    // flowing tattered scarf trailing behind
    const t = Date.now() * 0.006 + this._floatOffset;
    ctx.fillStyle = '#5A0000';
    ctx.beginPath();
    ctx.moveTo(2, -h + 4);
    ctx.quadraticCurveTo(w + 8, -h + 2 + Math.sin(t) * 5, w + 16, -h * .8 + Math.sin(t * 1.3) * 6);
    ctx.lineTo(w + 12, -h * .74 + Math.sin(t * 1.3) * 6);
    ctx.quadraticCurveTo(w + 5, -h * .88, 2, -h + 10);
    ctx.closePath(); ctx.fill();
    // crouched predatory stance
    Sprites.px(ctx,'#0A0A0C',-w*.45,-h*.35,w*.42,h*.35+leg); Sprites.px(ctx,'#0A0A0C',w*.03,-h*.35,w*.42,h*.35-leg);
    Sprites.px(ctx,'#101014',-w/2,-h*.75,w,h*.42);
    // crossed weapon straps
    ctx.strokeStyle='#3A2A1A'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-w/2,-h*.72); ctx.lineTo(w/2,-h*.42); ctx.stroke();
    // katana on back, glinting edge
    ctx.strokeStyle='#666'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(w*.3,-h*.9); ctx.lineTo(w*.9,-h*.45); ctx.stroke();
    ctx.strokeStyle='#DDD'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(w*.3,-h*.91); ctx.lineTo(w*.9,-h*.46); ctx.stroke();
    // arm with drawn kunai
    Sprites.px(ctx,'#101014',-w/2-9,-h*.62,11,6);
    ctx.fillStyle='#B0B8C0';
    ctx.beginPath(); ctx.moveTo(-w/2-9,-h*.60); ctx.lineTo(-w/2-17,-h*.58); ctx.lineTo(-w/2-9,-h*.55); ctx.closePath(); ctx.fill();
    // hooded head — only a slit of burning eyes
    Sprites.px(ctx,'#0C0C10',-w/2+1,-h,w-2,h*.27);
    Sprites.px(ctx,'#050508',-w/2+1,-h,w-2,h*.08); // hood shadow
    ctx.fillStyle='#1A0000'; ctx.fillRect(-w/2+3,-h+h*.11,w-6,5); // eye slit
    ctx.shadowColor='#FF2200'; ctx.shadowBlur=7; ctx.fillStyle='#FF3300';
    ctx.fillRect(-5,-h+h*.12,3,3); ctx.fillRect(2,-h+h*.12,3,3);
    ctx.shadowBlur=0;
  }

  _drawDino(ctx) {
    const d=this.def,h=this.h,w=this.w,leg=Math.sin(this._legAnim)*4;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 2, w * .85, 5, 0, 0, Math.PI * 2); ctx.fill();
    // powerful raptor legs with talons
    Sprites.px(ctx,'#2A5A2A',-w*.3,-h*.28,w*.27,h*.28+leg); Sprites.px(ctx,'#2A5A2A',w*.04,-h*.28,w*.27,h*.28-leg);
    ctx.fillStyle='#D8D0B8'; // talons
    ctx.fillRect(-w*.34,-3,4,4); ctx.fillRect(-w*.24,-3,4,4); ctx.fillRect(w*.02,-3,4,4); ctx.fillRect(w*.12,-3,4,4);
    // scarred muscular body
    Sprites.px(ctx,d.color,-w/2,-h*.82,w,h*.54);
    Sprites.px(ctx,'#4A9A4A',-w*.4,-h*.78,w*.8,h*.1); // muscle highlight
    // claw scars across flank
    ctx.strokeStyle='#7A2020'; ctx.lineWidth=2;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-w*.1+i*5,-h*.72);ctx.lineTo(-w*.02+i*5,-h*.46);ctx.stroke();}
    // spinal ridge spikes
    ctx.fillStyle='#1A3A1A';
    for(let i=0;i<4;i++){
      ctx.beginPath(); ctx.moveTo(-w*.35+i*w*.24,-h*.82);
      ctx.lineTo(-w*.28+i*w*.24,-h*.97); ctx.lineTo(-w*.21+i*w*.24,-h*.82); ctx.closePath(); ctx.fill();
    }
    // small clawed arms
    Sprites.px(ctx,d.color,-w/2-8,-h*.72,10,6);
    ctx.fillStyle='#D8D0B8'; ctx.fillRect(-w/2-11,-h*.72,3,4);
    // thick lashing tail
    ctx.strokeStyle=d.color; ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(w*.42,-h*.6);
    ctx.quadraticCurveTo(w*.95,-h*.5+Math.sin(Date.now()*.005)*6,w*1.15,-h*.32);
    ctx.stroke();
    // head with gaping jaw
    ctx.save(); ctx.translate(-w*.14,-h); ctx.rotate(-0.05);
    Sprites.px(ctx,d.color,-w*.36,0,w*.72,h*.16); // upper skull
    Sprites.px(ctx,d.color,-w*.5,h*.05,w*.34,h*.09); // snout
    Sprites.px(ctx,'#2A5A2A',-w*.46,h*.15,w*.4,h*.08); // lower jaw, open
    // rows of teeth
    ctx.fillStyle='#E8E0D0';
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-w*.46+i*5,h*.14);ctx.lineTo(-w*.44+i*5,h*.19);ctx.lineTo(-w*.42+i*5,h*.14);ctx.closePath();ctx.fill();}
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-w*.43+i*5,h*.23);ctx.lineTo(-w*.41+i*5,h*.18);ctx.lineTo(-w*.39+i*5,h*.23);ctx.closePath();ctx.fill();}
    ctx.fillStyle='rgba(120,10,10,0.85)'; ctx.fillRect(-w*.3,h*.16,w*.14,2); // bloody maw
    // slit predator eye
    ctx.shadowColor='#FFB000'; ctx.shadowBlur=5;
    ctx.fillStyle='#FFB000'; ctx.fillRect(-w*.1,h*.03,7,6);
    ctx.shadowBlur=0;
    ctx.fillStyle='#000'; ctx.fillRect(-w*.07,h*.03,2,6);
    ctx.restore();
  }

  _drawFSM(ctx) {
    const d=this.def,h=this.h,w=this.w,t=Date.now()*.003+this._floatOffset;
    // ominous aura
    ctx.save();
    const grd = ctx.createRadialGradient(0,-h*.5,4,0,-h*.5,w);
    grd.addColorStop(0,'rgba(160,60,20,0.30)'); grd.addColorStop(1,'rgba(160,60,20,0)');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(0,-h*.5,w,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // writhing charred tendrils, hooked tips
    ctx.strokeStyle='#5A3A1A'; ctx.lineWidth=5; ctx.lineCap='round';
    for(let n=0;n<4;n++){
      ctx.beginPath(); const ox=-w*.36+n*w*.24;
      let nx=ox,ny=0;
      for(let i=0;i<=8;i++){nx=ox+Math.sin(t+i*.9+n)*8;ny=-h*.3+(i/8)*h*.34; i===0?ctx.moveTo(nx,ny):ctx.lineTo(nx,ny);}
      ctx.stroke();
      ctx.fillStyle='#2A1A0A'; // hooked tip
      ctx.beginPath(); ctx.arc(nx,ny,3,0,Math.PI*2); ctx.fill();
    }
    // pulsing fleshy core mass
    const pulse = 1 + Math.sin(t*2.5)*0.08;
    ctx.fillStyle='#6A4022';
    ctx.beginPath(); ctx.ellipse(0,-h*.5,w*.42*pulse,h*.24*pulse,Math.sin(t)*.1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#8A5A32';
    ctx.beginPath(); ctx.ellipse(-w*.1,-h*.55,w*.22,h*.12,0,0,Math.PI*2); ctx.fill();
    // veins across the mass
    ctx.strokeStyle='rgba(140,20,20,0.7)'; ctx.lineWidth=1.5;
    for(let n=0;n<3;n++){
      ctx.beginPath(); ctx.moveTo(-w*.3+n*w*.3,-h*.62);
      ctx.quadraticCurveTo(-w*.2+n*w*.3,-h*.5,-w*.3+n*w*.3+4,-h*.38); ctx.stroke();
    }
    // asymmetric bloodshot eyestalks
    ctx.fillStyle='#4A2210';
    ctx.beginPath();ctx.arc(-w*.25,-h*.76,11,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(w*.28,-h*.72,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#E8D8C8';
    ctx.beginPath();ctx.arc(-w*.25,-h*.76,7,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(w*.28,-h*.72,5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(180,30,30,0.8)'; ctx.lineWidth=1; // bloodshot
    for(let a=0;a<5;a++){const an=a*1.3;ctx.beginPath();ctx.moveTo(-w*.25+Math.cos(an)*3,-h*.76+Math.sin(an)*3);ctx.lineTo(-w*.25+Math.cos(an)*7,-h*.76+Math.sin(an)*7);ctx.stroke();}
    ctx.shadowColor='#FF3300'; ctx.shadowBlur=4;
    ctx.fillStyle='#8B0000';
    ctx.beginPath();ctx.arc(-w*.25-1,-h*.76,3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(w*.28-1,-h*.72,2.5,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // jagged tooth-lined slit mouth
    ctx.strokeStyle='#1A0A00'; ctx.lineWidth=3;
    ctx.beginPath();
    for(let i=0;i<=6;i++){const nx=-w*.28+(i/6)*w*.5,ny=-h*.42+(i%2?3:-2); i===0?ctx.moveTo(nx,ny):ctx.lineTo(nx,ny);}
    ctx.stroke();
    ctx.fillStyle='#E8E0D0';
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-w*.24+i*6,-h*.43);ctx.lineTo(-w*.22+i*6,-h*.38);ctx.lineTo(-w*.2+i*6,-h*.43);ctx.closePath();ctx.fill();}
    ctx.lineCap='butt';
  }
}

// ── Boss enemy — THE OVERLORD ─────────────────────────────────────────────────
class BossEnemy {
  constructor() {
    this.x = C.W + 100;
    this.y = C.GROUND;
    this.w = 52; this.h = 72;
    this.hp = 24; this.maxHp = 24;
    this.dead = false;
    this._phase = 'enter';
    this._dir = -1;
    this._patrolL = C.W * 0.26;
    this._patrolR = C.W * 0.74;
    this._speed = 1.5;
    this._fireTimer = 2000;
    this._chargeTimer = 7000 + Math.random() * 3000;
    this._chargeTime = 0;
    this._chargeDx = 0;
    this._flashTimer = 0;
    this._animT = 0;
    this.contactCooldown = 0;
  }

  update(dt, players, enemyBalls) {
    if (this.dead) return;
    if (this._flashTimer > 0) this._flashTimer -= dt;
    if (this.contactCooldown > 0) this.contactCooldown -= dt;
    this._animT += dt;

    if (this._phase === 'enter') {
      this.x -= 2.2;
      if (this.x <= this._patrolR) { this.x = this._patrolR; this._phase = 'patrol'; }
      return;
    }

    if (this._phase === 'patrol') {
      this.x += this._dir * this._speed;
      if (this.x <= this._patrolL) { this.x = this._patrolL; this._dir =  1; }
      if (this.x >= this._patrolR) { this.x = this._patrolR; this._dir = -1; }

      // Enrage below 40% HP: faster, meaner, wider spread
      const enraged = this.hp / this.maxHp <= 0.4;
      this._enraged = enraged;
      this._speed = enraged ? 2.3 : 1.5;

      // Fire ball spread (5-way when enraged)
      this._fireTimer -= dt;
      if (this._fireTimer <= 0 && players.length > 0) {
        this._fireTimer = (enraged ? 1000 : 1500) + Math.random() * (enraged ? 700 : 1200);
        let target = players[0];
        for (const p of players) if (Math.abs(this.x - p.x) < Math.abs(this.x - target.x)) target = p;
        const dx = target.x - this.x, dy = (target.y - 22) - (this.y - this.h * 0.5);
        const base = Math.atan2(dy, dx);
        const spd = enraged ? 6.4 : 5.5;
        const n = enraged ? 2 : 1;
        for (let a = -n; a <= n; a++) {
          const ang = base + a * 0.22;
          enemyBalls.push(new EnemyBall(
            this.x, this.y - this.h * 0.55,
            Math.cos(ang) * spd, Math.sin(ang) * spd - 1.2
          ));
        }
      }

      // Charge attack
      this._chargeTimer -= dt;
      if (this._chargeTimer <= 0 && players.length > 0) {
        this._chargeTimer = (enraged ? 4500 : 7000) + Math.random() * 4000;
        this._phase = 'charge';
        let target = players[0];
        for (const p of players) if (Math.abs(this.x - p.x) < Math.abs(this.x - target.x)) target = p;
        this._chargeDx = Math.sign(target.x - this.x) * (enraged ? 7.5 : 6);
        this._chargeTime = 650;
      }

    } else if (this._phase === 'charge') {
      this.x += this._chargeDx;
      this._chargeTime -= dt;
      if (this._chargeTime <= 0 || this.x < 30 || this.x > C.W - 30) {
        this._phase = 'patrol';
        this.x = Math.max(this._patrolL, Math.min(this._patrolR, this.x));
      }
    }
  }

  takeBall(ball) {
    this.hp--;
    this._flashTimer = 180;
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
    this._drawBody(ctx);
    ctx.globalAlpha = 1;

    // Boss HP bar (wide, above head)
    const bw = this.w * 2.2, bh = 8, bx = -bw / 2;
    const hpPct = this.hp / this.maxHp;
    ctx.fillStyle = '#330000'; ctx.fillRect(bx, -this.h - 18, bw, bh);
    ctx.fillStyle = hpPct > 0.5 ? '#FF3333' : hpPct > 0.25 ? '#FF8800' : '#FF0000';
    ctx.fillRect(bx, -this.h - 18, bw * hpPct, bh);
    ctx.strokeStyle = '#880000'; ctx.lineWidth = 1; ctx.strokeRect(bx, -this.h - 18, bw, bh);
    ctx.fillStyle = '#FF4444'; ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE OVERLORD', 0, -this.h - 22);
    ctx.restore();
  }

  _drawBody(ctx) {
    const t = this._animT, h = this.h, w = this.w;
    const charging = this._phase === 'charge';
    const enraged = !!this._enraged;

    // Ground shadow + hellish aura
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, 2, w * 0.9, 7, 0, 0, Math.PI * 2); ctx.fill();
    const auraR = w * 1.5 + Math.sin(t * 0.006) * 6;
    const aura = ctx.createRadialGradient(0, -h * 0.6, 8, 0, -h * 0.6, auraR);
    aura.addColorStop(0, enraged ? 'rgba(255,40,0,0.35)' : 'rgba(160,0,30,0.22)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -h * 0.6, auraR, 0, Math.PI * 2); ctx.fill();

    // Hulking clawed legs
    const leg = Math.sin(t * 0.014) * 6;
    Sprites.px(ctx, '#1A0510', -w * .36, -h * .38, w * .3, h * .38 + leg);
    Sprites.px(ctx, '#1A0510',  w * .06, -h * .38, w * .3, h * .38 - leg);
    // Talon feet
    ctx.fillStyle = '#5A4A3A';
    for (const s of [-1, 1]) {
      const fx = s < 0 ? -w * .36 : w * .06;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(fx + i * w * 0.1, 0);
        ctx.lineTo(fx + i * w * 0.1 + (s < 0 ? -4 : 4), 4);
        ctx.lineTo(fx + i * w * 0.1 + w * 0.07, 0);
        ctx.closePath(); ctx.fill();
      }
    }

    // Massive scarred torso
    Sprites.px(ctx, '#3A0518', -w * .52, -h * .88, w * 1.04, h * .5);
    Sprites.px(ctx, '#55082A', -w * .44, -h * .84, w * .88, h * .2); // muscle highlight
    // Glowing chest fissure (heart of the demon)
    const pulse = 0.6 + Math.sin(t * 0.01) * 0.4;
    ctx.strokeStyle = enraged ? `rgba(255,60,0,${0.6 + pulse * 0.4})` : `rgba(255,120,0,${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * .06, -h * .84); ctx.lineTo(w * .04, -h * .72);
    ctx.lineTo(-w * .03, -h * .6); ctx.lineTo(w * .06, -h * .46);
    ctx.stroke();
    // Battle scars
    ctx.strokeStyle = '#7A1030'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w * .4, -h * .8); ctx.lineTo(-w * .2, -h * .62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * .32, -h * .74); ctx.lineTo(w * .18, -h * .55); ctx.stroke();

    // Torn bat wings with bone fingers
    const flap = Math.sin(t * 0.008) * 12;
    for (const s of [-1, 1]) {
      ctx.fillStyle = enraged ? 'rgba(140,10,10,0.8)' : 'rgba(70,5,25,0.85)';
      ctx.beginPath();
      ctx.moveTo(s * w * .5, -h * .8);
      ctx.lineTo(s * w * 1.45, -h * 1.05 + flap);
      ctx.lineTo(s * w * 1.25, -h * .7 + flap * 0.5);
      ctx.lineTo(s * w * 1.05, -h * .5);
      ctx.lineTo(s * w * .85, -h * .58);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#20060F'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s * w * .5, -h * .8); ctx.lineTo(s * w * 1.45, -h * 1.05 + flap); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * w * .5, -h * .78); ctx.lineTo(s * w * 1.25, -h * .7 + flap * 0.5); ctx.stroke();
    }

    // Spiked lashing tail
    ctx.strokeStyle = '#30051A'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * .42, -h * .5);
    ctx.quadraticCurveTo(w * .95, -h * .28 + Math.sin(t * 0.01) * 12, w * .68, -h * .04);
    ctx.stroke();
    ctx.fillStyle = '#6A5A4A';
    ctx.beginPath(); ctx.moveTo(w * .68, -h * .04); ctx.lineTo(w * .78, -h * .12); ctx.lineTo(w * .74, 0); ctx.closePath(); ctx.fill();

    // Brutal horned skull head
    Sprites.px(ctx, '#4A0A20', -w * .44, -h * 1.02, w * .88, h * .2);
    Sprites.px(ctx, '#60102A', -w * .38, -h * 1.0, w * .76, h * .08);
    // Huge curved horns
    ctx.fillStyle = '#2A1A10';
    ctx.beginPath(); ctx.moveTo(-w*.26,-h); ctx.quadraticCurveTo(-w*.55,-h*1.2,-w*.44,-h*1.4); ctx.quadraticCurveTo(-w*.34,-h*1.18,-w*.1,-h*1.02); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( w*.26,-h); ctx.quadraticCurveTo( w*.55,-h*1.2, w*.44,-h*1.4); ctx.quadraticCurveTo( w*.34,-h*1.18, w*.1,-h*1.02); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4A3220';
    ctx.beginPath(); ctx.moveTo(-w*.42,-h*1.34); ctx.lineTo(-w*.44,-h*1.4); ctx.lineTo(-w*.38,-h*1.36); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( w*.42,-h*1.34); ctx.lineTo( w*.44,-h*1.4); ctx.lineTo( w*.38,-h*1.36); ctx.closePath(); ctx.fill();

    // Burning eyes (white-hot when enraged/charging)
    const eyeCol = charging ? '#FF0000' : enraged ? '#FFDD00' : '#FF6600';
    ctx.shadowColor = eyeCol; ctx.shadowBlur = enraged ? 16 : 10;
    ctx.fillStyle = eyeCol;
    ctx.beginPath(); ctx.arc(-w * .17, -h * .92, enraged ? 6 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( w * .17, -h * .92, enraged ? 6 : 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-w * .17, -h * .92, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( w * .17, -h * .92, 2, 0, Math.PI * 2); ctx.fill();

    // Fanged maw — always open when enraged, roaring when charging
    if (charging || enraged) {
      ctx.fillStyle = '#1A0000';
      ctx.beginPath(); ctx.ellipse(0, -h * .85, 9, charging ? 8 : 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#E8E0D0';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 5 - 2, -h * .85 - 4); ctx.lineTo(i * 5, -h * .85 + 1); ctx.lineTo(i * 5 + 2, -h * .85 - 4); ctx.closePath(); ctx.fill();
      }
      if (charging) { ctx.fillStyle = '#FF4400'; ctx.beginPath(); ctx.arc(0, -h * .82, 4, 0, Math.PI); ctx.fill(); }
    } else {
      ctx.strokeStyle = '#1A0000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -h * .85); ctx.lineTo(6, -h * .85); ctx.stroke();
    }
  }
}

// ── HordeGame ─────────────────────────────────────────────────────────────────
class HordeGame {
  constructor(canvas, solo = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.solo = solo;

    this.p1 = new Player(0, solo ? 200 : 140, Controls.p1);
    this.p1.noMidline = true; this.p1.hordeMode = true; this.p1.dir = 1;
    { const ch = CHARACTERS[0]; this.p1.signaturePower=ch.power; this.p1.charColors=ch.colors; this.p1.charType=ch.type; this.p1.charName=ch.name; }

    // P2 only exists in co-op
    if (!solo) {
      this.p2 = new Player(1, 260, Controls.p2);
      this.p2.noMidline = true; this.p2.hordeMode = true; this.p2.dir = 1;
      { const ch = CHARACTERS[1]; this.p2.signaturePower=ch.power; this.p2.charColors=ch.colors; this.p2.charType=ch.type; this.p2.charName=ch.name; }
    } else {
      this.p2 = null;
    }

    // Each player has their own ball
    this.p1Ball = new Ball(); this.p1Ball.reset(0); this.p1.hasBall = true;
    this._p1BallTimer = 0;
    if (!solo) {
      this.p2Ball = new Ball(); this.p2Ball.reset(1); this.p2.hasBall = true;
      this._p2BallTimer = 0;
    } else {
      this.p2Ball = null; this._p2BallTimer = 0;
    }

    // Extra balls from double power
    this._extraBalls = [];

    this.p1.extraThrowCallback = (x, y, vx, vy, idx) => {
      const b = new Ball(); b.throw(x, y, vx, vy, false, false); b.lastThrower = idx; this._extraBalls.push(b);
    };
    if (!solo) {
      this.p2.extraThrowCallback = (x, y, vx, vy, idx) => {
        const b = new Ball(); b.throw(x, y, vx, vy, false, false); b.lastThrower = idx; this._extraBalls.push(b);
      };
    }

    this.p1Hp = 3; this.p2Hp = solo ? -1 : 3;  // -1 = not applicable in solo
    this.p1Fallen = false; this.p2Fallen = solo; // P2 treated as already fallen in solo

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
    this.boss = null;
  }

  update(dt) {
    if (Input.wasPressed('Escape')) { this.returnToMenu = true; return; }
    if (this.waveState === 'game_over' || this.waveState === 'victory') {
      if (Input.wasPressed('Enter') || Input.wasPressed('Space')) {
        this.returnToMenu = true;
      }
      return;
    }

    Particles.update(dt);
    if (this._battleCryTimer > 0) this._battleCryTimer -= dt;
    this.arena.update(dt);
    const obs = this.arena.getObstacles();

    // Position held balls before player update
    this._positionHeld(this.p1Ball, this.p1);
    if (!this.solo) this._positionHeld(this.p2Ball, this.p2);

    // Player updates
    const p2ref = this.solo ? null : this.p2;
    if (!this.p1Fallen) this.p1.update(dt, this.p1Ball, obs, p2ref);
    if (!this.solo && !this.p2Fallen) this.p2.update(dt, this.p2Ball, obs, this.p1);

    // Ball physics
    this.p1Ball.update(dt, obs);
    if (!this.solo) this.p2Ball.update(dt, obs);

    // Ball respawn when dead
    this._tickBallRespawn(dt, this.p1Ball, this.p1, '_p1BallTimer', 0);
    if (!this.solo) this._tickBallRespawn(dt, this.p2Ball, this.p2, '_p2BallTimer', 1);

    // Extra balls (double power)
    for (let i = this._extraBalls.length - 1; i >= 0; i--) {
      const b = this._extraBalls[i];
      b.update(dt, obs);
      this._checkBallVsEnemies(b);
      if (b.dead) this._extraBalls.splice(i, 1);
    }

    // Player balls vs enemies
    if (this.p1Ball.inFlight && !this.p1Ball.dead) this._checkBallVsEnemies(this.p1Ball);
    if (!this.solo && this.p2Ball.inFlight && !this.p2Ball.dead) this._checkBallVsEnemies(this.p2Ball);

    // Enemy balls vs players
    for (const eb of this.enemyBalls) {
      eb.update();
      if (!eb.dead) this._checkEnemyBallVsPlayers(eb);
    }
    this.enemyBalls = this.enemyBalls.filter(b => !b.dead);

    // Enemy movement + contact damage
    if (this.waveState === 'spawning' || this.waveState === 'fighting') {
      const all = this.solo ? [this.p1] : [this.p1, this.p2];
      const alive = all.filter((p, i) => ![this.p1Fallen, this.p2Fallen][i]);
      for (const e of this.enemies) {
        e.update(dt, alive, this.enemyBalls);
        if (!e.dead) this._checkEnemyContact(e);
      }
      this.enemies = this.enemies.filter(e => !e.dead);
    }

    // Boss fight
    if (this.boss && !this.boss.dead && this.waveState === 'boss_fight') {
      const all = this.solo ? [this.p1] : [this.p1, this.p2];
      const alive = all.filter((p, i) => ![this.p1Fallen, this.p2Fallen][i]);
      this.boss.update(dt, alive, this.enemyBalls);

      // Ball hits boss
      const bossBalls = this.solo ? [this.p1Ball, ...this._extraBalls] : [this.p1Ball, this.p2Ball, ...this._extraBalls];
      for (const ball of bossBalls) {
        if (!ball.inFlight || ball.dead) continue;
        const r = this.boss.rect;
        if (ball.x + C.BALL_R > r.x && ball.x - C.BALL_R < r.x + r.w &&
            ball.y + C.BALL_R > r.y && ball.y - C.BALL_R < r.y + r.h) {
          const killed = this.boss.takeBall(ball);
          this.score += killed ? 25 * (HORDE_WAVES.length + 1) : 5;
          if (killed) {
            FX.hitstop(160);
            FX.shake(10, 500);
            FX.shockwave(this.boss.x, this.boss.y - this.boss.h / 2, '#FFFFFF', { maxR: 130, width: 5, dur: 500 });
            FX.flash('#FFFFFF', 0.3, 200);
            Particles.emit(this.boss.x, this.boss.y - this.boss.h / 2, 40,
              ['#FF4444','#FF8800','#FFD700','#FFFFFF','#FF0000'],
              { upBias: 3, maxSpeed: 8, minSize: 2, maxSize: 6 });
          }
          const thrower = ball.lastThrower === 0 ? this.p1 : ball.lastThrower === 1 ? this.p2 : null;
          if (thrower) thrower.spCharge = Math.min(C.SP_CHARGE_MAX, thrower.spCharge + C.SP_CHARGE_HIT);
          break;
        }
      }

      // Boss contact damage
      if (this.boss.contactCooldown <= 0) {
        const br = this.boss.rect;
        const bossPlayers = this.solo ? [[this.p1,this.p1Fallen]] : [[this.p1,this.p1Fallen],[this.p2,this.p2Fallen]];
        for (const [player, fallen] of bossPlayers) {
          if (fallen || player.stunTimer > 0) continue;
          const hitH = player.crouching ? C.CROUCH_H : C.P_H;
          if (br.x < player.x + C.P_W / 2 && br.x + br.w > player.x - C.P_W / 2 &&
              br.y < player.y && br.y + br.h > player.y - hitH) {
            this.boss.contactCooldown = 1500;
            this.boss._flashTimer = 200;
            this._hitPlayer(player);
            break;
          }
        }
      }

      if (this.boss.dead) {
        this.waveState = 'victory';
      }
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
        this.score += killed ? 10 * this.wave : 2;
        if (killed) {
          FX.shake(3, 150);
          FX.shockwave(e.x, e.y - e.h / 2, '#FFD700', { maxR: 34, width: 2 });
          Particles.emit(e.x, e.y - e.h / 2, 18,
            ['#FF4444', '#FF8800', '#FFD700', '#FFFFFF'],
            { upBias: 2, maxSpeed: 5, minSize: 2, maxSize: 4 });
          const thrower = ball.lastThrower === 0 ? this.p1 : ball.lastThrower === 1 ? this.p2 : null;
          if (thrower) thrower.spCharge = Math.min(C.SP_CHARGE_MAX, thrower.spCharge + C.SP_CHARGE_HIT);
        }
        break;
      }
    }
  }

  _checkEnemyBallVsPlayers(eb) {
    const pairs = this.solo ? [[this.p1,this.p1Fallen]] : [[this.p1,this.p1Fallen],[this.p2,this.p2Fallen]];
    for (const [player, fallen] of pairs) {
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
    if (enemy.contactCooldown > 0) return;
    const pairs = this.solo ? [[this.p1,this.p1Fallen]] : [[this.p1,this.p1Fallen],[this.p2,this.p2Fallen]];
    for (const [player, fallen] of pairs) {
      if (fallen || player.stunTimer > 0) continue;
      const er = enemy.rect;
      const hitH = player.crouching ? C.CROUCH_H : C.P_H;
      if (er.x < player.x + C.P_W / 2 && er.x + er.w > player.x - C.P_W / 2 &&
          er.y < player.y              && er.y + er.h  > player.y - hitH) {
        enemy.contactCooldown = 1500; // 1.5s before it can hit again
        enemy._flashTimer = 250;
        this._hitPlayer(player);
        break;
      }
    }
  }

  _hitPlayer(player) {
    const isP1 = player === this.p1;
    const col = isP1 ? C.COL.P1_HUD : C.COL.P2_HUD;
    FX.hitstop(70);
    FX.shake(5, 280);
    FX.shockwave(player.x, player.y - 22, '#FF4444', { maxR: 44, width: 3 });
    FX.flash('#FF0000', 0.12, 130);
    Particles.emit(player.x, player.y - 22, 16,
      [col, '#FF4444', '#FFFFFF'],
      { upBias: 2, maxSpeed: 4 });
    if (isP1) { this.p1Hp = Math.max(0, this.p1Hp - 1); if (this.p1Hp <= 0) this.p1Fallen = true; }
    else       { this.p2Hp = Math.max(0, this.p2Hp - 1); if (this.p2Hp <= 0) this.p2Fallen = true; }
    const allFallen = this.p1Fallen && (this.solo || this.p2Fallen);
    player.stunTimer = allFallen ? 0 : 900;
    player.vx = 4; player.vy = -5;
    if (allFallen) {
      this.waveState = 'game_over';
      this._diedInBoss = this.boss !== null;
    }
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
          this.enemies.push(new Enemy(C.W + 50 + Math.random() * 120, this._spawnQueue.shift(), this.wave));
          this._spawnTimer = HORDE_WAVES[this.wave - 1].spawnInterval;
        }
        if (this._spawnQueue.length === 0) this.waveState = 'fighting';
        break;
      case 'fighting':
        if (this.enemies.length === 0) {
          // Restore 1 HP to survivors on wave clear
          if (!this.p1Fallen) this.p1Hp = Math.min(3, this.p1Hp + 1);
          if (!this.solo && !this.p2Fallen) this.p2Hp = Math.min(3, this.p2Hp + 1);
          if (this.wave >= HORDE_WAVES.length) {
            this.waveState = 'boss_intro';
            this.waveTimer = 3500;
          } else {
            this.waveState = 'wave_end';
            this.waveTimer = 3200;
          }
        }
        break;
      case 'wave_end':
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) { this.waveState = 'countdown'; this.waveTimer = 2400; }
        break;
      case 'boss_intro':
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) {
          this.boss = new BossEnemy();
          this.waveState = 'boss_fight';
        }
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
    // Battle cry
    this._battleCryTimer = 2200;
    const _HC = {
      'Jaco':["LET'S GO!","WE'VE GOT THIS!","HOLD THE LINE!"],
      'Lucy':["NONE SHALL PASS!","SMASH 'EM ALL!","KEEP MOVING!"],
    };
    const n = (this.p1 && this.p1.charName) || 'Jaco';
    const arr = _HC[n] || ["HERE THEY COME!"];
    this._battleCryText = arr[this.wave % arr.length];
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, C.W, C.H);
    this.arena.draw(ctx);

    for (const e of this.enemies) e.draw(ctx);
    if (this.boss) this.boss.draw(ctx);
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

    // P2 (skip in solo)
    if (!this.solo) {
      if (this.p2Fallen) {
        ctx.save(); ctx.globalAlpha = 0.22;
        this.p2.draw(ctx, this.p2Ball); ctx.restore();
      } else {
        this.p2.draw(ctx, this.p2Ball);
      }
      this.p2Ball.draw(ctx);
    }

    for (const b of this._extraBalls) b.draw(ctx);

    Particles.draw(ctx);
    this._drawHUD(ctx);
    this._drawOverlay(ctx);

    // Battle cry banner
    if (this._battleCryTimer > 0 && this._battleCryText) {
      const t = Math.min(1, this._battleCryTimer / 600);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#FF9900';
      ctx.font = 'bold 26px Segoe UI, Arial, sans-serif';
      ctx.fillText(this._battleCryText, C.W / 2, 80);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ── HUD: players left/right, wave info center ─────────────────────────────
  _drawHUD(ctx) {
    // Gradient top strip with bottom glow line
    const g = ctx.createLinearGradient(0, 0, 0, 58);
    g.addColorStop(0, 'rgba(8,10,18,0.96)');
    g.addColorStop(0.8, 'rgba(10,12,22,0.88)');
    g.addColorStop(1, 'rgba(10,12,22,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.W, 58);
    ctx.fillStyle = 'rgba(255,215,0,0.25)';
    ctx.fillRect(0, 52, C.W, 1);

    this._drawPlayerPanel(ctx, this.p1, this.p1Hp, this.p1Fallen, C.COL.P1_HUD, this.p1.charName || 'JACO', false);
    if (!this.solo)
      this._drawPlayerPanel(ctx, this.p2, this.p2Hp, this.p2Fallen, C.COL.P2_HUD, this.p2.charName || 'LUCY', true);

    // Center command plate (angled sides)
    const cx = C.W / 2, pw = 190, ph = 50;
    ctx.beginPath();
    ctx.moveTo(cx - pw / 2, 0); ctx.lineTo(cx + pw / 2, 0);
    ctx.lineTo(cx + pw / 2 - 14, ph); ctx.lineTo(cx - pw / 2 + 14, ph);
    ctx.closePath();
    const pg = ctx.createLinearGradient(0, 0, 0, ph);
    pg.addColorStop(0, 'rgba(30,32,48,0.95)');
    pg.addColorStop(1, 'rgba(14,15,26,0.95)');
    ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Segoe UI, Arial, sans-serif';
    ctx.shadowColor = 'rgba(255,180,0,0.7)'; ctx.shadowBlur = 8;
    ctx.fillText(`WAVE ${this.wave || '—'} / ${HORDE_WAVES.length}`, cx, 16);
    ctx.shadowBlur = 0;

    // Segmented wave progress
    for (let i = 0; i < HORDE_WAVES.length; i++) {
      const sw = 9, sx = cx - (HORDE_WAVES.length * (sw + 2) - 2) / 2 + i * (sw + 2);
      ctx.fillStyle = i < this.wave ? '#FFD700' : 'rgba(255,255,255,0.1)';
      ctx.fillRect(sx, 21, sw, 4);
    }

    ctx.fillStyle = '#E8E8F0'; ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${this.score.toLocaleString()} PTS`, cx, 38);

    if (this.waveState === 'fighting' || this.waveState === 'spawning') {
      const rem = this.enemies.length + this._spawnQueue.length;
      ctx.fillStyle = rem > 6 ? '#FF7070' : '#FFBB44';
      ctx.font = '10px Segoe UI, Arial, sans-serif';
      ctx.fillText(`◆ ${rem} HOSTILES`, cx, 49);
    }

    // Boss HP bar — cinematic, centre bottom of strip
    if (this.boss && !this.boss.dead && this.waveState === 'boss_fight') {
      const bw = 260, bh = 12, bx = cx - bw / 2, by = 62;
      const hpPct = this.boss.hp / this.boss.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 4, by - 16, bw + 8, bh + 20);
      ctx.fillStyle = '#FF4444'; ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 6;
      ctx.fillText(this.boss._enraged ? '☠ THE OVERLORD — ENRAGED ☠' : '☠ THE OVERLORD', cx, by - 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1A0000'; ctx.fillRect(bx, by, bw, bh);
      const bg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      bg2.addColorStop(0, '#8B0000'); bg2.addColorStop(1, hpPct > 0.4 ? '#FF3333' : '#FF7700');
      ctx.fillStyle = bg2;
      ctx.fillRect(bx, by, bw * hpPct, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(bx, by, bw * hpPct, 3);
      // segment ticks
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 1; i < 8; i++) ctx.fillRect(bx + (bw / 8) * i, by, 1, bh);
      ctx.strokeStyle = '#AA1111'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    }

    // ESC hint
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.font =  '11px Segoe UI, Arial, sans-serif';
    ctx.fillText('ESC · menu', cx, C.H - 6);
    ctx.textAlign = 'left';
  }

  _drawPlayerPanel(ctx, player, hp, fallen, col, name, right) {
    const panW = 280, panH = 46;
    const px0 = right ? C.W - panW - 6 : 6;

    // Angled player card
    ctx.beginPath();
    if (right) {
      ctx.moveTo(px0 + 14, 3); ctx.lineTo(px0 + panW, 3);
      ctx.lineTo(px0 + panW, 3 + panH); ctx.lineTo(px0, 3 + panH);
    } else {
      ctx.moveTo(px0, 3); ctx.lineTo(px0 + panW - 14, 3);
      ctx.lineTo(px0 + panW, 3 + panH); ctx.lineTo(px0, 3 + panH);
    }
    ctx.closePath();
    const cg = ctx.createLinearGradient(0, 3, 0, 3 + panH);
    cg.addColorStop(0, 'rgba(24,26,40,0.92)');
    cg.addColorStop(1, 'rgba(12,13,22,0.92)');
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = fallen ? 'rgba(255,60,60,0.7)' : col; ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
    // Accent edge stripe
    ctx.fillStyle = fallen ? '#FF3333' : col;
    ctx.fillRect(right ? px0 + panW - 3 : px0, 3, 3, panH);

    const x0 = right ? px0 + panW - 12 : px0 + 12;

    if (fallen) {
      ctx.fillStyle = 'rgba(180,0,0,0.22)';
      ctx.fillRect(px0, 3, panW, panH);
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillStyle = col; ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
      ctx.fillText(name, x0, 20);
      ctx.fillStyle = '#FF4444'; ctx.font = 'bold 18px Segoe UI, Arial, sans-serif';
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8;
      ctx.fillText('K.O.', x0, 42);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
      return;
    }

    // Name with subtle glow
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillStyle = col; ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
    ctx.shadowColor = col; ctx.shadowBlur = 5;
    ctx.fillText(name, x0, 17);
    ctx.shadowBlur = 0;

    // HP hearts — beveled diamonds
    for (let i = 0; i < 3; i++) {
      const hx = right ? x0 - 76 - i * 22 : x0 + 76 + i * 22;
      const alive = i < hp;
      ctx.save();
      ctx.translate(hx, 12); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = alive ? '#EE2222' : 'rgba(255,255,255,0.08)';
      if (alive) { ctx.shadowColor = '#FF2222'; ctx.shadowBlur = 7; }
      ctx.fillRect(-6, -6, 12, 12);
      ctx.shadowBlur = 0;
      if (alive) { ctx.fillStyle = 'rgba(255,180,180,0.6)'; ctx.fillRect(-6, -6, 12, 4); }
      ctx.strokeStyle = alive ? '#FF6666' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1; ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }

    // SP bar — gradient fill with shine + charge glow
    const barW = 180, barH = 9;
    const barX = right ? x0 - barW : x0;
    const spPct = Math.min(1, player.spCharge / C.SP_CHARGE_MAX);
    const full = spPct >= 1;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(barX, 26, barW, barH);
    if (spPct > 0) {
      const sg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      if (full) { sg.addColorStop(0, '#FFB000'); sg.addColorStop(1, '#FFE060'); }
      else { sg.addColorStop(0, col); sg.addColorStop(1, '#FFFFFF'); }
      ctx.fillStyle = sg;
      if (full) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8 + 4 * Math.sin(Date.now() / 150); }
      ctx.fillRect(barX, 26, barW * spPct, barH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(barX, 26, barW * spPct, 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let i = 1; i < 6; i++) ctx.fillRect(barX + (barW / 6) * i, 26, 1, barH);
    ctx.strokeStyle = full ? '#FFD700' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1; ctx.strokeRect(barX, 26, barW, barH);

    ctx.fillStyle = full ? '#FFD700' : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 9px Segoe UI, Arial, sans-serif';
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText(full ? 'READY' : 'PWR', right ? barX - 4 : barX + barW + 4, 33);

    // Active power callout
    if (player._powerAssigned && player.spCharge >= C.SP_CHARGE_MAX) {
      const pcol = player.currentPower === 'rocket' ? C.COL.SP_ROCKET
                 : player.currentPower === 'double' ? C.COL.SP_DOUBLE
                 : player.currentPower === 'curve'  ? C.COL.SP_CURVE
                 : C.COL.SP_SHADOW;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 200);
      ctx.fillStyle = pcol; ctx.font = 'bold 10px Segoe UI, Arial, sans-serif';
      ctx.shadowColor = pcol; ctx.shadowBlur = 6;
      ctx.fillText(`★ ${C.POWER_NAMES[player.currentPower]}`, x0, 45);
      ctx.shadowBlur = 0;
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
        ctx.fillStyle = '#FF6600'; ctx.font = 'bold 26px Segoe UI, Arial, sans-serif';
        ctx.fillText('HORDE MODE', C.W / 2, C.H / 2 - 14);
        ctx.fillStyle = '#ccc'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText('Survive all 10 waves together!', C.W / 2, C.H / 2 + 10);
        ctx.fillStyle = '#666'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText('Each player has their own ball · 3 hits each', C.W / 2, C.H / 2 + 30);
      } else if (isWaveEnd) {
        ctx.fillStyle = '#88FF88'; ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
        ctx.fillText(`WAVE ${this.wave}  CLEAR!`, C.W / 2, C.H / 2 - 14);
        ctx.fillStyle = '#aaa'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText(`Score: ${this.score}`, C.W / 2, C.H / 2 + 12);
      } else {
        const nextDef = HORDE_WAVES[this.wave];
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 19px Segoe UI, Arial, sans-serif';
        ctx.fillText(`WAVE ${this.wave + 1}  ·  ${nextDef ? nextDef.label : ''}`, C.W / 2, C.H / 2 - 16);
        if (nextDef) {
          const total = nextDef.enemies.reduce((s, g) => s + g.count, 0);
          ctx.fillStyle = '#FF9999'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
          ctx.fillText(`${total} enemies incoming`, C.W / 2, C.H / 2 + 8);
        }
        ctx.fillStyle = '#555'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
        ctx.fillText(`Starting in ${Math.ceil(this.waveTimer / 1000)}…`, C.W / 2, C.H / 2 + 28);
      }
      ctx.textAlign = 'left';
    }

    if (this.waveState === 'boss_intro') {
      const t = this.waveTimer / 3500;
      ctx.fillStyle = `rgba(80,0,0,${0.55 * (1 - t * 0.5)})`;
      ctx.fillRect(0, 0, C.W, C.H);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(C.W / 2 - 230, C.H / 2 - 58, 460, 116);
      ctx.textAlign = 'center';
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 120);
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 30;
      ctx.fillStyle = '#FF2222'; ctx.font = 'bold 38px Segoe UI, Arial, sans-serif';
      ctx.fillText('BOSS FIGHT!', C.W / 2, C.H / 2 - 10);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.fillStyle = '#FF8888'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
      ctx.fillText('THE OVERLORD AWAKENS…', C.W / 2, C.H / 2 + 18);
      ctx.fillStyle = '#555'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
      ctx.fillText(`Incoming in ${Math.ceil(this.waveTimer / 1000)}…`, C.W / 2, C.H / 2 + 42);
      ctx.textAlign = 'left';
    }

    if (this.waveState === 'victory') {
      ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, C.W, C.H);
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 24;
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 42px Segoe UI, Arial, sans-serif';
      ctx.fillText('VICTORY!', C.W / 2, C.H / 2 - 48);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#88FF88'; ctx.font =  '11px Segoe UI, Arial, sans-serif'; ctx.fillText('All 10 waves + The Overlord defeated!', C.W / 2, C.H / 2);
      ctx.fillStyle = '#FFF';    ctx.font =  '11px Segoe UI, Arial, sans-serif'; ctx.fillText(`Final Score: ${this.score}`, C.W / 2, C.H / 2 + 36);
      ctx.fillStyle = '#555';    ctx.font =  '11px Segoe UI, Arial, sans-serif'; ctx.fillText('ENTER  to return to menu', C.W / 2, C.H / 2 + 72);
      ctx.textAlign = 'left';
    }

    if (this.waveState === 'game_over') {
      ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, C.W, C.H);
      ctx.textAlign = 'center';
      ctx.shadowColor = '#FF3333'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#FF3333'; ctx.font = 'bold 42px Segoe UI, Arial, sans-serif';
      ctx.fillText('GAME OVER', C.W / 2, C.H / 2 - 48);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ccc'; ctx.font =  '11px Segoe UI, Arial, sans-serif';
      const statusLine = this.boss
        ? `Wave ${this.wave}  ·  Fell to The Overlord`
        : `Wave ${this.wave}  ·  ${HORDE_WAVES.length - this.wave} waves remaining`;
      ctx.fillText(statusLine, C.W / 2, C.H / 2);
      ctx.fillStyle = '#FFF'; ctx.font =  '11px Segoe UI, Arial, sans-serif'; ctx.fillText(`Score: ${this.score}`, C.W / 2, C.H / 2 + 36);
      ctx.fillStyle = '#555'; ctx.font =  '11px Segoe UI, Arial, sans-serif'; ctx.fillText('ENTER  to return to menu', C.W / 2, C.H / 2 + 72);
      ctx.textAlign = 'left';
    }
  }
}
