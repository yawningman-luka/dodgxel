let game;
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  game.update(dt);
  game.draw();
  requestAnimationFrame(loop);
}

function scaleCanvas() {
  const canvas = document.getElementById('gameCanvas');
  const margin = 60;
  const scaleX = (window.innerWidth  - 16) / C.W;
  const scaleY = (window.innerHeight - margin) / C.H;
  const scale  = Math.min(scaleX, scaleY, 2);
  canvas.style.width  = Math.floor(C.W * scale) + 'px';
  canvas.style.height = Math.floor(C.H * scale) + 'px';
}

window.addEventListener('load', () => {
  Input.init();
  game = new Game(document.getElementById('gameCanvas'));
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  requestAnimationFrame(t => { lastTime = t; requestAnimationFrame(loop); });
});
