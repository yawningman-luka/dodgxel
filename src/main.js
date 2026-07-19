let game;
let lastTime = 0;

function loop(timestamp) {
  const dt = FX.update(Math.min(timestamp - lastTime, 50));
  lastTime = timestamp;
  game.update(dt);
  FX.preDraw(game.ctx);
  game.draw();
  FX.postDraw(game.ctx);
  requestAnimationFrame(loop);
}

function scaleCanvas() {
  const canvas = document.getElementById('gameCanvas');
  if (typeof Touch !== 'undefined' && Touch.active) {
    // Touch/portrait: use the full screen width, keep controls over the image
    const scale = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
    canvas.style.width  = Math.floor(C.W * scale) + 'px';
    canvas.style.height = Math.floor(C.H * scale) + 'px';
    Touch.layout();
    return;
  }
  const margin = 60;
  const scaleX = (window.innerWidth  - 16) / C.W;
  const scaleY = (window.innerHeight - margin) / C.H;
  const scale  = Math.min(scaleX, scaleY, 2);
  canvas.style.width  = Math.floor(C.W * scale) + 'px';
  canvas.style.height = Math.floor(C.H * scale) + 'px';
}

window.addEventListener('load', () => {
  Input.init();
  Touch.init();
  game = new Game(document.getElementById('gameCanvas'));
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  requestAnimationFrame(t => { lastTime = t; requestAnimationFrame(loop); });
});
