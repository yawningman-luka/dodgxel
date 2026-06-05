const C = {
  // Canvas
  W: 800, H: 450,
  GROUND: 370,
  PX: 3,

  // Physics
  GRAVITY: 0.55,
  JUMP_FORCE: -13,
  WALK_SPEED: 2.8,
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
    SP_ROCKET:    '#FF6B35',
    SP_DOUBLE:    '#FFD700',
    SP_SHADOW:    '#9B59B6',
    SP_CURVE:     '#00E5FF',
    SP_BOOMERANG: '#E8A020',
    SP_BLAZE:     '#FF4400',
    SP_HEAVY:     '#A08060',
    SP_SEEKER:    '#FF00CC',
    SP_SPLIT:     '#44FF88',
    SP_EXPLODE:   '#FF6B00',
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
    ARENA_BUILDER: 'arena_builder',
    CHAR_SELECT: 'char_select',
    WORMS: 'worms',
    HOW_TO_PLAY: 'how_to_play',
    ONLINE_LOBBY: 'online_lobby',
    STORY: 'story',
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
  POWERS: ['rocket', 'double', 'shadow', 'curve', 'boomerang', 'blaze', 'heavy', 'seeker', 'split', 'explode'],
  POWER_NAMES: { rocket:'ROCKET', double:'DOUBLE', shadow:'SHADOW', curve:'CURVE',
                 boomerang:'BOOMERANG', blaze:'BLAZE', heavy:'HEAVY', seeker:'SEEKER', split:'SPLIT', explode:'EXPLODE' },

  // Controls screen action list and labels
  CTRL_ACTIONS: ['left','right','jump','crouch','throw','catch','shield'],
  CTRL_LABELS: {
    left: 'Move Left', right: 'Move Right', jump: 'Jump', crouch: 'Crouch',
    throw: 'Throw / Power', catch: 'Catch', shield: 'Shield',
  },
};

// ── Character roster (1 preset per power + custom) ───────────────────────────
const CHARACTERS = [
  { id:'jaco',  name:'JACO',   type:'boy',  power:'rocket',
    colors:{ shirt:'#4169E1', pants:'#1C3A6E', hair:'#A0722A', hairDark:'#6B4A10', hairType:'star',     accessory:'none',     shirtSymbol:'⚡' },
    bio:'Blazing rocket throw. Pure speed, max impact.', accentCol:'#FF6B35' },
  { id:'lucy',  name:'LUCY',   type:'girl', power:'curve',
    colors:{ shirt:'#E14169', pants:'#6E1C3A', hair:'#FFD700', hairDark:'#DAA520', hairType:'wave',     accessory:'none',     shirtSymbol:'★' },
    bio:'Bending throws that follow every dodge.', accentCol:'#00E5FF' },
  { id:'rex',   name:'REX',    type:'boy',  power:'shadow',
    colors:{ shirt:'#6A0DAD', pants:'#3D0070', hair:'#2C2C2C', hairDark:'#111111', hairType:'lionsmane', accessory:'mask',     shirtSymbol:'◆' },
    bio:'Ghost throw — barely visible, almost uncatchable.', accentCol:'#9B59B6' },
  { id:'nova',  name:'NOVA',   type:'girl', power:'double',
    colors:{ shirt:'#CC8800', pants:'#885500', hair:'#FF6B35', hairDark:'#CC4400', hairType:'bun',      accessory:'none',     shirtSymbol:'✦' },
    bio:'Fires two balls at once. Twice the chaos.', accentCol:'#FFD700' },
  { id:'axe',   name:'AXE',    type:'boy',  power:'boomerang',
    colors:{ shirt:'#B25A00', pants:'#7A3A00', hair:'#CC4400', hairDark:'#882200', hairType:'spiky',    accessory:'none',     shirtSymbol:'◆' },
    bio:'Throw it across — it snaps right back.', accentCol:'#E8A020' },
  { id:'blaze', name:'BLAZE',  type:'boy',  power:'blaze',
    colors:{ shirt:'#CC2200', pants:'#881100', hair:'#FF9900', hairDark:'#CC6600', hairType:'spiky',    accessory:'none',     shirtSymbol:'⚡' },
    bio:'Fire trail on every throw. Burns the floor.', accentCol:'#FF4400' },
  { id:'tank',  name:'TANK',   type:'boy',  power:'heavy',
    colors:{ shirt:'#556677', pants:'#334455', hair:'#3A3A3A', hairDark:'#222222', hairType:'buzz',     accessory:'none',     shirtSymbol:'♥' },
    bio:'Massive slow ball. Almost undodgeable.', accentCol:'#A08060' },
  { id:'iris',  name:'IRIS',   type:'girl', power:'seeker',
    colors:{ shirt:'#CC0088', pants:'#880055', hair:'#00DDAA', hairDark:'#00AA88', hairType:'long',     accessory:'glasses',  shirtSymbol:'★' },
    bio:'Homes in on the opponent. No escape.', accentCol:'#FF00CC' },
  { id:'zeph',  name:'ZEPH',   type:'girl', power:'split',
    colors:{ shirt:'#00AA44', pants:'#006622', hair:'#88FF44', hairDark:'#55CC22', hairType:'ponytail', accessory:'headband', shirtSymbol:'✿' },
    bio:'Ball explodes into 3 — triple the trouble.', accentCol:'#44FF88' },
  { id:'boom',  name:'BOOM',   type:'boy',  power:'explode',
    colors:{ shirt:'#FF6B00', pants:'#993300', hair:'#FFCC00', hairDark:'#CC9900', hairType:'spiky',    accessory:'baseball', shirtSymbol:'☯' },
    bio:'Area-blast throw. One hit, everyone nearby feels it.', accentCol:'#FF6B00' },
  { id:'custom', name:'CUSTOM', type:null, power:null, colors:null,
    bio:'Design your own fighter.', accentCol:'#888888' },
];

// Custom builder presets
const CUSTOM_SHIRT_PRESETS     = ['#4169E1','#E14169','#CC2200','#007755','#CC8800','#6A0DAD','#556677','#CC0088','#00AA44','#AAAAAA'];
const CUSTOM_HAIR_PRESETS      = ['#A0722A','#FFD700','#FF9900','#88DDAA','#FF6B35','#2C2C2C','#00DDAA','#88FF44','#FFFFFF','#CC4400'];
// All hair styles in one list; body type is derived from the style chosen
const CUSTOM_HAIR_STYLES  = ['straight','spiky','buzz','ponytail','bun','long','lionsmane','very_long','wave','star'];
const HAIR_STYLE_TO_BODY  = { straight:'boy', spiky:'boy', buzz:'boy', ponytail:'girl', bun:'girl', long:'girl', lionsmane:'boy', very_long:'girl', wave:'girl', star:'boy' };
// Hats · Eyewear · Head · Wings
const CUSTOM_ACCESSORIES  = [
  'none',
  'cap','baseball','cowboy','pirate','knight','football','robin','devil',
  'glasses','shades',
  'headband','mask',
  'wings_butterfly','wings_angel','wings_demon','wings_eagle','wings_robot',
];
const CUSTOM_SHIRT_SYMBOLS= ['none','★','♥','⚡','◆','✦','☯','✿'];

// Ball throw styles
const BALL_STYLES = ['default','fire','ice','gold','dark','toxic','rainbow'];
const BALL_STYLE_LABELS = { default:'DEFAULT', fire:'🔥 FIRE', ice:'🧊 ICE', gold:'✨ GOLD', dark:'🌑 DARK', toxic:'☢ TOXIC', rainbow:'🌈 RAINBOW' };
const BALL_STYLE_DATA   = {
  default: { color:'#E84040', stripe:'#FFFFFF', glow:null },
  fire:    { color:'#FF6600', stripe:'#FFCC00', glow:'#FF4400' },
  ice:     { color:'#44AAFF', stripe:'#AAEEFF', glow:'#88DDFF' },
  gold:    { color:'#FFD700', stripe:'#FFFFFF', glow:'#FFD700' },
  dark:    { color:'#6600CC', stripe:'#AA44FF', glow:'#9933CC' },
  toxic:   { color:'#44FF00', stripe:'#CCFF00', glow:'#44FF00' },
  rainbow: { color:null,      stripe:'#FFFFFF', glow:null },
};

// One-line descriptions shown when cycling powers in the custom builder
const POWER_DESCRIPTIONS  = {
  rocket:    '2× speed, explosive impact',
  double:    'Fires two balls at once',
  shadow:    'Near-invisible ghost ball',
  curve:     'Bends mid-flight',
  boomerang: 'Reverses direction mid-air',
  blaze:     'Fire trail + 2s floor hazard',
  heavy:     '3× bigger, slow & hard to miss',
  seeker:    'Homes toward opponent',
  split:     'Explodes into 3 tiny balls',
  explode:   'Area blast on impact — hits all nearby',
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
