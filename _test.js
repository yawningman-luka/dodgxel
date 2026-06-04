// Minimal browser stubs
const canvas = {
  getContext: () => ({
    imageSmoothingEnabled: false,
    clearRect:()=>{}, fillRect:()=>{}, strokeRect:()=>{},
    beginPath:()=>{}, arc:()=>{}, fill:()=>{}, stroke:()=>{},
    moveTo:()=>{}, lineTo:()=>{}, bezierCurveTo:()=>{}, ellipse:()=>{},
    closePath:()=>{}, save:()=>{}, restore:()=>{}, translate:()=>{},
    scale:()=>{}, rotate:()=>{}, fillText:()=>{},
    createLinearGradient:()=>({addColorStop:()=>{}}),
    shadowColor:'', shadowBlur:0, globalAlpha:1,
    lineWidth:1, strokeStyle:'', fillStyle:'', font:'', textAlign:'left',
  }),
  addEventListener:()=>{},
  getBoundingClientRect:()=>({left:0,top:0,width:800,height:450}),
  width:800, height:450,
};
global.window = { addEventListener:()=>{}, innerWidth:1280, innerHeight:720 };
global.document = { getElementById:()=>canvas };
global.localStorage = { getItem:()=>null, setItem:()=>{} };
global.prompt = (m, d) => d;
global.requestAnimationFrame = ()=>{};

// Load all game scripts
require('./src/constants.js');
require('./src/particles.js');
require('./src/input.js');
require('./src/sprites.js');
require('./src/arena.js');
require('./src/ball.js');
require('./src/player.js');
require('./src/horde.js');
require('./src/builder.js');
require('./src/game.js');

// Run tests
const g = new Game(canvas); // eslint-disable-line no-undef
console.log('1. initial state:', g.state, '(expected: menu)');
console.log('2. menuCursor:', g.menuCursor);
console.log('3. CHAR_SELECT state value:', C.STATE.CHAR_SELECT); // eslint-disable-line no-undef
console.log('4. CHARACTERS count:', CHARACTERS.length); // eslint-disable-line no-undef

// Simulate Enter on cursor 0 (CLASSIC MATCH)
Input.justPressed['Enter'] = true; // eslint-disable-line no-undef
g.update(16);
console.log('5. After Enter on Classic Match -> state:', g.state, '(expected: char_select)');
console.log('6. _cs exists:', g._cs !== undefined);
console.log('7. _cs.dest:', g._cs && g._cs.dest, '(expected: classic)');

// Simulate draw
try {
  g.draw();
  console.log('8. draw() on char_select: OK');
} catch(e) {
  console.log('8. draw() ERROR:', e.message);
  console.log('   ', e.stack.split('\n')[1]);
}

// Reset to menu, cursor=1 (HORDE MODE)
g.state = C.STATE.MENU; // eslint-disable-line no-undef
g.menuCursor = 1;
Input.justPressed['Enter'] = true; // eslint-disable-line no-undef
g.update(16);
console.log('9. After Enter on Horde -> state:', g.state, '(expected: char_select)');
console.log('10. _cs.dest:', g._cs && g._cs.dest, '(expected: horde)');

console.log('\nAll done.');
