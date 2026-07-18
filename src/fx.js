// Global juice/FX engine — screen shake, hit-stop, shockwaves, flashes,
// cinematic vignette, and per-act ambient weather. Wraps the main loop:
// dt = FX.update(rawDt); FX.preDraw(ctx); game.draw(); FX.postDraw(ctx);
const FX = {
  // Screen shake
  _shakeT: 0, _shakeDur: 1, _shakeInt: 0,
  // Hit-stop (time freeze) — dt is scaled to near-zero while active
  _hitstopT: 0,
  // Full-screen flashes: { color, alpha, t, dur }
  _flashes: [],
  // Expanding shockwave rings: { x, y, color, t, dur, maxR, width }
  _waves: [],
  // Ambient weather
  _ambientTheme: null,
  _ambientParts: [],
  _vignette: null,

  shake(intensity, ms) {
    if (intensity >= this._shakeInt * (this._shakeT / this._shakeDur)) {
      this._shakeInt = intensity;
      this._shakeT = ms;
      this._shakeDur = ms;
    }
  },

  hitstop(ms) { this._hitstopT = Math.max(this._hitstopT, ms); },

  shockwave(x, y, color, opts = {}) {
    this._waves.push({
      x, y, color,
      t: 0,
      dur: opts.dur ?? 320,
      maxR: opts.maxR ?? 46,
      width: opts.width ?? 3,
    });
  },

  flash(color, alpha, ms) {
    this._flashes.push({ color, alpha, t: 0, dur: ms });
  },

  // Anime-style impact frame: brief inverted flash with jagged rays from the hit point
  impact(x, y, ms = 160) {
    const rays = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
      rays.push({ a, len: 260 + Math.random() * 260, w: 0.06 + Math.random() * 0.10 });
    }
    this._impact = { x, y, t: 0, dur: ms, rays };
  },

  // Themes: 'embers' | 'leaves' | 'snow' | 'dust' | 'digital' | null
  setAmbient(theme) {
    if (theme === this._ambientTheme) return;
    this._ambientTheme = theme;
    this._ambientParts = [];
    if (!theme) return;
    const n = theme === 'snow' ? 60 : theme === 'dust' ? 40 : 34;
    for (let i = 0; i < n; i++) this._ambientParts.push(this._spawnAmbient(theme, true));
  },

  _spawnAmbient(theme, anywhere) {
    const x = Math.random() * C.W;
    switch (theme) {
      case 'embers': return {
        x, y: anywhere ? Math.random() * C.H : C.H + 4,
        vx: (Math.random() - 0.5) * 0.3, vy: -(0.25 + Math.random() * 0.55),
        size: 1 + Math.floor(Math.random() * 2), phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? '#FF6600' : '#FFCC00', alpha: 0.35 + Math.random() * 0.4,
      };
      case 'leaves': return {
        x, y: anywhere ? Math.random() * C.H : -4,
        vx: 0.2 + Math.random() * 0.5, vy: 0.35 + Math.random() * 0.5,
        size: 2 + Math.floor(Math.random() * 2), phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.6 ? '#44AA55' : '#88CC66', alpha: 0.4 + Math.random() * 0.35,
      };
      case 'snow': return {
        x, y: anywhere ? Math.random() * C.H : -4,
        vx: (Math.random() - 0.3) * 0.35, vy: 0.4 + Math.random() * 0.7,
        size: 1 + Math.floor(Math.random() * 2), phase: Math.random() * Math.PI * 2,
        color: '#FFFFFF', alpha: 0.35 + Math.random() * 0.45,
      };
      case 'dust': return {
        x: anywhere ? x : -4, y: Math.random() * C.H,
        vx: 0.5 + Math.random() * 0.9, vy: (Math.random() - 0.5) * 0.2,
        size: 1 + Math.floor(Math.random() * 2), phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? '#C8A850' : '#E8D090', alpha: 0.25 + Math.random() * 0.3,
      };
      case 'digital': return {
        x, y: anywhere ? Math.random() * C.H : C.H + 4,
        vx: 0, vy: -(0.3 + Math.random() * 0.6),
        size: 1 + Math.floor(Math.random() * 2), phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.7 ? '#00FFCC' : '#66FFEE', alpha: 0.3 + Math.random() * 0.45,
      };
    }
  },

  // Ticks all effect timers with real dt; returns the (possibly frozen) dt
  // the game simulation should use this frame.
  update(realDt) {
    if (this._shakeT > 0) this._shakeT -= realDt;

    for (const f of this._flashes) f.t += realDt;
    this._flashes = this._flashes.filter(f => f.t < f.dur);

    for (const w of this._waves) w.t += realDt;
    this._waves = this._waves.filter(w => w.t < w.dur);

    if (this._impact) {
      this._impact.t += realDt;
      if (this._impact.t >= this._impact.dur) this._impact = null;
    }

    if (this._ambientTheme) {
      const s = realDt / 16;
      const theme = this._ambientTheme;
      for (let i = 0; i < this._ambientParts.length; i++) {
        const p = this._ambientParts[i];
        p.phase += 0.02 * s;
        p.x += (p.vx + Math.sin(p.phase) * 0.25) * s;
        p.y += p.vy * s;
        if (p.y < -6 || p.y > C.H + 6 || p.x < -6 || p.x > C.W + 6)
          this._ambientParts[i] = this._spawnAmbient(theme, false);
      }
    }

    if (this._hitstopT > 0) {
      this._hitstopT -= realDt;
      return realDt * 0.05; // near-freeze, never zero (keeps dt math safe)
    }
    return realDt;
  },

  preDraw(ctx) {
    ctx.save();
    if (this._shakeT > 0) {
      const k = this._shakeInt * (this._shakeT / this._shakeDur);
      ctx.translate(
        Math.round((Math.random() * 2 - 1) * k),
        Math.round((Math.random() * 2 - 1) * k),
      );
    }
  },

  postDraw(ctx) {
    ctx.restore();

    // Ambient weather (drawn over the scene, low alpha)
    if (this._ambientTheme) {
      for (const p of this._ambientParts) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }

    // Shockwave rings — expanding, fading, additive
    if (this._waves.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const w of this._waves) {
        const prog = w.t / w.dur;
        const ease = 1 - (1 - prog) * (1 - prog); // ease-out
        ctx.globalAlpha = (1 - prog) * 0.8;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = Math.max(1, w.width * (1 - prog));
        ctx.beginPath();
        ctx.arc(w.x, w.y, 4 + ease * w.maxR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Impact frame — flickering white/black manga panel with speed-line rays
    if (this._impact) {
      const im = this._impact;
      const prog = im.t / im.dur;
      const invert = Math.floor(im.t / 40) % 2 === 0; // flicker every ~40ms
      const bg = invert ? '#FFFFFF' : '#0A0A0A';
      const fg = invert ? '#0A0A0A' : '#FFFFFF';
      ctx.save();
      ctx.globalAlpha = 0.85 * (1 - prog * 0.4);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, C.W, C.H);
      ctx.fillStyle = fg;
      for (const r of im.rays) {
        ctx.beginPath();
        ctx.moveTo(im.x, im.y);
        ctx.lineTo(im.x + Math.cos(r.a - r.w) * r.len, im.y + Math.sin(r.a - r.w) * r.len);
        ctx.lineTo(im.x + Math.cos(r.a + r.w) * r.len, im.y + Math.sin(r.a + r.w) * r.len);
        ctx.closePath();
        ctx.fill();
      }
      // hit-point burst
      ctx.beginPath();
      ctx.arc(im.x, im.y, 18 + prog * 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Screen flashes
    for (const f of this._flashes) {
      ctx.globalAlpha = f.alpha * (1 - f.t / f.dur);
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, C.W, C.H);
    }
    ctx.globalAlpha = 1;

    // Cinematic vignette (pre-rendered once)
    if (!this._vignette) {
      const cv = document.createElement('canvas');
      cv.width = C.W; cv.height = C.H;
      const g = cv.getContext('2d');
      const grad = g.createRadialGradient(C.W / 2, C.H / 2, C.H * 0.45, C.W / 2, C.H / 2, C.W * 0.72);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.32)');
      g.fillStyle = grad;
      g.fillRect(0, 0, C.W, C.H);
      this._vignette = cv;
    }
    ctx.drawImage(this._vignette, 0, 0);
  },
};
