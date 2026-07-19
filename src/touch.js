// Mobile touch controls — virtual buttons that inject the same key states
// the keyboard sets on Input (keyed by e.code), so no game code changes needed.
const Touch = {
  active: false,

  detect() {
    return ('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           window.matchMedia('(pointer: coarse)').matches;
  },

  press(code) {
    if (!Input.keys[code]) Input.justPressed[code] = true;
    Input.keys[code] = true;
  },

  release(code) {
    if (Input.keys[code]) Input.justReleased[code] = true;
    Input.keys[code] = false;
  },

  _btn(parent, cls, label, code, opts = {}) {
    const el = document.createElement('div');
    el.className = 'tc-btn ' + cls;
    el.innerHTML = label;
    if (opts.title) el.dataset.hint = opts.title;
    const down = e => {
      e.preventDefault();
      el.classList.add('tc-down');
      this.press(code);
    };
    const up = e => {
      e.preventDefault();
      el.classList.remove('tc-down');
      this.release(code);
    };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    // Mouse fallback so it's testable on desktop
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', e => {
      if (el.classList.contains('tc-down')) up(e);
    });
    parent.appendChild(el);
    return el;
  },

  // Keep the game in portrait: best-effort orientation lock on first touch
  _lockPortrait() {
    const tryLock = () => {
      const p = document.documentElement.requestFullscreen
        ? document.documentElement.requestFullscreen().catch(() => {})
        : Promise.resolve();
      p.then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('portrait').catch(() => {});
        }
      });
      window.removeEventListener('touchend', tryLock);
    };
    window.addEventListener('touchend', tryLock);
  },

  // Anchor the button clusters onto the canvas so thumbs sit over the image
  layout() {
    if (!this.active) return;
    const rect = document.getElementById('gameCanvas').getBoundingClientRect();
    const overlap = Math.min(56, rect.height * 0.3);
    const l = this._elLeft, r = this._elRight, m = this._elMenu;
    l.style.left = '6px';
    l.style.top = (rect.bottom - overlap) + 'px';
    l.style.bottom = 'auto';
    r.style.right = '6px';
    r.style.top = (rect.bottom - overlap) + 'px';
    r.style.bottom = 'auto';
    m.style.top = Math.max(4, rect.top + 4) + 'px';
    m.style.left = '6px';
    m.style.right = '6px';
    m.style.justifyContent = 'space-between';
  },

  init() {
    if (!this.detect()) return;
    this.active = true;
    document.body.classList.add('touch-mode');
    this._lockPortrait();

    const overlay = document.createElement('div');
    overlay.id = 'touch-controls';

    // Left cluster: movement + crouch
    const left = document.createElement('div');
    left.className = 'tc-cluster tc-left';
    this._btn(left, 'tc-move tc-mleft', '◀', 'KeyA');
    this._btn(left, 'tc-move tc-mright', '▶', 'KeyD');
    this._btn(left, 'tc-move tc-mdown', '▼', 'KeyS', { title: 'crouch / aim down' });
    overlay.appendChild(left);
    this._elLeft = left;

    // Right cluster: actions
    const right = document.createElement('div');
    right.className = 'tc-cluster tc-right';
    this._btn(right, 'tc-act tc-jump', '▲<small>JUMP</small>', 'KeyW');
    this._btn(right, 'tc-act tc-throw', '●<small>THROW</small>', 'KeyF');
    this._btn(right, 'tc-act tc-catch', '✋<small>CATCH</small>', 'KeyG');
    this._btn(right, 'tc-act tc-shield', '⛨<small>SHIELD</small>', 'KeyH');
    this._btn(right, 'tc-act tc-sp', '★<small>SP</small>', 'Space');
    overlay.appendChild(right);
    this._elRight = right;

    // Top corners: menu confirm / back
    const menu = document.createElement('div');
    menu.className = 'tc-cluster tc-menu';
    this._btn(menu, 'tc-sys tc-back', '⏴ BACK', 'Escape');
    this._btn(menu, 'tc-sys tc-ok', 'OK ⏵', 'Enter');
    overlay.appendChild(menu);
    this._elMenu = menu;

    document.body.appendChild(overlay);
    this.layout();
    window.addEventListener('resize', () => this.layout());
    window.addEventListener('orientationchange', () => setTimeout(() => this.layout(), 100));

    // Tapping the canvas confirms (Enter) — but only on the main menu.
    // In char select Enter is P1's confirm key, so a stray tap there would
    // instantly lock in the default character.
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (typeof game === 'undefined' || !game || game.state !== C.STATE.MENU) return;
      this.press('Enter');
      setTimeout(() => this.release('Enter'), 60);
    }, { passive: false });
  },
};
