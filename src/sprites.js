// All pixel-art drawing functions
const Sprites = {

  // Draw a pixelated rectangle (snapped to PX grid)
  px(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },

  // Lighten (+amt) or darken (-amt) a #RRGGBB colour; passes through non-hex values
  _shade(hex, amt) {
    if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex;
    const n = parseInt(hex.slice(1), 16);
    const cl = v => Math.max(0, Math.min(255, v));
    return `rgb(${cl((n >> 16) + amt)},${cl(((n >> 8) & 255) + amt)},${cl((n & 255) + amt)})`;
  },

  // Body bob + lean + jump stretch, applied inside the character's transform
  _pose(ctx, state) {
    const t = Date.now();
    if (state === 'running') {
      ctx.rotate(0.13);
      return Math.abs(Math.sin(t / 100)) * -4;
    }
    if (state === 'jumping') { ctx.scale(0.88, 1.12); return -2; }
    if (state === 'throwing') { ctx.rotate(0.08); return 0; }
    if (state === 'victory') {
      // Big celebratory hop
      return -Math.abs(Math.sin(t / 220)) * 10;
    }
    if (state === 'defeat') {
      // Slumped forward, deflated
      ctx.rotate(0.22);
      ctx.scale(1, 0.92);
      return 3;
    }
    return Math.sin(t / 600) * 1.8; // idle breathing
  },

  drawShadow(ctx, x, y, w) {
    ctx.fillStyle = C.COL.SHADOW;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  // Draw boy (P1) character
  // x,y = feet center, dir = 1 (right) or -1 (left)
  // colors: optional { shirt, pants, hair, hairDark } overrides
  drawBoy(ctx, x, y, state, dir, armAngle, hasBall, colors) {
    const shirt    = (colors && colors.shirt)    || C.COL.BOY_SHIRT;
    const pants    = (colors && colors.pants)    || C.COL.BOY_PANTS;
    const hair     = (colors && colors.hair)     || C.COL.JACO_HAIR;
    const hairDark = (colors && colors.hairDark) || C.COL.JACO_HAIR_DARK;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (dir < 0) ctx.scale(-1, 1);
    ctx.scale(0.8, 0.8);
    const bob = this._pose(ctx, state);

    const blink = Math.floor(Date.now() / 3000) % 8 === 0;

    // Shadow
    this.drawShadow(ctx, 0, 0, 20);

    // Legs (animated)
    const legOff = state === 'running' ? Math.sin(Date.now() / 100) * 5 : 0;
    const crouching = state === 'crouch';

    if (crouching) {
      this.px(ctx, pants, -12, -8, 10, 8);
      this.px(ctx, pants, 4, -8, 10, 8);
      this.px(ctx, C.COL.SHOE, -14, -3, 12, 5);
      this.px(ctx, C.COL.SHOE, 4, -3, 12, 5);
    } else {
      this.px(ctx, pants, -8, -32, 8, 20);
      this.px(ctx, pants, 2, -32, 8, 20);
      this.px(ctx, this._shade(pants, -50), -8, -32, 3, 20);
      this.px(ctx, this._shade(pants, -50), 2, -32, 3, 20);
      const foff = legOff > 0 ? -legOff : 0, boff = legOff < 0 ? legOff : 0;
      this.px(ctx, C.COL.SHOE, -10, -14, 11, 7);
      this.px(ctx, '#E8E8E8', -10, -9, 11, 2);
      this.px(ctx, C.COL.SHOE, 1, -14 + foff, 11, 7);
      this.px(ctx, '#E8E8E8', 1, -9 + foff, 11, 2);
      this.px(ctx, C.COL.SHOE, -10, -14 + boff, 11, 7);
      this.px(ctx, '#E8E8E8', -10, -9 + boff, 11, 2);
    }

    const bodyTop = (crouching ? -22 : -56) + bob;
    const bodyH = crouching ? 14 : 22;

    // Torso: dark outline, then shading (dark left edge, top highlight, dark hem)
    this.px(ctx, 'rgba(20,16,28,0.85)', -11, bodyTop - 1, 24, bodyH + 2);
    this.px(ctx, shirt, -10, bodyTop, 22, bodyH);
    this.px(ctx, this._shade(shirt, -55), -10, bodyTop, 4, bodyH);
    this.px(ctx, this._shade(shirt, 48), -6, bodyTop, 16, 3);
    this.px(ctx, this._shade(shirt, -42), -10, bodyTop + bodyH - 4, 22, 4);

    // Wings (drawn BEHIND body)
    this._drawAccessoryBack(ctx, (colors && colors.accessory) || 'none', bodyTop);

    // Shirt symbol (black outline + white fill so it's visible on any colour)
    const shirtSymbol = (colors && colors.shirtSymbol) || 'none';
    if (shirtSymbol && shirtSymbol !== 'none') {
      const sy = bodyTop + Math.round(bodyH * 0.68);
      ctx.font = '12px "Segoe UI Symbol","Segoe UI Emoji",Segoe UI,Arial,sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeText(shirtSymbol, 1, sy);
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(shirtSymbol, 1, sy);
      ctx.textAlign = 'left'; ctx.lineWidth = 1;
    }

    // Throwing arm (back arm)
    const backArmY = bodyTop + 6;
    if (state === 'victory') {
      // Both arms raised, pumping
      const pump = Math.sin(Date.now() / 220) * 3;
      this.px(ctx, shirt, -14, backArmY - 16 + pump, 6, 14);
      this.px(ctx, C.COL.SKIN, -14, backArmY - 22 + pump, 6, 8);
      this.px(ctx, shirt, 10, backArmY - 16 - pump, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, backArmY - 22 - pump, 6, 8);
    } else if (state === 'defeat') {
      // Arms hanging low
      this.px(ctx, shirt, -14, backArmY + 4, 6, 14);
      this.px(ctx, C.COL.SKIN, -14, backArmY + 16, 6, 8);
      this.px(ctx, shirt, 10, backArmY + 4, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, backArmY + 16, 6, 8);
    } else {
    this.px(ctx, shirt, -14, backArmY, 6, 14);
    this.px(ctx, C.COL.SKIN, -14, backArmY + 12, 6, 8);

    // Front arm
    if (state === 'throwing' || hasBall) {
      ctx.save();
      ctx.translate(10, bodyTop + 8);
      ctx.rotate(-armAngle);
      this.px(ctx, shirt, 0, -3, 18, 7);
      this.px(ctx, C.COL.SKIN, 16, -3, 8, 7);
      if (hasBall) {
        ctx.fillStyle = C.COL.BALL; ctx.beginPath(); ctx.arc(26, 0, C.BALL_R * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.COL.BALL_STRIPE; ctx.fillRect(20, -1, 12, 2);
      }
      ctx.restore();
    } else {
      this.px(ctx, shirt, 10, bodyTop + 6, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, bodyTop + 18, 6, 8);
    }
    }

    // Head
    const headY = bodyTop - 22;
    this.px(ctx, 'rgba(20,16,28,0.85)', -10, headY - 1, 22, 24);
    this.px(ctx, C.COL.SKIN, -9, headY, 20, 22);
    this.px(ctx, this._shade(C.COL.SKIN, -40), -9, headY, 3, 22);
    this.px(ctx, this._shade(C.COL.SKIN, 30), 6, headY + 3, 5, 15);

    // Hair — style switch
    const hairType = (colors && colors.hairType) || 'straight';
    const hairLight = this._shade(hair, 45);
    switch (hairType) {
      case 'spiky': {
        // Base band across head
        this.px(ctx, hair,     -10, headY,     22, 7);
        this.px(ctx, hairDark, -10, headY + 4, 22, 3);
        // Four sharp triangular spikes
        const spikesDef = [
          { bx: -9, bw: 8,  h: 17 },   // leftmost — medium
          { bx: -3, bw: 9,  h: 23 },   // center-left — tallest
          { bx:  4, bw: 8,  h: 19 },   // center-right
          { bx: 10, bw: 6,  h: 12 },   // rightmost — short
        ];
        for (const s of spikesDef) {
          const tipX = s.bx + s.bw / 2;
          const baseY = headY + 2;
          // Main spike fill
          ctx.fillStyle = hair;
          ctx.beginPath();
          ctx.moveTo(s.bx, baseY);
          ctx.lineTo(tipX, baseY - s.h);
          ctx.lineTo(s.bx + s.bw, baseY);
          ctx.closePath(); ctx.fill();
          // Dark shading on left face of spike
          ctx.fillStyle = hairDark;
          ctx.beginPath();
          ctx.moveTo(s.bx, baseY);
          ctx.lineTo(tipX, baseY - s.h);
          ctx.lineTo(tipX - 1, baseY);
          ctx.closePath(); ctx.fill();
          // Glossy highlight on right face of spike
          ctx.fillStyle = hairLight;
          ctx.beginPath();
          ctx.moveTo(tipX, baseY - s.h);
          ctx.lineTo(tipX + 2, baseY - s.h * 0.45);
          ctx.lineTo(tipX + 1, baseY - s.h * 0.35);
          ctx.closePath(); ctx.fill();
        }
        // Stray flyaway strands between spikes
        this.px(ctx, hairDark, -5, headY - 2, 1, 4);
        this.px(ctx, hairDark,  3, headY - 3, 1, 5);
        break;
      }
      case 'buzz':
        this.px(ctx, hair, -10, headY - 1, 22,  5);
        this.px(ctx, hair, -10, headY - 1,  3, 14);
        this.px(ctx, hair,   9, headY - 1,  3, 14);
        // Stubble texture — faded hairline + speckle dots
        this.px(ctx, hairDark, -10, headY + 3, 22, 1);
        this.px(ctx, hairLight, -7, headY, 6, 1);
        for (let i = 0; i < 8; i++) {
          this.px(ctx, hairDark, -9 + i * 2.5, headY + (i % 2), 1, 1);
        }
        this.px(ctx, hairDark, -10, headY + 10, 3, 3);
        this.px(ctx, hairDark,   9, headY + 10, 3, 3);
        break;
      case 'lionsmane':
        // Thick mane around head
        this.px(ctx, hair,     -14, headY - 4, 30, 10);
        this.px(ctx, hair,     -14, headY - 4,  6, 28);
        this.px(ctx, hair,      10, headY - 4,  6, 28);
        this.px(ctx, hair,      -8, headY + 20,  18, 8);
        this.px(ctx, hairDark, -14, headY + 6, 30,  4);
        this.px(ctx, hair,     -16, headY,     5, 20);
        this.px(ctx, hair,      13, headY,     5, 20);
        // Shaggy tufted edges — jagged tips instead of flat ends
        this.px(ctx, hair,     -16, headY + 20, 3, 5);
        this.px(ctx, hair,      15, headY + 20, 3, 5);
        this.px(ctx, hair,     -12, headY + 24, 3, 4);
        this.px(ctx, hair,      11, headY + 24, 3, 4);
        this.px(ctx, hair,      -6, headY + 28, 3, 3);
        this.px(ctx, hair,       5, headY + 28, 3, 3);
        // Strand shading through the mane
        this.px(ctx, hairDark, -13, headY - 2, 1, 22);
        this.px(ctx, hairDark,  13, headY - 2, 1, 22);
        this.px(ctx, hairDark,  -5, headY + 22, 1, 5);
        this.px(ctx, hairDark,   4, headY + 22, 1, 5);
        // Crown highlight
        this.px(ctx, hairLight, -8, headY - 3, 14, 2);
        this.px(ctx, hairLight, -14, headY + 2, 2, 8);
        break;
      case 'star':
        // Central cap
        this.px(ctx, hair, -10, headY, 22, 6);
        // 6 spikes radiating
        this.px(ctx, hair,  -1, headY - 14,  4, 16);
        this.px(ctx, hair,  -8, headY - 10,  4, 14);
        this.px(ctx, hair,   6, headY - 10,  4, 14);
        this.px(ctx, hair, -13, headY - 6,   5, 10);
        this.px(ctx, hair,  10, headY - 6,   5, 10);
        this.px(ctx, hairDark, -10, headY + 4, 22, 3);
        // Tapered spike tips + per-spike shading
        this.px(ctx, hair,   0, headY - 17, 2, 3);
        this.px(ctx, hair,  -7, headY - 12, 2, 2);
        this.px(ctx, hair,   7, headY - 12, 2, 2);
        this.px(ctx, hairDark, -1, headY - 14, 1, 16);
        this.px(ctx, hairDark, -8, headY - 10, 1, 14);
        this.px(ctx, hairDark,  6, headY - 10, 1, 14);
        this.px(ctx, hairLight, 1, headY - 13, 1, 10);
        this.px(ctx, hairLight, 8, headY - 9, 1, 8);
        this.px(ctx, hairLight, -6, headY - 9, 1, 8);
        break;
      default: // straight
        // Rounded crown instead of flat top
        ctx.fillStyle = hair;
        ctx.beginPath(); ctx.arc(1, headY + 1, 11.5, Math.PI, 0); ctx.fill();
        this.px(ctx, hair,     -10, headY - 2, 22, 10);
        this.px(ctx, hair,     -10, headY - 2,  4, 22);
        this.px(ctx, hair,       8, headY - 2,  4, 22);
        // Jagged fringe — uneven bang tips over the forehead
        this.px(ctx, hair, -6, headY + 8, 3, 3);
        this.px(ctx, hair, -1, headY + 8, 3, 2);
        this.px(ctx, hair,  4, headY + 8, 3, 3);
        // Shadow under fringe + strand part lines
        this.px(ctx, hairDark, -10, headY + 6, 22, 2);
        this.px(ctx, hairDark, -4, headY - 3, 1, 9);
        this.px(ctx, hairDark,  3, headY - 3, 1, 9);
        this.px(ctx, hairDark, -9, headY + 12, 2, 10);
        this.px(ctx, hairDark,  9, headY + 12, 2, 10);
        // Glossy highlight streak on the crown
        this.px(ctx, hairLight, -6, headY - 5, 8, 2);
        this.px(ctx, hairLight, -8, headY - 3, 3, 1);
        break;
    }

    // Eyes
    if (!blink) {
      this.px(ctx, C.COL.EYE, -3, headY + 10, 4, 5);
      this.px(ctx, C.COL.EYE,  4, headY + 10, 4, 5);
      this.px(ctx, '#fff', -2, headY + 10, 2, 2);
      this.px(ctx, '#fff',  5, headY + 10, 2, 2);
    } else {
      this.px(ctx, C.COL.EYE, -3, headY + 13, 4, 2);
      this.px(ctx, C.COL.EYE,  4, headY + 13, 4, 2);
    }

    this.px(ctx, hairDark, -3, headY + 7, 4, 2);
    this.px(ctx, hairDark, 4, headY + 7, 4, 2);
    this.px(ctx, this._shade(C.COL.SKIN, -25), 1, headY + 14, 2, 2);
    this.px(ctx, 'rgba(255,120,120,0.6)', -7, headY + 15, 4, 2);
    this.px(ctx, 'rgba(255,120,120,0.6)', 6, headY + 15, 4, 2);
    this.px(ctx, '#C06060', -1, headY + 17, 5, 2);
    this._drawAccessory(ctx, (colors && colors.accessory) || 'none', headY, hair, hairDark);
    ctx.restore();
  },

  // Draw girl (P2) character
  // colors: optional { shirt, pants, hair, hairDark } overrides
  drawGirl(ctx, x, y, state, dir, armAngle, hasBall, colors) {
    const shirt    = (colors && colors.shirt)    || C.COL.GIRL_SHIRT;
    const pants    = (colors && colors.pants)    || C.COL.GIRL_PANTS;
    const hair     = (colors && colors.hair)     || C.COL.HAIR;
    const hairDark = (colors && colors.hairDark) || C.COL.HAIR_DARK;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (dir < 0) ctx.scale(-1, 1);
    ctx.scale(0.8, 0.8);
    const bob = this._pose(ctx, state);

    const blink = Math.floor(Date.now() / 3500) % 8 === 0;
    const legOff = state === 'running' ? Math.sin(Date.now() / 100) * 5 : 0;
    const crouching = state === 'crouch';

    this.drawShadow(ctx, 0, 0, 20);

    // Legs
    if (crouching) {
      this.px(ctx, pants, -12, -8, 10, 8);
      this.px(ctx, pants, 4, -8, 10, 8);
      this.px(ctx, C.COL.SHOE, -14, -3, 12, 5);
      this.px(ctx, C.COL.SHOE, 4, -3, 12, 5);
    } else {
      this.px(ctx, pants, -8, -32, 8, 20);
      this.px(ctx, pants, 2, -32, 8, 20);
      this.px(ctx, this._shade(pants, -50), -8, -32, 3, 20);
      this.px(ctx, this._shade(pants, -50), 2, -32, 3, 20);
      const foff = legOff > 0 ? -legOff : 0, boff = legOff < 0 ? legOff : 0;
      this.px(ctx, C.COL.SHOE, -10, -14, 11, 7);
      this.px(ctx, '#E8E8E8', -10, -9, 11, 2);
      this.px(ctx, C.COL.SHOE, 1, -14 + foff, 11, 7);
      this.px(ctx, '#E8E8E8', 1, -9 + foff, 11, 2);
      this.px(ctx, C.COL.SHOE, -10, -14 + boff, 11, 7);
      this.px(ctx, '#E8E8E8', -10, -9 + boff, 11, 2);
    }

    const bodyTop = (crouching ? -22 : -56) + bob;
    const bodyH = crouching ? 14 : 22;

    // Torso: dark outline, then shading (dark left edge, top highlight, dark hem)
    this.px(ctx, 'rgba(20,16,28,0.85)', -11, bodyTop - 1, 24, bodyH + 2);
    this.px(ctx, shirt, -10, bodyTop, 22, bodyH);
    this.px(ctx, this._shade(shirt, -55), -10, bodyTop, 4, bodyH);
    this.px(ctx, this._shade(shirt, 48), -6, bodyTop, 16, 3);
    this.px(ctx, this._shade(shirt, -42), -10, bodyTop + bodyH - 4, 22, 4);

    // Wings (drawn BEHIND body)
    this._drawAccessoryBack(ctx, (colors && colors.accessory) || 'none', bodyTop);

    // Shirt symbol
    const shirtSymbol = (colors && colors.shirtSymbol) || 'none';
    if (shirtSymbol && shirtSymbol !== 'none') {
      const sy = bodyTop + Math.round(bodyH * 0.68);
      ctx.font = '12px "Segoe UI Symbol","Segoe UI Emoji",Segoe UI,Arial,sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeText(shirtSymbol, 1, sy);
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(shirtSymbol, 1, sy);
      ctx.textAlign = 'left'; ctx.lineWidth = 1;
    }

    // Back arm
    const backArmY = bodyTop + 6;
    if (state === 'victory') {
      // Both arms raised, pumping
      const pump = Math.sin(Date.now() / 220) * 3;
      this.px(ctx, shirt, -14, backArmY - 16 + pump, 6, 14);
      this.px(ctx, C.COL.SKIN, -14, backArmY - 22 + pump, 6, 8);
      this.px(ctx, shirt, 10, backArmY - 16 - pump, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, backArmY - 22 - pump, 6, 8);
    } else if (state === 'defeat') {
      // Arms hanging low
      this.px(ctx, shirt, -14, backArmY + 4, 6, 14);
      this.px(ctx, C.COL.SKIN, -14, backArmY + 16, 6, 8);
      this.px(ctx, shirt, 10, backArmY + 4, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, backArmY + 16, 6, 8);
    } else {
    this.px(ctx, shirt, -14, backArmY, 6, 14);
    this.px(ctx, C.COL.SKIN, -14, backArmY + 12, 6, 8);

    // Front arm
    if (state === 'throwing' || hasBall) {
      ctx.save();
      ctx.translate(10, bodyTop + 8);
      ctx.rotate(-armAngle);
      this.px(ctx, shirt, 0, -3, 18, 7);
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
      this.px(ctx, shirt, 10, bodyTop + 6, 6, 14);
      this.px(ctx, C.COL.SKIN, 10, bodyTop + 18, 6, 8);
    }
    }

    // Head
    const headY = bodyTop - 22;
    this.px(ctx, 'rgba(20,16,28,0.85)', -10, headY - 1, 22, 24);
    this.px(ctx, C.COL.SKIN, -9, headY, 20, 22);
    this.px(ctx, this._shade(C.COL.SKIN, -40), -9, headY, 3, 22);
    this.px(ctx, this._shade(C.COL.SKIN, 30), 6, headY + 3, 5, 15);

    // Hair — style switch
    const hairType = (colors && colors.hairType) || 'ponytail';
    const hairLight = this._shade(hair, 45);
    switch (hairType) {
      case 'bun':
        this.px(ctx, hair,     -10, headY + 2, 22,  8);
        this.px(ctx, hair,     -10, headY + 2,  4, 20);
        this.px(ctx, hair,       8, headY + 2,  4, 20);
        ctx.fillStyle = hair;
        ctx.beginPath(); ctx.arc(-1, headY - 8, 10, 0, Math.PI * 2); ctx.fill();
        // Coiled bun texture — swirl arcs + sheen
        ctx.strokeStyle = hairDark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(-1, headY - 8, 7, 0.4, Math.PI * 1.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(-1, headY - 8, 4, Math.PI * 1.2, Math.PI * 2.4); ctx.stroke();
        ctx.fillStyle = hairLight;
        ctx.beginPath(); ctx.arc(-4, headY - 12, 3, 0, Math.PI * 2); ctx.fill();
        // Pulled-back strand lines toward the bun
        this.px(ctx, hairDark, -7, headY + 3, 1, 6);
        this.px(ctx, hairDark,  6, headY + 3, 1, 6);
        // Loose wisps at the temples
        this.px(ctx, hair, -11, headY + 20, 2, 5);
        this.px(ctx, hair, 10, headY + 20, 2, 5);
        break;
      case 'long':
        this.px(ctx, hair,     -10, headY - 2, 22, 10);
        this.px(ctx, hair,     -14, headY - 2,  6, 34);
        this.px(ctx, hair,       8, headY - 2,  6, 34);
        this.px(ctx, hairDark, -10, headY + 8, 22,  3);
        // Tapered uneven tips + flowing strand lines
        this.px(ctx, hair,     -13, headY + 32, 4, 5);
        this.px(ctx, hair,       9, headY + 32, 4, 5);
        this.px(ctx, hairDark, -12, headY + 4, 1, 26);
        this.px(ctx, hairDark,  11, headY + 4, 1, 26);
        this.px(ctx, hairLight, -10, headY + 2, 1, 22);
        this.px(ctx, hairLight,   9, headY + 2, 1, 22);
        this.px(ctx, hairLight, -5, headY - 4, 8, 2);
        break;
      case 'very_long':
        // Floor-sweeping hair (extra long strands)
        this.px(ctx, hair,     -10, headY - 2, 22, 10);
        this.px(ctx, hair,     -14, headY - 2,  6, 52);
        this.px(ctx, hair,       8, headY - 2,  6, 52);
        this.px(ctx, hair,     -12, headY + 36,  4, 18);
        this.px(ctx, hair,       9, headY + 36,  4, 18);
        this.px(ctx, hairDark, -10, headY + 8, 22,  3);
        // Ragged flowing tips + long strand shading
        this.px(ctx, hair,     -14, headY + 50, 3, 6);
        this.px(ctx, hair,      11, headY + 50, 3, 6);
        this.px(ctx, hair,     -11, headY + 54, 2, 4);
        this.px(ctx, hair,       9, headY + 54, 2, 4);
        this.px(ctx, hairDark, -12, headY + 4, 1, 44);
        this.px(ctx, hairDark,  11, headY + 4, 1, 44);
        this.px(ctx, hairLight, -10, headY + 2, 1, 38);
        this.px(ctx, hairLight,   9, headY + 2, 1, 38);
        this.px(ctx, hairLight, -5, headY - 4, 8, 2);
        break;
      case 'wave':
        // Wavy: zigzag side locks
        this.px(ctx, hair, -10, headY - 2, 22, 10);
        this.px(ctx, hairDark, -10, headY + 8, 22, 3);
        // Left wave
        this.px(ctx, hair, -14, headY,      6, 10);
        this.px(ctx, hair, -11, headY + 10, 6, 10);
        this.px(ctx, hair, -14, headY + 20, 6, 10);
        this.px(ctx, hair, -11, headY + 30, 6,  8);
        // Right wave
        this.px(ctx, hair,  10, headY,      6, 10);
        this.px(ctx, hair,   7, headY + 10, 6, 10);
        this.px(ctx, hair,  10, headY + 20, 6, 10);
        this.px(ctx, hair,   7, headY + 30, 6,  8);
        // Shaded inner curve of each wave segment for a rolling look
        this.px(ctx, hairDark, -14, headY + 8,  3, 2);
        this.px(ctx, hairDark, -11, headY + 18, 3, 2);
        this.px(ctx, hairDark, -14, headY + 28, 3, 2);
        this.px(ctx, hairDark,  13, headY + 8,  3, 2);
        this.px(ctx, hairDark,  10, headY + 18, 3, 2);
        this.px(ctx, hairDark,  13, headY + 28, 3, 2);
        // Shine following the outer curve + curled tips
        this.px(ctx, hairLight, -13, headY + 2, 1, 6);
        this.px(ctx, hairLight, -10, headY + 12, 1, 6);
        this.px(ctx, hairLight,  14, headY + 2, 1, 6);
        this.px(ctx, hairLight,  11, headY + 12, 1, 6);
        this.px(ctx, hairLight, -5, headY - 4, 8, 2);
        this.px(ctx, hair, -13, headY + 38, 4, 3);
        this.px(ctx, hair,   9, headY + 38, 4, 3);
        break;
      default: // ponytail
        // Rounded crown instead of flat top
        ctx.fillStyle = hair;
        ctx.beginPath(); ctx.arc(1, headY + 1, 11.5, Math.PI, 0); ctx.fill();
        this.px(ctx, hair,     -10, headY - 2, 22, 10);
        this.px(ctx, hair,     -10, headY - 2,  4, 22);
        this.px(ctx, hair,       8, headY - 2,  4, 22);
        this.px(ctx, hairDark, -10, headY + 8, 22,  3);
        this.px(ctx, hair,     -22, headY + 2, 14,  8);
        this.px(ctx, hair,     -26, headY + 6,  8,  6);
        // Ponytail flick + strand shading through the tail
        this.px(ctx, hair,     -28, headY + 10, 5, 4);
        this.px(ctx, hair,     -30, headY + 13, 4, 3);
        this.px(ctx, hairDark, -22, headY + 7, 12, 1);
        this.px(ctx, hairDark, -26, headY + 10, 6, 1);
        this.px(ctx, hairLight, -20, headY + 3, 10, 1);
        this.px(ctx, hairDark, -14, headY + 4,  4,  4);
        // Pulled-back strand lines + crown shine
        this.px(ctx, hairDark, -6, headY - 3, 1, 8);
        this.px(ctx, hairDark,  4, headY - 3, 1, 8);
        this.px(ctx, hairLight, -4, headY - 5, 8, 2);
        break;
    }

    // Eyes
    if (!blink) {
      this.px(ctx, C.COL.EYE, -3, headY + 10, 4, 5);
      this.px(ctx, C.COL.EYE,  4, headY + 10, 4, 5);
      this.px(ctx, '#fff', -2, headY + 10, 2, 2);
      this.px(ctx, '#fff',  5, headY + 10, 2, 2);
    } else {
      this.px(ctx, C.COL.EYE, -3, headY + 13, 4, 2);
      this.px(ctx, C.COL.EYE,  4, headY + 13, 4, 2);
    }

    this.px(ctx, hairDark, -3, headY + 7, 4, 2);
    this.px(ctx, hairDark, 4, headY + 7, 4, 2);
    this.px(ctx, this._shade(C.COL.SKIN, -25), 1, headY + 14, 2, 2);
    this.px(ctx, 'rgba(255,120,120,0.6)', -7, headY + 15, 4, 2);
    this.px(ctx, 'rgba(255,120,120,0.6)', 6, headY + 15, 4, 2);
    this.px(ctx, '#C06060', -1, headY + 17, 5, 2);
    this._drawAccessory(ctx, (colors && colors.accessory) || 'none', headY, hair, hairDark);
    ctx.restore();
  },

  // Wings drawn BEHIND body (call before torso)
  _drawAccessoryBack(ctx, type, bodyTop) {
    if (!type || !type.startsWith('wings_')) return;
    switch (type) {
      case 'wings_butterfly':
        ctx.fillStyle = 'rgba(255,80,200,0.82)';
        ctx.beginPath(); ctx.moveTo(-2,bodyTop+6); ctx.bezierCurveTo(-22,bodyTop-10,-30,bodyTop+22,-14,bodyTop+28); ctx.bezierCurveTo(-6,bodyTop+30,-2,bodyTop+18,-2,bodyTop+10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,160,220,0.65)';
        ctx.beginPath(); ctx.moveTo(-2,bodyTop+14); ctx.bezierCurveTo(-18,bodyTop+18,-22,bodyTop+36,-10,bodyTop+34); ctx.bezierCurveTo(-4,bodyTop+32,-2,bodyTop+26,-2,bodyTop+20); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,80,200,0.82)';
        ctx.beginPath(); ctx.moveTo(4,bodyTop+6); ctx.bezierCurveTo(24,bodyTop-10,32,bodyTop+22,16,bodyTop+28); ctx.bezierCurveTo(8,bodyTop+30,4,bodyTop+18,4,bodyTop+10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,160,220,0.65)';
        ctx.beginPath(); ctx.moveTo(4,bodyTop+14); ctx.bezierCurveTo(20,bodyTop+18,24,bodyTop+36,12,bodyTop+34); ctx.bezierCurveTo(6,bodyTop+32,4,bodyTop+26,4,bodyTop+20); ctx.closePath(); ctx.fill();
        break;
      case 'wings_angel':
        ctx.fillStyle = 'rgba(255,255,240,0.92)';
        ctx.beginPath(); ctx.moveTo(-2,bodyTop+4); ctx.bezierCurveTo(-28,bodyTop-14,-34,bodyTop+18,-18,bodyTop+28); ctx.bezierCurveTo(-10,bodyTop+30,-2,bodyTop+20,-2,bodyTop+8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(200,200,180,0.5)'; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,240,0.92)';
        ctx.beginPath(); ctx.moveTo(4,bodyTop+4); ctx.bezierCurveTo(30,bodyTop-14,36,bodyTop+18,20,bodyTop+28); ctx.bezierCurveTo(12,bodyTop+30,4,bodyTop+20,4,bodyTop+8); ctx.closePath(); ctx.fill();
        ctx.stroke(); ctx.lineWidth=1;
        break;
      case 'wings_demon':
        ctx.fillStyle = 'rgba(160,0,30,0.88)';
        ctx.beginPath(); ctx.moveTo(-2,bodyTop+4); ctx.lineTo(-22,bodyTop-10); ctx.lineTo(-18,bodyTop+8); ctx.lineTo(-28,bodyTop+8); ctx.lineTo(-20,bodyTop+22); ctx.lineTo(-10,bodyTop+26); ctx.lineTo(-2,bodyTop+14); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(4,bodyTop+4);  ctx.lineTo(24,bodyTop-10);  ctx.lineTo(20,bodyTop+8);  ctx.lineTo(30,bodyTop+8);  ctx.lineTo(22,bodyTop+22);  ctx.lineTo(12,bodyTop+26);  ctx.lineTo(4,bodyTop+14);  ctx.closePath(); ctx.fill();
        break;
      case 'wings_eagle':
        ctx.fillStyle = 'rgba(80,50,20,0.9)';
        ctx.beginPath(); ctx.moveTo(-2,bodyTop+6); ctx.bezierCurveTo(-30,bodyTop+2,-36,bodyTop+20,-20,bodyTop+28); ctx.bezierCurveTo(-12,bodyTop+30,-2,bodyTop+22,-2,bodyTop+10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(4,bodyTop+6);  ctx.bezierCurveTo(32,bodyTop+2, 38,bodyTop+20, 22,bodyTop+28); ctx.bezierCurveTo(14,bodyTop+30, 4,bodyTop+22, 4,bodyTop+10);  ctx.closePath(); ctx.fill();
        ctx.strokeStyle='rgba(120,80,30,0.6)'; ctx.lineWidth=1.5;
        for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-6,bodyTop+12);ctx.lineTo(-12-i*5,bodyTop+26+i*2);ctx.stroke(); ctx.beginPath();ctx.moveTo(8,bodyTop+12);ctx.lineTo(14+i*5,bodyTop+26+i*2);ctx.stroke();}
        ctx.lineWidth=1;
        break;
      case 'wings_robot':
        this.px(ctx,'#3333AA',-6,bodyTop+2,4,20); this.px(ctx,'#5555CC',-6,bodyTop+2,2,20);
        this.px(ctx,'#2A2A88',-18,bodyTop+6,14,4); this.px(ctx,'#2A2A88',-20,bodyTop+13,16,4); this.px(ctx,'#2A2A88',-18,bodyTop+20,14,4);
        this.px(ctx,'#3333AA', 4,bodyTop+2,4,20); this.px(ctx,'#5555CC', 6,bodyTop+2,2,20);
        this.px(ctx,'#2A2A88', 6,bodyTop+6,14,4); this.px(ctx,'#2A2A88', 6,bodyTop+13,16,4); this.px(ctx,'#2A2A88', 6,bodyTop+20,14,4);
        break;
    }
  },

  // Head-level accessories (call after head is drawn)
  _drawAccessory(ctx, type, headY, hair, hairDark) {
    if (!type || type === 'none' || type.startsWith('wings_')) return;
    switch (type) {
      // ── Hats ──────────────────────────────────────────────────────────────
      case 'cap': // flat newsboy cap
        this.px(ctx,'#1A1A1A',-14,headY-4, 30, 5);
        this.px(ctx,'#111111', -9,headY-16,20,13);
        this.px(ctx,'#2A2A2A', -9,headY-16,20, 4);
        break;
      case 'baseball':
        this.px(ctx,'#CC2200',-10,headY-14,22,12);
        this.px(ctx,'#AA1100',-10,headY-14,22, 3);
        this.px(ctx,'#CC2200',  6,headY-4, 14, 5); // front brim
        this.px(ctx,'#FFFFFF', -1,headY-13, 4, 3); // button
        break;
      case 'cowboy':
        this.px(ctx,'#8B6914',-18,headY-4, 38, 6);
        this.px(ctx,'#7A5810', -8,headY-17,18,15);
        this.px(ctx,'#8B6914', -8,headY-17,18, 4);
        this.px(ctx,'#5A4010', -3,headY-17, 8, 4); // crown dent
        this.px(ctx,'#3A2A00', -8,headY-6, 18, 3); // band
        break;
      case 'pirate':
        this.px(ctx,'#111111',-12,headY-14,26,13);
        this.px(ctx,'#111111',-17,headY-8, 36, 6); // wide brim
        this.px(ctx,'#FFFFFF', -4,headY-10,10, 5); // skull
        this.px(ctx,'#111111', -2,headY-9,  3, 3); // left eye socket
        this.px(ctx,'#111111',  2,headY-9,  3, 3); // right eye socket
        break;
      case 'knight':
        this.px(ctx,'#888888',-11,headY-14,24,22);
        this.px(ctx,'#999999',-11,headY-14,24, 4);
        this.px(ctx,'#444444', -9,headY-2, 20, 4); // visor slit
        this.px(ctx,'#555555', -7,headY+5, 16, 3); // mouth guard
        this.px(ctx,'#777777',-12,headY+5,  4, 8); // left cheek guard
        this.px(ctx,'#777777',  9,headY+5,  4, 8);
        break;
      case 'football':
        this.px(ctx,'#003399',-12,headY-14,26,22);
        this.px(ctx,'#0044BB',-12,headY-14,26, 4);
        this.px(ctx,'#FFFFFF', -1,headY-11, 4,12); // stripe
        ctx.strokeStyle='#888'; ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-9,headY+4);ctx.lineTo(9,headY+4);ctx.stroke();
        ctx.beginPath();ctx.moveTo(-9,headY+9);ctx.lineTo(9,headY+9);ctx.stroke();
        ctx.lineWidth=1;
        break;
      case 'robin':
        ctx.fillStyle='#2A7A2A';
        ctx.beginPath();ctx.moveTo(-2,headY-14);ctx.lineTo(-11,headY-1);ctx.lineTo(13,headY-1);ctx.closePath();ctx.fill();
        this.px(ctx,'#2A7A2A',-10,headY-3,22,6);
        this.px(ctx,'#1A5A1A',-10,headY-3,22,3);
        this.px(ctx,'#FFFFFF',  8,headY-14, 3,12); // feather
        this.px(ctx,'#EEEEEE',  9,headY-14, 2,10);
        break;
      case 'devil':
        ctx.fillStyle='#CC0000';
        ctx.beginPath();ctx.moveTo(-8,headY-2);ctx.lineTo(-5,headY-16);ctx.lineTo(-2,headY-2);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo( 4,headY-2);ctx.lineTo( 7,headY-16);ctx.lineTo(10,headY-2);ctx.closePath();ctx.fill();
        ctx.fillStyle='#FF3333';
        ctx.beginPath();ctx.moveTo(-7,headY-2);ctx.lineTo(-5,headY-10);ctx.lineTo(-3,headY-2);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo( 5,headY-2);ctx.lineTo( 7,headY-10);ctx.lineTo( 9,headY-2);ctx.closePath();ctx.fill();
        break;
      // ── Eyewear ────────────────────────────────────────────────────────────
      case 'glasses':
        ctx.strokeStyle='#AAAAAA'; ctx.lineWidth=1.5;
        ctx.strokeRect(-7,headY+9,  7,6); // left lens
        ctx.strokeRect( 2,headY+9,  7,6); // right lens
        ctx.beginPath();ctx.moveTo( 0,headY+12);ctx.lineTo(2,headY+12);ctx.stroke(); // bridge
        ctx.beginPath();ctx.moveTo(-14,headY+11);ctx.lineTo(-7,headY+11);ctx.stroke(); // L arm
        ctx.beginPath();ctx.moveTo( 9,headY+11);ctx.lineTo(16,headY+11);ctx.stroke(); // R arm
        ctx.lineWidth=1;
        break;
      case 'shades':
        ctx.fillStyle='rgba(0,0,0,0.88)';
        ctx.fillRect(-7,headY+9,7,6); ctx.fillRect(2,headY+9,7,6);
        ctx.strokeStyle='#333'; ctx.lineWidth=1.5;
        ctx.strokeRect(-7,headY+9,7,6); ctx.strokeRect(2,headY+9,7,6);
        ctx.strokeStyle='#444';
        ctx.beginPath();ctx.moveTo(0,headY+12);ctx.lineTo(2,headY+12);ctx.stroke();
        ctx.lineWidth=1;
        break;
      // ── Head ───────────────────────────────────────────────────────────────
      case 'headband':
        this.px(ctx,'#FFFFFF',-11,headY+5,24,5);
        this.px(ctx,'#DDDDDD',-11,headY+5,24,2);
        break;
      case 'mask':
        this.px(ctx,'#1A1A1A',-10,headY+12,22,10);
        this.px(ctx,'#2A2A2A',-10,headY+12,22, 3);
        ctx.fillStyle='#333';
        for(let i=-6;i<=6;i+=5) ctx.fillRect(i,headY+16,3,3);
        break;
    }
  },

  drawBall(ctx, x, y, spinning, ghostMode, radius = C.BALL_R, ballColor = null, stripeColor = null) {
    const R  = radius;
    const bc = ballColor   || C.COL.BALL;
    const sc = stripeColor || C.COL.BALL_STRIPE;
    const t  = Date.now() / 80;
    const spinOffset = spinning ? Math.sin(t) * R : 0;

    if (ghostMode) ctx.globalAlpha = 0.5;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + R + 2, R * 0.8, Math.max(2, R * 0.38), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bc;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = sc;
    ctx.fillRect(x - R + 2, y + spinOffset - Math.max(1, R * 0.18), (R - 2) * 2, Math.max(2, R * 0.28));

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(x - R * 0.3, y - R * 0.3, R * 0.4, 0, Math.PI * 2); ctx.fill();

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
      ctx.font = '14px Segoe UI, Arial, sans-serif';
      ctx.fillText('★', sx - 7, sy);
    }
  },

  // HUD
  drawHUD(ctx, p1, p2, arena, fx = {}) {
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
    ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = C.COL.P1_HUD;
    ctx.fillText(p1.charName || C.P1_NAME, cx - 78, 19);
    ctx.fillStyle = C.COL.P2_HUD;
    ctx.fillText(p2.charName || C.P2_NAME, cx + 78, 19);

    // Leading player indicator — pulsing glow on the leader's score
    const leading = p1.score > p2.score ? 0 : p2.score > p1.score ? 1 : -1;
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 260);

    // Score numbers
    ctx.font = 'bold 42px Segoe UI, Arial, sans-serif';

    // Pop scale: score number bulges right after a point (fx.p1Flash/p2Flash count down from 700ms)
    const pop1 = Math.max(0, (fx.p1Flash || 0) / 700);
    const pop2 = Math.max(0, (fx.p2Flash || 0) / 700);

    ctx.shadowColor = C.COL.P1_HUD;
    ctx.shadowBlur = leading === 0 ? 18 * pulse : 5;
    ctx.fillStyle = pop1 > 0 ? '#FFFFFF' : C.COL.P1_HUD;
    ctx.save();
    ctx.translate(cx - 78, 57);
    ctx.scale(1 + pop1 * 0.6, 1 + pop1 * 0.6);
    ctx.fillText(p1.score, 0, 0);
    ctx.restore();

    ctx.shadowColor = C.COL.P2_HUD;
    ctx.shadowBlur = leading === 1 ? 18 * pulse : 5;
    ctx.fillStyle = pop2 > 0 ? '#FFFFFF' : C.COL.P2_HUD;
    ctx.save();
    ctx.translate(cx + 78, 57);
    ctx.scale(1 + pop2 * 0.6, 1 + pop2 * 0.6);
    ctx.fillText(p2.score, 0, 0);
    ctx.restore();
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

    // MATCH POINT banner — one point away from winning
    const mp1 = p1.score === C.WIN_SCORE - 1, mp2 = p2.score === C.WIN_SCORE - 1;
    if (mp1 || mp2) {
      const blink = 0.55 + 0.45 * Math.sin(Date.now() / 180);
      const bCol = mp1 && mp2 ? '#FFD700' : mp1 ? C.COL.P1_HUD : C.COL.P2_HUD;
      const bw = 148, bh = 20, bx = cx - bw / 2, by = 92;
      ctx.globalAlpha = blink;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = bCol;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = bCol;
      ctx.font = 'bold 13px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ MATCH POINT ★', cx, by + 15);
      ctx.globalAlpha = 1;
    }

    // === PLAYER STATUS BARS ===
    this._drawStatusBars(ctx, p1, 10, 1);
    this._drawStatusBars(ctx, p2, C.W - 10, -1);

    // Arena name badge + ESC hint
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(arena.name, cx, C.H - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '11px Segoe UI, Arial, sans-serif';
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
      ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SHIELD  READY', sfx + sfw / 2, sy + BH - 4);
    } else {
      const pct = 1 - (player.shieldCooldown / C.SHIELD_RECHARGE);
      ctx.fillStyle = '#1a3a5a';
      ctx.fillRect(sfx + 1, sy + 2, Math.max(0, (sfw - 2) * pct), BH - 4);
      ctx.fillStyle = '#4d84bb';
      ctx.font = '11px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`RECHARGING  ${Math.ceil(player.shieldCooldown / 1000)}s`, sfx + sfw / 2, sy + BH - 4);
    }

    // --- Power bar (y=28) ---
    const py = 28;
    const spPct = player.spCharge / C.SP_CHARGE_MAX;
    const ready = spPct >= 1;
    const pColors = { rocket:C.COL.SP_ROCKET, double:C.COL.SP_DOUBLE, shadow:C.COL.SP_SHADOW, curve:C.COL.SP_CURVE,
                       boomerang:C.COL.SP_BOOMERANG, blaze:C.COL.SP_BLAZE, heavy:C.COL.SP_HEAVY, seeker:C.COL.SP_SEEKER, split:C.COL.SP_SPLIT, burst:C.COL.SP_BURST };
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
    ctx.font = `${ready ? 'bold ' : ''}8px Segoe UI, Arial, sans-serif`;
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
    } else if (type === 'curve') {
      // Wavy path with a ball at the end
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const px = x + (i / 12) * w;
        const py = y + Math.round(h / 2) + Math.sin(i * Math.PI * 0.55) * Math.round(h * 0.33);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + w - 2, y + Math.round(h / 2) + Math.sin(12 * Math.PI * 0.55) * Math.round(h * 0.33), 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'boomerang') {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + Math.round(h*0.7));
      ctx.quadraticCurveTo(x + Math.round(w*0.5), y, x + w - 1, y + Math.round(h*0.7));
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 1, y + Math.round(h*0.7), 2, 0, Math.PI*2); ctx.fill();
    } else if (type === 'blaze') {
      // Flame shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(mx, y);
      ctx.bezierCurveTo(x+w, y+Math.round(h*0.4), x+w, y+h, mx, y+h);
      ctx.bezierCurveTo(x, y+h, x, y+Math.round(h*0.4), mx, y);
      ctx.fill();
      ctx.fillStyle = '#FFCC00';
      ctx.beginPath();
      ctx.moveTo(mx, y+Math.round(h*0.25));
      ctx.bezierCurveTo(x+Math.round(w*0.75),y+Math.round(h*0.55),x+Math.round(w*0.75),y+h,mx,y+h);
      ctx.bezierCurveTo(x+Math.round(w*0.25),y+h,x+Math.round(w*0.25),y+Math.round(h*0.55),mx,y+Math.round(h*0.25));
      ctx.fill();
    } else if (type === 'heavy') {
      // Big solid circle
      ctx.beginPath(); ctx.arc(mx, y+Math.round(h/2), Math.round(w*0.44), 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(mx-2, y+Math.round(h/2)-2, Math.round(w*0.2), 0, Math.PI*2); ctx.fill();
    } else if (type === 'seeker') {
      // Target / crosshair
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      const r = Math.round(w*0.38), cy2 = y+Math.round(h/2);
      ctx.beginPath(); ctx.arc(mx, cy2, r, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx-r-2, cy2); ctx.lineTo(mx+r+2, cy2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, cy2-r-2); ctx.lineTo(mx, cy2+r+2); ctx.stroke();
    } else if (type === 'split') {
      // Three small dots fanning out
      const positions = [[mx, y+Math.round(h*0.2)], [x+Math.round(w*0.15), y+h-4], [x+w-Math.round(w*0.15), y+h-4]];
      for (const [px2,py2] of positions) {
        ctx.beginPath(); ctx.arc(px2, py2, Math.round(w*0.18), 0, Math.PI*2); ctx.fill();
      }
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      for (const [px2,py2] of positions) {
        ctx.beginPath(); ctx.moveTo(mx, y+Math.round(h*0.55)); ctx.lineTo(px2,py2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
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
    } else if (idx === 5) { // MOON
      // Black sky + stars
      ctx.fillStyle = '#000008'; ctx.fillRect(x, y, w, skyH);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 30; i++) {
        const sx = x + (i * 17.3) % w, sy = y + (i * 9.7) % (skyH - 8);
        ctx.beginPath(); ctx.arc(sx, sy, 0.5 + (i%3)*0.4, 0, Math.PI*2); ctx.fill();
      }
      // Earth globe
      ctx.save();
      ctx.shadowColor = '#4488FF'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#1144AA';
      ctx.beginPath(); ctx.arc(x + Math.round(w*0.8), y + Math.round(skyH*0.3), 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1A8B3A';
      ctx.beginPath(); ctx.arc(x + Math.round(w*0.78), y + Math.round(skyH*0.25), 5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      // Debris rocks
      ctx.fillStyle = '#7A7A8E';
      [[0.18,0.42],[0.55,0.28],[0.75,0.55]].forEach(([rx,ry]) => {
        ctx.beginPath();
        const rcx = x+Math.round(w*rx), rcy = y+Math.round(skyH*ry);
        ctx.moveTo(rcx-5,rcy); ctx.lineTo(rcx+2,rcy-6); ctx.lineTo(rcx+7,rcy-2);
        ctx.lineTo(rcx+5,rcy+5); ctx.lineTo(rcx-3,rcy+5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#A0A0B8';
        ctx.beginPath(); ctx.arc(rcx-1, rcy-1, 2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#7A7A8E';
      });
      // Crater surface hint
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(x + Math.round(w*0.38), gy - 5, 10, 3, 0, 0, Math.PI*2); ctx.fill();
    } else if (idx === 7) { // CLOUDS
      // Sky gradient
      const cg = ctx.createLinearGradient(x, y, x, y + skyH);
      cg.addColorStop(0, '#6AAEDD'); cg.addColorStop(1, '#C8EAFF');
      ctx.fillStyle = cg; ctx.fillRect(x, y, w, skyH);
      // Sun
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(x + Math.round(w*0.84), y + 14, 12, 0, Math.PI*2); ctx.fill();
      // Distant wisps
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(x+Math.round(w*0.22), y+Math.round(skyH*0.28), 24, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+Math.round(w*0.6), y+Math.round(skyH*0.18), 18, 5, 0, 0, Math.PI*2); ctx.fill();
      // Cloud platforms
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      const cp1x = x + Math.round(w*0.06), cp2x = x + Math.round(w*0.55);
      const cpy  = y + Math.round(skyH*0.72);
      [cp1x, cp2x].forEach(cpx => {
        const pw = Math.round(w*0.38);
        ctx.beginPath(); ctx.ellipse(cpx + pw*0.25, cpy - 6, 12, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cpx + pw*0.55, cpy - 8, 16, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cpx + pw*0.8, cpy - 5, 10, 7, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(cpx, cpy - 2, pw, 10);
      });
      // Mini plane
      ctx.fillStyle = '#DDDDE8';
      ctx.beginPath(); ctx.ellipse(x+Math.round(w*0.42), y+Math.round(skyH*0.45), 20, 6, 0.15, 0, Math.PI*2); ctx.fill();
    } else if (idx >= 8) { // CUSTOM (user-built)
      // Draw a "★ CUSTOM" placeholder with a simple platform doodle
      ctx.fillStyle = 'rgba(255,215,0,0.08)';
      ctx.fillRect(x, y, w, skyH);
      // A couple of brown platform tiles
      ctx.fillStyle = '#7B4A18';
      ctx.fillRect(x + Math.round(w*0.08), y + Math.round(skyH*0.55), Math.round(w*0.36), Math.round(skyH*0.12));
      ctx.fillStyle = '#C8854A';
      ctx.fillRect(x + Math.round(w*0.08), y + Math.round(skyH*0.55), Math.round(w*0.36), Math.round(skyH*0.04));
      ctx.fillStyle = '#7B4A18';
      ctx.fillRect(x + Math.round(w*0.54), y + Math.round(skyH*0.30), Math.round(w*0.36), Math.round(skyH*0.12));
      ctx.fillStyle = '#C8854A';
      ctx.fillRect(x + Math.round(w*0.54), y + Math.round(skyH*0.30), Math.round(w*0.36), Math.round(skyH*0.04));
      // Star
      ctx.fillStyle = 'rgba(255,215,0,0.55)';
      ctx.font = '18px Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', x + Math.round(w*0.5), y + Math.round(skyH*0.45));
      ctx.textAlign = 'left';
    } else if (idx === 6) { // UPSIDE DOWN
      // Dark hell sky
      const hg = ctx.createLinearGradient(x, y, x, y + skyH);
      hg.addColorStop(0, '#1A0005'); hg.addColorStop(1, '#400015');
      ctx.fillStyle = hg; ctx.fillRect(x, y, w, skyH);
      // Stalactite
      ctx.fillStyle = '#1A0005';
      [[x+Math.round(w*0.15),10,22],[x+Math.round(w*0.5),14,28],[x+Math.round(w*0.8),9,20]].forEach(([sx,sw,sh]) => {
        ctx.beginPath(); ctx.moveTo(sx-sw/2,y); ctx.lineTo(sx+sw/2,y); ctx.lineTo(sx,y+sh); ctx.closePath(); ctx.fill();
      });
      // Cracks in ceiling
      ctx.strokeStyle = 'rgba(255,80,0,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x+Math.round(w*0.28),y); ctx.lineTo(x+Math.round(w*0.36),y+18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+Math.round(w*0.65),y); ctx.lineTo(x+Math.round(w*0.58),y+14); ctx.stroke();
      // Lava glow at bottom
      ctx.fillStyle = 'rgba(255,60,0,0.15)';
      ctx.beginPath(); ctx.ellipse(x + Math.round(w*0.5), gy-4, Math.round(w*0.35), 7, 0, 0, Math.PI*2); ctx.fill();
      // Mini demon
      ctx.save();
      ctx.translate(x + Math.round(w*0.5), gy - 6);
      ctx.fillStyle = '#880022';
      ctx.beginPath(); ctx.arc(0, -10, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#550011';
      ctx.beginPath(); ctx.moveTo(-3,-15); ctx.lineTo(-6,-21); ctx.lineTo(0,-17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(3,-15); ctx.lineTo(6,-21); ctx.lineTo(0,-17); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.arc(-2,-11,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(2,-11,2,0,Math.PI*2); ctx.fill();
      ctx.restore();
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
