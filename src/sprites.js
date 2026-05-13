// All pixel-art drawing functions
const Sprites = {

  // Draw a pixelated rectangle (snapped to PX grid)
  px(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  drawShadow(ctx, x, y, w) {
    ctx.fillStyle = C.COL.SHADOW;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  // Draw boy (P1) character
  // x,y = feet center, dir = 1 (right) or -1 (left)
  drawBoy(ctx, x, y, state, dir, armAngle, hasBall) {
    const p = C.PX;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (dir < 0) ctx.scale(-1, 1);
    ctx.scale(0.8, 0.8);

    const blink = Math.floor(Date.now() / 3000) % 8 === 0;

    // Shadow
    this.drawShadow(ctx, 0, 0, 20);

    // Legs (animated)
    const legOff = state === 'running' ? Math.sin(Date.now() / 100) * 5 : 0;
    const crouching = state === 'crouch';

    if (crouching) {
      // Very low crouch — legs splayed wide, torso compressed
      this.px(ctx, C.COL.BOY_PANTS, -12, -8, 10, 8);
      this.px(ctx, C.COL.BOY_PANTS, 4, -8, 10, 8);
      this.px(ctx, C.COL.SHOE, -14, -3, 12, 5);
      this.px(ctx, C.COL.SHOE, 4, -3, 12, 5);
    } else {
      // Standing legs
      this.px(ctx, C.COL.BOY_PANTS, -8, -32, 8, 20);
      this.px(ctx, C.COL.BOY_PANTS, 2, -32, 8, 20);
      this.px(ctx, C.COL.SHOE, -10, -14, 11, 7);
      this.px(ctx, C.COL.SHOE, 1, -14 + (legOff > 0 ? -legOff : 0), 11, 7);
      this.px(ctx, C.COL.SHOE, -10, -14 + (legOff < 0 ? legOff : 0), 11, 7);
    }

    const bodyTop = crouching ? -22 : -56;
    const bodyH = crouching ? 14 : 22;

    // Torso
    this.px(ctx, C.COL.BOY_SHIRT, -10, bodyTop, 22, bodyH);

    // Throwing arm (back arm) - always visible
    const backArmY = bodyTop + 6;
    this.px(ctx, C.COL.BOY_SHIRT, -14, backArmY, 6, 14);
    this.px(ctx, C.COL.SKIN, -14, backArmY + 12, 6, 8);

    // Throwing / idle front arm
    if (state === 'throwing' || hasBall) {
      // Arm rotated to aim angle
      ctx.save();
      ctx.translate(10, bodyTop + 8);
      ctx.rotate(-armAngle);
      this.px(ctx, C.COL.BOY_SHIRT, 0, -3, 18, 7);
      this.px(ctx, C.COL.SKIN, 16, -3, 8, 7);
      if (hasBall) {
        ctx.fillStyle = C.COL.BALL;
        ctx.beginPath();
        ctx.arc(26, 0, C.BALL_R * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.COL.BALL_STRIPE;
        ctx.fillRect(20, -1, 12, 2);
      }
      ctx.restore();
    } else {
      // Normal front arm
      this.px(ctx, C.COL.BOY_SHIRT, 10, bodyTop + 6, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, bodyTop + 18, 6, 8);
    }

    // Head
    const headY = bodyTop - 22;
    this.px(ctx, C.COL.SKIN, -9, headY, 20, 22);

    // Hair (brown-yellow with straight-cut bangs)
    this.px(ctx, C.COL.JACO_HAIR, -10, headY - 2, 22, 10); // top
    this.px(ctx, C.COL.JACO_HAIR, -10, headY - 2, 4, 22); // left side
    this.px(ctx, C.COL.JACO_HAIR, 8, headY - 2, 4, 22); // right side
    this.px(ctx, C.COL.JACO_HAIR_DARK, -10, headY + 8, 22, 3); // bangs line

    // Eyes
    if (!blink) {
      this.px(ctx, C.COL.EYE, -3, headY + 10, 4, 5);
      this.px(ctx, C.COL.EYE, 4, headY + 10, 4, 5);
      // Eye shine
      this.px(ctx, '#fff', -2, headY + 10, 2, 2);
      this.px(ctx, '#fff', 5, headY + 10, 2, 2);
    } else {
      this.px(ctx, C.COL.EYE, -3, headY + 13, 4, 2);
      this.px(ctx, C.COL.EYE, 4, headY + 13, 4, 2);
    }

    // Mouth (small smile)
    this.px(ctx, '#C06060', -1, headY + 17, 5, 2);

    ctx.restore();
  },

  // Draw girl (P2) character
  drawGirl(ctx, x, y, state, dir, armAngle, hasBall) {
    const p = C.PX;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (dir < 0) ctx.scale(-1, 1);
    ctx.scale(0.8, 0.8);

    const blink = Math.floor(Date.now() / 3500) % 8 === 0;
    const legOff = state === 'running' ? Math.sin(Date.now() / 100) * 5 : 0;
    const crouching = state === 'crouch';

    this.drawShadow(ctx, 0, 0, 20);

    // Legs
    if (crouching) {
      this.px(ctx, C.COL.GIRL_PANTS, -12, -8, 10, 8);
      this.px(ctx, C.COL.GIRL_PANTS, 4, -8, 10, 8);
      this.px(ctx, C.COL.SHOE, -14, -3, 12, 5);
      this.px(ctx, C.COL.SHOE, 4, -3, 12, 5);
    } else {
      this.px(ctx, C.COL.GIRL_PANTS, -8, -32, 8, 20);
      this.px(ctx, C.COL.GIRL_PANTS, 2, -32, 8, 20);
      this.px(ctx, C.COL.SHOE, -10, -14, 11, 7);
      this.px(ctx, C.COL.SHOE, 1, -14 + (legOff > 0 ? -legOff : 0), 11, 7);
      this.px(ctx, C.COL.SHOE, -10, -14 + (legOff < 0 ? legOff : 0), 11, 7);
    }

    const bodyTop = crouching ? -22 : -56;
    const bodyH = crouching ? 14 : 22;

    // Torso
    this.px(ctx, C.COL.GIRL_SHIRT, -10, bodyTop, 22, bodyH);

    // Back arm
    const backArmY = bodyTop + 6;
    this.px(ctx, C.COL.GIRL_SHIRT, -14, backArmY, 6, 14);
    this.px(ctx, C.COL.SKIN, -14, backArmY + 12, 6, 8);

    // Front arm
    if (state === 'throwing' || hasBall) {
      ctx.save();
      ctx.translate(10, bodyTop + 8);
      ctx.rotate(-armAngle);
      this.px(ctx, C.COL.GIRL_SHIRT, 0, -3, 18, 7);
      this.px(ctx, C.COL.SKIN, 16, -3, 8, 7);
      if (hasBall) {
        ctx.fillStyle = C.COL.BALL;
        ctx.beginPath();
        ctx.arc(26, 0, C.BALL_R * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.COL.BALL_STRIPE;
        ctx.fillRect(20, -1, 12, 2);
      }
      ctx.restore();
    } else {
      this.px(ctx, C.COL.GIRL_SHIRT, 10, bodyTop + 6, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, bodyTop + 18, 6, 8);
    }

    // Head
    const headY = bodyTop - 22;
    this.px(ctx, C.COL.SKIN, -9, headY, 20, 22);

    // Hair with straight-cut bangs
    this.px(ctx, C.COL.HAIR, -10, headY - 2, 22, 10);
    this.px(ctx, C.COL.HAIR, -10, headY - 2, 4, 22);
    this.px(ctx, C.COL.HAIR, 8, headY - 2, 4, 22);
    this.px(ctx, C.COL.HAIR_DARK, -10, headY + 8, 22, 3); // bangs line

    // Ponytail (sticking out to the back = left when facing right)
    this.px(ctx, C.COL.HAIR, -22, headY + 2, 14, 8);
    this.px(ctx, C.COL.HAIR, -26, headY + 6, 8, 6);
    this.px(ctx, C.COL.HAIR_DARK, -14, headY + 4, 4, 4); // tie

    // Eyes
    if (!blink) {
      this.px(ctx, C.COL.EYE, -3, headY + 10, 4, 5);
      this.px(ctx, C.COL.EYE, 4, headY + 10, 4, 5);
      this.px(ctx, '#fff', -2, headY + 10, 2, 2);
      this.px(ctx, '#fff', 5, headY + 10, 2, 2);
    } else {
      this.px(ctx, C.COL.EYE, -3, headY + 13, 4, 2);
      this.px(ctx, C.COL.EYE, 4, headY + 13, 4, 2);
    }

    // Mouth
    this.px(ctx, '#C06060', -1, headY + 17, 5, 2);

    ctx.restore();
  },

  drawBall(ctx, x, y, spinning, ghostMode) {
    const t = Date.now() / 80;
    const spinOffset = spinning ? Math.sin(t) * C.BALL_R : 0;

    if (ghostMode) ctx.globalAlpha = 0.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + C.BALL_R + 2, C.BALL_R * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball
    ctx.fillStyle = C.COL.BALL;
    ctx.beginPath();
    ctx.arc(x, y, C.BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Stripe
    ctx.fillStyle = C.COL.BALL_STRIPE;
    ctx.fillRect(x - C.BALL_R + 2, y + spinOffset - 2, (C.BALL_R - 2) * 2, 3);

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, C.BALL_R * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  },

  drawShield(ctx, x, y, dir) {
    const sx = x + dir * 18;
    ctx.strokeStyle = C.COL.SHIELD_RING;
    ctx.lineWidth = 3;
    ctx.fillStyle = C.COL.SHIELD;
    ctx.beginPath();
    ctx.ellipse(sx, y - 28, 18, 32, dir * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },

  drawCatchRing(ctx, x, y) {
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 100);
    ctx.strokeStyle = `rgba(80,255,120,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 28, C.CATCH_RADIUS * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  },

  drawGhostOverlay(ctx, x, y) {
    ctx.fillStyle = 'rgba(180,80,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y - 28, 20, 35, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  drawStunStars(ctx, x, y) {
    const t = Date.now() / 200;
    for (let i = 0; i < 3; i++) {
      const angle = t + (i * Math.PI * 2 / 3);
      const sx = x + Math.cos(angle) * 18;
      const sy = y - 65 + Math.sin(angle) * 8;
      ctx.fillStyle = '#FFD700';
      ctx.font = '14px serif';
      ctx.fillText('★', sx - 7, sy);
    }
  },

  // HUD
  drawHUD(ctx, p1, p2, arena) {
    const cx = C.W / 2;

    // Background strip — slightly taller, stronger gradient
    const strip = ctx.createLinearGradient(0, 0, 0, 88);
    strip.addColorStop(0, 'rgba(0,0,0,0.92)');
    strip.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = strip;
    ctx.fillRect(0, 0, C.W, 88);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 87, C.W, 1);

    // === CENTRAL SCORE PANEL ===
    const panW = 272, panH = 62, panX = cx - panW / 2, panY = 2;

    // Panel background
    const panGrad = ctx.createLinearGradient(panX, panY, panX, panY + panH);
    panGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    panGrad.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = panGrad;
    ctx.fillRect(panX, panY, panW, panH);

    // Panel border
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panX, panY, panW, panH);

    // Team-color accent stripes at top of panel
    ctx.fillStyle = C.COL.P1_HUD;
    ctx.fillRect(panX + 1, panY, panW / 2 - 2, 3);
    ctx.fillStyle = C.COL.P2_HUD;
    ctx.fillRect(cx + 1, panY, panW / 2 - 2, 3);

    // Center divider
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(cx - 1, panY + 8, 2, panH - 16);

    // Player names
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px "Courier New"';
    ctx.fillStyle = C.COL.P1_HUD;
    ctx.fillText(C.P1_NAME, cx - 78, 19);
    ctx.fillStyle = C.COL.P2_HUD;
    ctx.fillText(C.P2_NAME, cx + 78, 19);

    // Leading player indicator — pulsing glow on the leader's score
    const leading = p1.score > p2.score ? 0 : p2.score > p1.score ? 1 : -1;
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 260);

    // Score numbers
    ctx.font = 'bold 42px "Courier New"';

    ctx.shadowColor = C.COL.P1_HUD;
    ctx.shadowBlur = leading === 0 ? 18 * pulse : 5;
    ctx.fillStyle = C.COL.P1_HUD;
    ctx.fillText(p1.score, cx - 78, 57);

    ctx.shadowColor = C.COL.P2_HUD;
    ctx.shadowBlur = leading === 1 ? 18 * pulse : 5;
    ctx.fillStyle = C.COL.P2_HUD;
    ctx.fillText(p2.score, cx + 78, 57);
    ctx.shadowBlur = 0;

    // Win dots — glowing when lit
    const dotR = 4, dotGap = 10;
    for (let i = 0; i < C.WIN_SCORE; i++) {
      const lit1 = i < p1.score, lit2 = i < p2.score;

      ctx.shadowColor = C.COL.P1_HUD;
      ctx.shadowBlur = lit1 ? 8 : 0;
      ctx.fillStyle = lit1 ? C.COL.P1_HUD : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(cx - 16 - i * dotGap, 75, dotR, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = C.COL.P2_HUD;
      ctx.shadowBlur = lit2 ? 8 : 0;
      ctx.fillStyle = lit2 ? C.COL.P2_HUD : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(cx + 16 + i * dotGap, 75, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // === PLAYER STATUS BARS ===
    this._drawStatusBars(ctx, p1, 10, 1);
    this._drawStatusBars(ctx, p2, C.W - 10, -1);

    // Arena name badge + ESC hint
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '9px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(arena.name, cx, C.H - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '8px "Courier New"';
    ctx.fillText('ESC · menu', cx, C.H - 16);
    ctx.textAlign = 'left';
  },

  _drawStatusBars(ctx, player, anchorX, dir) {
    const BW = 244, BH = 16, IW = 20;
    const x = dir > 0 ? anchorX : anchorX - BW;
    const sfx = dir > 0 ? x + IW : x, sfw = BW - IW;

    // --- Shield bar (y=6) ---
    const sy = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, sy, BW, BH);
    const sIconX = dir > 0 ? x : x + BW - IW;
    this._iconShield(ctx, sIconX + 2, sy + 2, IW - 4, BH - 4,
      player.shieldAvailable ? C.COL.SHIELD_RING : '#2a4a6a');
    if (player.shieldAvailable) {
      ctx.fillStyle = C.COL.SHIELD_RING;
      ctx.fillRect(sfx + 1, sy + 2, sfw - 2, BH - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = 'bold 8px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText('SHIELD  READY', sfx + sfw / 2, sy + BH - 4);
    } else {
      const pct = 1 - (player.shieldCooldown / C.SHIELD_RECHARGE);
      ctx.fillStyle = '#1a3a5a';
      ctx.fillRect(sfx + 1, sy + 2, Math.max(0, (sfw - 2) * pct), BH - 4);
      ctx.fillStyle = '#4d84bb';
      ctx.font = '8px "Courier New"';
      ctx.textAlign = 'center';
      ctx.fillText(`RECHARGING  ${Math.ceil(player.shieldCooldown / 1000)}s`, sfx + sfw / 2, sy + BH - 4);
    }

    // --- Power bar (y=28) ---
    const py = 28;
    const spPct = player.spCharge / C.SP_CHARGE_MAX;
    const ready = spPct >= 1;
    const pColors = { rocket: C.COL.SP_ROCKET, double: C.COL.SP_DOUBLE, shadow: C.COL.SP_SHADOW };
    const pCol = pColors[player.currentPower] || '#FFD700';
    const pfx = dir > 0 ? x + IW : x, pfw = BW - IW;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, py, BW, BH);
    const pIconX = dir > 0 ? x : x + BW - IW;
    this._iconPower(ctx, pIconX + 2, py + 2, IW - 4, BH - 4, player.currentPower, ready ? pCol : '#444');

    ctx.fillStyle = ready ? pCol : '#242424';
    ctx.fillRect(pfx + 1, py + 2, Math.max(0, (pfw - 2) * spPct), BH - 4);
    if (ready) {
      const pulse = 0.4 + 0.6 * Math.sin(Date.now() / 200);
      ctx.globalAlpha = pulse * 0.45;
      ctx.fillStyle = '#fff';
      ctx.fillRect(pfx + 1, py + 2, (pfw - 2) * spPct, BH - 4);
      ctx.globalAlpha = 1;
    }
    const pName = C.POWER_NAMES[player.currentPower] || '';
    ctx.fillStyle = ready ? '#FFD700' : '#555';
    ctx.font = `${ready ? 'bold ' : ''}8px "Courier New"`;
    ctx.textAlign = 'center';
    ctx.fillText(ready ? `★ ${pName} — THROW TO USE ★` : 'POWER CHARGING', pfx + pfw / 2, py + BH - 4);
    ctx.textAlign = 'left';
  },

  _iconShield(ctx, x, y, w, h, color) {
    const r = Math.round;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, r(h * 0.62));
    ctx.fillRect(x + r(w * 0.12), y + r(h * 0.62), r(w * 0.76), r(h * 0.24));
    ctx.fillRect(x + r(w * 0.28), y + r(h * 0.84), r(w * 0.44), r(h * 0.12));
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 1, y + 1, r(w * 0.35), r(h * 0.38));
  },

  _iconPower(ctx, x, y, w, h, type, color) {
    const r = Math.round;
    ctx.fillStyle = color;
    const mx = x + r(w / 2);
    if (type === 'rocket') {
      const bw = r(w * 0.32), bx = mx - r(bw / 2);
      ctx.fillRect(bx, y + r(h * 0.38), bw, r(h * 0.62));
      ctx.beginPath();
      ctx.moveTo(mx, y);
      ctx.lineTo(bx + bw, y + r(h * 0.42));
      ctx.lineTo(bx, y + r(h * 0.42));
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x, y + r(h * 0.6), r(w * 0.3), r(h * 0.28));
      ctx.fillRect(x + r(w * 0.7), y + r(h * 0.6), r(w * 0.3), r(h * 0.28));
    } else if (type === 'double') {
      // Two small balls side by side
      ctx.beginPath();
      ctx.arc(x + r(w * 0.3), y + r(h / 2), r(w * 0.24), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r(w * 0.72), y + r(h / 2), r(w * 0.24), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + r(w * 0.14), y + r(h / 2) - 1, r(w * 0.32), 2);
      ctx.fillRect(x + r(w * 0.56), y + r(h / 2) - 1, r(w * 0.32), 2);
    } else if (type === 'shadow') {
      // Semi-transparent ghost shape
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(mx, y + r(h * 0.42), r(w * 0.42), Math.PI, 0);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(mx - r(w * 0.22), y + r(h * 0.3), 2, 3);
      ctx.fillRect(mx + r(w * 0.08), y + r(h * 0.3), 2, 3);
    } else {
      // Fallback: filled rect
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
  },

  // Stylized mini-scene for arena select cards
  drawArenaIcon(ctx, idx, x, y, w, skyH) {
    const gy = y + skyH; // ground-level y in the card
    if (idx === 0) { // SCHOOLYARD
      const bx = x + Math.round(w * 0.3), bw = Math.round(w * 0.42);
      const by = y + Math.round(skyH * 0.08), bh = Math.round(skyH * 0.72);
      this.px(ctx, '#B0BEC5', bx, by, bw, bh);
      this.px(ctx, '#90A4AE', bx - 4, by - 8, bw + 8, 10);
      this.px(ctx, '#78909C', bx + Math.round(bw * 0.38), by - 20, Math.round(bw * 0.24), 14);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        this.px(ctx, '#BBDEFB', bx + 7 + c * Math.round(bw * 0.3), by + 10 + r * 22, 10, 14);
      }
      this.px(ctx, '#5D4037', bx + Math.round(bw * 0.42), gy - 16, 14, 16);
      this.px(ctx, '#888', bx + Math.round(bw * 0.52), by - 34, 2, 16);
      ctx.fillStyle = '#E53935';
      ctx.fillRect(bx + Math.round(bw * 0.52) + 2, by - 34, 10, 8);
      // Tree
      this.px(ctx, '#6B4226', x + Math.round(w * 0.1), y + Math.round(skyH * 0.48), 5, Math.round(skyH * 0.52));
      this.px(ctx, '#2E7D32', x + Math.round(w * 0.04), y + Math.round(skyH * 0.22), 18, 26);
      this.px(ctx, '#43A047', x + Math.round(w * 0.06), y + Math.round(skyH * 0.06), 14, 22);
      // Bench
      this.px(ctx, '#A0522D', x + Math.round(w * 0.74), gy - 8, 26, 4);
      this.px(ctx, '#6B3A10', x + Math.round(w * 0.76), gy - 4, 4, 4);
      this.px(ctx, '#6B3A10', x + Math.round(w * 0.93), gy - 4, 4, 4);
    } else if (idx === 1) { // BEACH
      // Sun
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(x + Math.round(w * 0.82), y + 18, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,215,0,0.22)';
      ctx.beginPath(); ctx.arc(x + Math.round(w * 0.82), y + 18, 24, 0, Math.PI * 2); ctx.fill();
      // Ocean
      ctx.fillStyle = '#0077BE';
      ctx.fillRect(x, gy - 20, w, 22);
      ctx.fillStyle = '#0099DD';
      ctx.fillRect(x, gy - 20, w, 9);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, gy - 11);
      ctx.bezierCurveTo(x + w * 0.2, gy - 17, x + w * 0.45, gy - 5, x + w * 0.65, gy - 11);
      ctx.bezierCurveTo(x + w * 0.8, gy - 16, x + w * 0.9, gy - 8, x + w, gy - 11);
      ctx.stroke();
      // Palm
      for (let seg = 0; seg < 5; seg++) {
        this.px(ctx, '#8B6914', x + Math.round(w * 0.13) + seg, gy - 8 - seg * 10, 5, 12);
      }
      ctx.fillStyle = '#2E7D32';
      ctx.fillRect(x + Math.round(w * 0.02), y + Math.round(skyH * 0.28), 26, 6);
      ctx.fillRect(x + Math.round(w * 0.06), y + Math.round(skyH * 0.14), 22, 6);
      ctx.fillRect(x + Math.round(w * 0.12), y + Math.round(skyH * 0.06), 18, 5);
      // Sandcastle
      const scx = x + Math.round(w * 0.55);
      this.px(ctx, '#D2B48C', scx, gy - 22, 38, 22);
      this.px(ctx, '#C8A87A', scx + 3, gy - 30, 10, 10);
      this.px(ctx, '#C8A87A', scx + 25, gy - 30, 10, 10);
      this.px(ctx, '#C8A87A', scx + 13, gy - 36, 12, 16);
      // Umbrella
      const ucx = x + Math.round(w * 0.44);
      this.px(ctx, '#888', ucx - 1, gy - 40, 3, 40);
      ctx.fillStyle = '#FF5252';
      ctx.beginPath(); ctx.arc(ucx, gy - 40, 14, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.moveTo(ucx, gy - 40);
      ctx.arc(ucx, gy - 40, 14, Math.PI * 1.25, Math.PI * 1.5);
      ctx.fill();
    } else if (idx === 2) { // GYM
      // Grid
      ctx.strokeStyle = 'rgba(180,190,200,0.4)'; ctx.lineWidth = 1;
      for (let gx = x + 30; gx < x + w; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, gy); ctx.stroke();
      }
      for (let gyo = y + 30; gyo < gy; gyo += 30) {
        ctx.beginPath(); ctx.moveTo(x, gyo); ctx.lineTo(x + w, gyo); ctx.stroke();
      }
      // Ceiling light
      this.px(ctx, '#FFEE88', x + Math.round(w * 0.38), y, Math.round(w * 0.24), 7);
      ctx.fillStyle = 'rgba(255,240,120,0.15)';
      ctx.fillRect(x + Math.round(w * 0.32), y + 7, Math.round(w * 0.36), 22);
      // Basketball hoop
      this.px(ctx, '#777', x + 14, y + Math.round(skyH * 0.3), 5, Math.round(skyH * 0.68));
      this.px(ctx, '#777', x + 8, y + Math.round(skyH * 0.28), 24, 4);
      ctx.strokeStyle = '#E65100'; ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 8, y + Math.round(skyH * 0.3), 20, 11);
      // Balance beam
      this.px(ctx, '#8B8B8B', x + Math.round(w * 0.36), gy - 20, 5, 20);
      this.px(ctx, '#8B8B8B', x + Math.round(w * 0.61), gy - 20, 5, 20);
      this.px(ctx, '#A0522D', x + Math.round(w * 0.28), gy - 20, Math.round(w * 0.44), 6);
      this.px(ctx, '#C8854A', x + Math.round(w * 0.3), gy - 18, Math.round(w * 0.4), 3);
      // Gymnastics box
      this.px(ctx, '#C8854A', x + Math.round(w * 0.72), gy - 24, 30, 24);
      this.px(ctx, '#E0A060', x + Math.round(w * 0.74), gy - 22, 26, 8);
      this.px(ctx, '#5D4037', x + Math.round(w * 0.72), gy - 24, 30, 5);
    } else if (idx === 3) { // FOREST
      // Background tree trunks
      [0.06, 0.2, 0.72, 0.9].forEach(fx => {
        this.px(ctx, '#3D2010', x + Math.round(w * fx), y, 9, skyH);
        this.px(ctx, '#5A3218', x + Math.round(w * fx) + 3, y, 3, skyH);
      });
      // Dense canopy top
      this.px(ctx, '#0D2A0D', x, y, w, Math.round(skyH * 0.22));
      for (let lx = x; lx < x + w; lx += Math.round(w * 0.35)) {
        this.px(ctx, '#1D5C1D', lx + 4, y + 4, Math.round(w * 0.28), Math.round(skyH * 0.14));
      }
      // Light ray
      ctx.fillStyle = 'rgba(200,255,150,0.08)';
      ctx.beginPath();
      ctx.moveTo(x + Math.round(w * 0.52), y);
      ctx.lineTo(x + Math.round(w * 0.64), y + skyH);
      ctx.lineTo(x + Math.round(w * 0.4), y + skyH);
      ctx.closePath();
      ctx.fill();
      // Branch platform
      this.px(ctx, '#4A2E0A', x + Math.round(w * 0.22), y + Math.round(skyH * 0.55), Math.round(w * 0.56), 5);
      this.px(ctx, '#1A5C1A', x + Math.round(w * 0.2), y + Math.round(skyH * 0.46), Math.round(w * 0.32), 9);
      // Animated birds
      const t = Date.now() / 600;
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
      const b1x = x + Math.round(w * 0.38 + w * 0.12 * Math.sin(t));
      const b1y = y + Math.round(skyH * 0.34);
      ctx.beginPath(); ctx.moveTo(b1x - 5, b1y); ctx.lineTo(b1x, b1y - 3); ctx.lineTo(b1x + 5, b1y); ctx.stroke();
      const b2x = x + Math.round(w * 0.62 + w * 0.09 * Math.sin(t + 1.8));
      const b2y = y + Math.round(skyH * 0.2);
      ctx.beginPath(); ctx.moveTo(b2x - 4, b2y); ctx.lineTo(b2x, b2y - 3); ctx.lineTo(b2x + 4, b2y); ctx.stroke();
    } else if (idx === 4) { // LAB
      // White tiled wall
      ctx.fillStyle = '#F0F4F8';
      ctx.fillRect(x, y, w, skyH);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
      for (let gx = x + 18; gx < x + w; gx += 18) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + skyH); ctx.stroke();
      }
      for (let gyo = y + 18; gyo < y + skyH; gyo += 18) {
        ctx.beginPath(); ctx.moveTo(x, gyo); ctx.lineTo(x + w, gyo); ctx.stroke();
      }
      // Ceiling light
      this.px(ctx, '#FFEE88', x + Math.round(w * 0.32), y, Math.round(w * 0.36), 6);
      ctx.fillStyle = 'rgba(255,240,120,0.2)';
      ctx.fillRect(x + Math.round(w * 0.26), y + 6, Math.round(w * 0.48), 16);
      // Left tube
      this.px(ctx, '#6677AA', x, y + Math.round(skyH * 0.36), 12, 20);
      ctx.fillStyle = 'rgba(100,200,255,0.5)';
      ctx.fillRect(x + 2, y + Math.round(skyH * 0.38), 8, 16);
      // Right tube
      this.px(ctx, '#6677AA', x + w - 12, y + Math.round(skyH * 0.55), 12, 20);
      ctx.fillStyle = 'rgba(100,200,255,0.5)';
      ctx.fillRect(x + w - 10, y + Math.round(skyH * 0.57), 8, 16);
      // Beakers near bottom
      const ty = y + skyH - 20;
      this.px(ctx, '#AACCFF', x + Math.round(w * 0.38), ty, 9, 16);
      this.px(ctx, '#88AAFF', x + Math.round(w * 0.39), ty - 4, 7, 5);
      this.px(ctx, '#FFEEAA', x + Math.round(w * 0.55), ty, 9, 16);
      this.px(ctx, '#FFDD88', x + Math.round(w * 0.56), ty - 4, 7, 5);
    }
  },

  drawThrowPower(ctx, x, y, charge, dir) {
    const w = 50;
    const sx = x + dir * 12;
    const barX = dir > 0 ? sx : sx - w;
    const barY = y - 80;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, w, 8);
    const pct = Math.min(1, charge / C.THROW_CHARGE_TIME);
    const col = pct < 0.5 ? '#88FF44' : pct < 0.8 ? '#FFD700' : '#FF4444';
    ctx.fillStyle = col;
    ctx.fillRect(barX + 1, barY + 1, (w - 2) * pct, 6);
  },
};
