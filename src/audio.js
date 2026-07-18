// WebAudio synth engine — all sfx & music generated in code, no assets.
const Sound = {
  ctx: null,
  master: null,
  sfxGain: null,
  musicGain: null,
  muted: false,
  _musicTimer: null,
  _musicStep: 0,
  _musicOn: false,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  },

  // ---- low-level helpers ----
  _tone(freq, dur, { type = 'square', vol = 0.25, slide = 0, delay = 0, dest = null } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(dest || this.sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },

  _noise(dur, { vol = 0.3, delay = 0, freq = 1200 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  },

  // ---- sfx ----
  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'throw':    this._tone(300, 0.18, { type:'sawtooth', vol:0.22, slide:500 }); this._noise(0.1, { vol:0.12, freq:2500 }); break;
      case 'hit':      this._tone(180, 0.25, { type:'square', vol:0.35, slide:-120 }); this._noise(0.22, { vol:0.4, freq:900 }); this._tone(70, 0.3, { type:'sine', vol:0.4, slide:-30 }); break;
      case 'catch':    this._tone(500, 0.08, { vol:0.22 }); this._tone(750, 0.1, { vol:0.22, delay:0.07 }); break;
      case 'jump':     this._tone(250, 0.15, { type:'square', vol:0.15, slide:280 }); break;
      case 'bounce':   this._tone(220, 0.08, { type:'triangle', vol:0.18, slide:-60 }); break;
      case 'shield':   this._tone(900, 0.2, { type:'sawtooth', vol:0.2, slide:-500 }); this._tone(1400, 0.15, { type:'sine', vol:0.15 }); break;
      case 'power':    this._tone(400, 0.12, { vol:0.2 }); this._tone(600, 0.12, { vol:0.2, delay:0.09 }); this._tone(900, 0.18, { vol:0.22, delay:0.18 }); break;
      case 'menuMove': this._tone(600, 0.05, { type:'square', vol:0.12 }); break;
      case 'menuSel':  this._tone(500, 0.07, { vol:0.18 }); this._tone(800, 0.12, { vol:0.18, delay:0.06 }); break;
      case 'pause':    this._tone(700, 0.08, { vol:0.18 }); this._tone(450, 0.14, { vol:0.18, delay:0.08 }); break;
      case 'resume':   this._tone(450, 0.08, { vol:0.18 }); this._tone(700, 0.14, { vol:0.18, delay:0.08 }); break;
      case 'roundWin': this._tone(523, 0.12, { vol:0.22 }); this._tone(659, 0.12, { vol:0.22, delay:0.11 }); this._tone(784, 0.22, { vol:0.24, delay:0.22 }); break;
      case 'gameOver': this._tone(523, 0.15, { vol:0.22 }); this._tone(659, 0.15, { vol:0.22, delay:0.14 }); this._tone(784, 0.15, { vol:0.22, delay:0.28 }); this._tone(1047, 0.4, { vol:0.26, delay:0.42 }); break;
      case 'stun':     this._tone(400, 0.3, { type:'sawtooth', vol:0.2, slide:-250 }); break;
    }
  },

  // ---- music: 8-step chiptune loop ----
  startMusic() {
    if (!this.ctx || this._musicOn) return;
    this._musicOn = true;
    this._musicStep = 0;
    const BASS  = [110, 110, 147, 147, 131, 131, 98, 98];
    const LEAD  = [440, 0, 523, 587, 0, 523, 440, 392];
    const STEP = 0.22; // seconds per step
    const tick = () => {
      if (!this._musicOn || this.muted) return;
      const s = this._musicStep % 8;
      this._tone(BASS[s], STEP * 0.9, { type:'triangle', vol:0.5, dest:this.musicGain });
      if (LEAD[s]) this._tone(LEAD[s], STEP * 0.6, { type:'square', vol:0.18, dest:this.musicGain });
      if (s % 2 === 0) this._noise(0.03, { vol:0.06, freq:6000 });
      this._musicStep++;
    };
    tick();
    this._musicTimer = setInterval(tick, STEP * 1000);
  },

  stopMusic() {
    this._musicOn = false;
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  },
};

// Audio contexts must start from a user gesture
window.addEventListener('keydown', () => Sound.init(), { once: false });
window.addEventListener('pointerdown', () => Sound.init(), { once: false });
