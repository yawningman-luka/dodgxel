const Input = {
  keys: {},
  justPressed: {},
  justReleased: {},
  _prev: {},

  init() {
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
      // Prevent arrow keys and space from scrolling
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      this.justReleased[e.code] = true;
    });
  },

  isDown(code) { return !!this.keys[code]; },
  wasPressed(code) { return !!this.justPressed[code]; },
  wasReleased(code) { return !!this.justReleased[code]; },

  // Check any key from a list
  anyDown(codes) { return codes.some(c => this.isDown(c)); },
  anyPressed(codes) { return codes.some(c => this.wasPressed(c)); },

  flush() {
    this.justPressed = {};
    this.justReleased = {};
  },
};
