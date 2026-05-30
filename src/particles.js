// Global pixel-art particle emitter — used by both classic and horde modes
const Particles = {
  _list: [],

  // Emit `count` particles from (x,y).
  // colors: array of CSS color strings, picked randomly.
  // opts: { upBias, minSpeed, maxSpeed, minSize, maxSize, minDecay, maxDecay, gravity }
  emit(x, y, count, colors, opts = {}) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.minSpeed ?? 1.5) + Math.random() * ((opts.maxSpeed ?? 4) - (opts.minSpeed ?? 1.5));
      this._list.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (opts.upBias ?? 1.5),
        life: 1,
        decay: (opts.minDecay ?? 0.016) + Math.random() * ((opts.maxDecay ?? 0.028) - (opts.minDecay ?? 0.016)),
        size: (opts.minSize ?? 2) + Math.floor(Math.random() * ((opts.maxSize ?? 4) - (opts.minSize ?? 2) + 1)),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: opts.gravity ?? 0.12,
      });
    }
  },

  update(dt) {
    const s = dt / 16;
    for (const p of this._list) {
      p.vy += p.gravity * s;
      p.x  += p.vx * s;
      p.y  += p.vy * s;
      p.life -= p.decay * s;
    }
    this._list = this._list.filter(p => p.life > 0);
  },

  draw(ctx) {
    for (const p of this._list) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - p.size * 0.5), Math.round(p.y - p.size * 0.5), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  },

  clear() { this._list = []; },
};
