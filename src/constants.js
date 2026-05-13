const C = {
  // Canvas
  W: 800, H: 450,
  GROUND: 370,
  PX: 3,

  // Physics
  GRAVITY: 0.55,
  JUMP_FORCE: -13,
  WALK_SPEED: 3.5,
  FRICTION: 0.82,
  BALL_GRAVITY: 0.25,
  BALL_BOUNCE: 0.55,

  // Player
  P_W: 20, P_H: 44,
  CROUCH_H: 14,

  // Ball
  BALL_R: 10,
  MIN_THROW_SPEED: 7,
  MAX_THROW_SPEED: 16,
  THROW_CHARGE_TIME: 900,

  // Catch
  CATCH_RADIUS: 35,
  CATCH_WINDOW: 280,

  // Shield
  SHIELD_RECHARGE: 30000,

  // Superpower
  SP_CHARGE_MAX: 100,
  SP_CHARGE_RATE: 0.08,
  SP_CHARGE_CATCH: 25,
  SP_CHARGE_HIT: 15,

  // Colors
  COL: {
    SKIN: '#FDBCB4',
    HAIR: '#FFD700',
    HAIR_DARK: '#DAA520',
    JACO_HAIR: '#A0722A',
    JACO_HAIR_DARK: '#6B4A10',
    EYE: '#1a1a2e',
    BOY_SHIRT: '#4169E1',
    BOY_PANTS: '#1C3A6E',
    GIRL_SHIRT: '#E14169',
    GIRL_PANTS: '#6E1C3A',
    SHOE: '#3D2B1F',
    BALL: '#E84040',
    BALL_STRIPE: '#FFFFFF',
    SHADOW: 'rgba(0,0,0,0.18)',
    SHIELD: 'rgba(80,180,255,0.5)',
    SHIELD_RING: '#50B4FF',
    CATCH_RING: 'rgba(80,255,120,0.35)',
    P1_HUD: '#4169E1',
    P2_HUD: '#E14169',
    SP_ROCKET: '#FF6B35',
    SP_DOUBLE: '#FFD700',
    SP_SHADOW: '#9B59B6',
  },

  // Game states
  STATE: {
    MENU: 'menu',
    ARENA_SELECT: 'arena_select',
    CONTROLS: 'controls',
    PLAYING: 'playing',
    ROUND_END: 'round_end',
    GAME_OVER: 'game_over',
    HORDE: 'horde',
  },

  WIN_SCORE: 11,
  ROUND_DELAY: 1800,

  // Character names
  P1_NAME: 'JACO',
  P2_NAME: 'LUCY',

  // Default key bindings (used for reset)
  P1_KEYS_DEFAULT: {
    left: 'KeyA', right: 'KeyD', jump: 'KeyW', crouch: 'KeyS',
    throw: 'KeyF', catch: 'KeyG', shield: 'KeyH',
  },
  P2_KEYS_DEFAULT: {
    left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', crouch: 'ArrowDown',
    throw: 'KeyK', catch: 'KeyL', shield: 'KeyO',
  },

  // Superpowers — all shoot-based, randomly assigned when bar fills
  POWERS: ['rocket', 'double', 'shadow'],
  POWER_NAMES: { rocket: 'ROCKET', double: 'DOUBLE', shadow: 'SHADOW' },

  // Controls screen action list and labels
  CTRL_ACTIONS: ['left','right','jump','crouch','throw','catch','shield'],
  CTRL_LABELS: {
    left: 'Move Left', right: 'Move Right', jump: 'Jump', crouch: 'Crouch',
    throw: 'Throw / Power', catch: 'Catch', shield: 'Shield',
  },
};

// Mutable control bindings — loaded from localStorage, used at runtime
const Controls = {
  p1: { ...C.P1_KEYS_DEFAULT },
  p2: { ...C.P2_KEYS_DEFAULT },

  load() {
    try {
      const raw = localStorage.getItem('dodgexl_controls');
      if (raw) {
        const saved = JSON.parse(raw);
        Object.assign(this.p1, saved.p1 || {});
        Object.assign(this.p2, saved.p2 || {});
      }
    } catch (e) {}
  },

  save() {
    try {
      localStorage.setItem('dodgexl_controls', JSON.stringify({ p1: this.p1, p2: this.p2 }));
    } catch (e) {}
  },

  reset() {
    Object.assign(this.p1, C.P1_KEYS_DEFAULT);
    Object.assign(this.p2, C.P2_KEYS_DEFAULT);
    this.save();
  },

  keyName(code) {
    if (!code) return '?';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const arrows = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
    if (arrows[code]) return arrows[code];
    const map = {
      Semicolon: ';', Comma: ',', Period: '.', Slash: '/', Quote: "'",
      BracketLeft: '[', BracketRight: ']', Backslash: '\\',
      Minus: '-', Equal: '=', Backquote: '`',
      Space: 'SPC', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', Tab: 'TAB',
      ShiftLeft: 'L-SFT', ShiftRight: 'R-SFT',
      ControlLeft: 'L-CTL', ControlRight: 'R-CTL',
      AltLeft: 'L-ALT', AltRight: 'R-ALT',
      Numpad0:'N0',Numpad1:'N1',Numpad2:'N2',Numpad3:'N3',Numpad4:'N4',
      Numpad5:'N5',Numpad6:'N6',Numpad7:'N7',Numpad8:'N8',Numpad9:'N9',
      NumpadEnter:'N-ENT', NumpadAdd:'N+', NumpadSubtract:'N-',
      Home:'HOME', End:'END', PageUp:'PGUP', PageDown:'PGDN', Delete:'DEL',
    };
    return map[code] || code.slice(0, 6);
  },
};
