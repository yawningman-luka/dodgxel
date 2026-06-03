// ── Story mode — act definitions, enemy waves, dialogue ──────────────────────

const STORY_WORLD_W = 2400;

// Per-act enemy definitions (new categories not in ENEMY_DEFS)
const STORY_ENEMY_DEFS = {
  // Act 2 — Ancients
  golem:      { speed: 0.55, hp: 3, w: 34, h: 58, throwInterval: 3500, throwSpeed: 4.0, color: '#8B7355', pants: '#6B5335' },
  hex_spirit: { speed: 2.2,  hp: 1, w: 18, h: 40, throwInterval: 1200, throwSpeed: 6.5, color: '#9955CC', pants: '#7733AA', teleports: true },
  // Act 3 — Military
  soldier:    { speed: 1.5,  hp: 1, w: 20, h: 44, throwInterval: 1800, throwSpeed: 6.5, color: '#556677', pants: '#334455' },
  drone:      { speed: 1.2,  hp: 1, w: 24, h: 28, throwInterval: 1600, throwSpeed: 5.5, color: '#445566', pants: '#334455', floats: true },
  // Act 4 — Medieval
  knight:     { speed: 0.9,  hp: 3, w: 24, h: 50, throwInterval: 2800, throwSpeed: 5.0, color: '#778899', pants: '#445566' },
  archer:     { speed: 0.7,  hp: 1, w: 18, h: 44, throwInterval: 1100, throwSpeed: 8.0, color: '#8B6914', pants: '#5A4010' },
  // Act 5 — Tech
  robot:      { speed: 1.8,  hp: 2, w: 22, h: 48, throwInterval: 1500, throwSpeed: 7.5, color: '#5599AA', pants: '#336677' },
  hack_drone: { speed: 1.4,  hp: 1, w: 28, h: 28, throwInterval: 2000, throwSpeed: 6.0, color: '#00CCAA', pants: '#009988', floats: true },
};

const STORY_ACTS = [
  {
    id: 'city',
    title: 'ACT 1',
    zone: 'CITY RUINS',
    enemyCategory: 'INFECTED',
    bg: { sky: '#1a1a2e', mid: '#2a2a3e', ground: '#3a2a1a', accent: '#FF6600' },
    waves: [
      [{ type: 'zombie',      count: 3 }],
      [{ type: 'zombie',      count: 2 }, { type: 'fast_zombie', count: 2 }],
    ],
    npc: {
      name: 'DR. WENDY',
      col: '#88FF88',
      portrait: 'wendy',
      lines: [
        "Oh thank goodness — actual living humans!",
        "I've been studying the plague for three weeks.",
        "The cure is DEFINITELY in my lab. Probably.",
        "I may have locked my keys inside though.",
        "Also the lab is on fire. Minor setback.",
        "There's a jungle temple to the east. Try there.",
      ],
    },
    mapPos: { x: 115, y: 225 },
  },
  {
    id: 'jungle',
    title: 'ACT 2',
    zone: 'JUNGLE TEMPLE',
    enemyCategory: 'ANCIENTS',
    bg: { sky: '#0a1a0a', mid: '#1a3a1a', ground: '#2a4a1a', accent: '#44FF88' },
    waves: [
      [{ type: 'golem',     count: 2 }],
      [{ type: 'golem',     count: 2 }, { type: 'hex_spirit', count: 2 }],
    ],
    npc: {
      name: 'PROF. BIFF',
      col: '#DDAA44',
      portrait: 'biff',
      lines: [
        "FINALLY. I've been hiding behind this rock.",
        "I found the Tome of Dodgeball Prophecy!",
        "The cure is mentioned in the footnotes.",
        "The footnotes say: 'refer to main text'.",
        "Classic ancient civilisation circular reference.",
        "The snow base might have actual answers.",
      ],
    },
    mapPos: { x: 270, y: 178 },
  },
  {
    id: 'snow',
    title: 'ACT 3',
    zone: 'SNOW BASE',
    enemyCategory: 'MILITARY',
    bg: { sky: '#1a2a3a', mid: '#2a3a4a', ground: '#c8d8e8', accent: '#88CCFF' },
    waves: [
      [{ type: 'soldier', count: 3 }],
      [{ type: 'soldier', count: 2 }, { type: 'drone', count: 2 }],
    ],
    npc: {
      name: 'GEN. FLUFFKINS',
      col: '#AAAAFF',
      portrait: 'fluffkins',
      lines: [
        "*meow*",
        "I am General Fluffkins. I am misunderstood.",
        "The vial I stole? Mango sports drink.",
        "I like mango. That's not a crime.",
        "The real cure is at the royal castle.",
        "The princesses have known for months. Ask them.",
      ],
    },
    mapPos: { x: 425, y: 138 },
  },
  {
    id: 'castle',
    title: 'ACT 4',
    zone: 'ROYAL CASTLE',
    enemyCategory: 'MEDIEVAL',
    bg: { sky: '#1a1208', mid: '#2a2010', ground: '#3a2a10', accent: '#FFD700' },
    waves: [
      [{ type: 'knight', count: 2 }],
      [{ type: 'knight', count: 2 }, { type: 'archer', count: 2 }],
    ],
    npc: {
      name: 'PRINCESSES DOT & VAL',
      col: '#FF88FF',
      portrait: 'princesses',
      lines: [
        "Oh, you're here to rescue us? We're busy.",
        "We've had the cure for about six months.",
        "It's dodgeball. You throw it at the infected.",
        "The kinetic impact resets their neural pattern.",
        "We filed a seventeen-page report about it.",
        "Nobody in government plays dodgeball, so...",
      ],
    },
    mapPos: { x: 562, y: 198 },
  },
  {
    id: 'tower',
    title: 'ACT 5',
    zone: 'BROADCAST TOWER',
    enemyCategory: 'TECH',
    bg: { sky: '#050510', mid: '#0a0a1a', ground: '#1a1a2a', accent: '#00FFCC' },
    waves: [
      [{ type: 'robot',      count: 3 }],
      [{ type: 'robot',      count: 2 }, { type: 'hack_drone', count: 2 }],
    ],
    npc: {
      name: 'EVERYONE',
      col: '#FFD700',
      portrait: 'everyone',
      lines: [
        "THE SIGNAL IS BROADCASTING!",
        "The infected are recovering everywhere!",
        "It was dodgeball. It was always dodgeball.",
        "The WHO is issuing a formal apology.",
        "General Fluffkins has been knighted.",
        "THE END  —  Thank you for playing DODGXEL!",
      ],
    },
    mapPos: { x: 682, y: 248 },
  },
];
