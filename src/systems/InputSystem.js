// Keyboard (A/D/arrows, Space, Shift, Esc) plus the HTML touch pad in index.html (#bl #br #bj #sw).
export class InputSystem {
  constructor() {
    this.k = {}; this.t = {}; this.onJump = this.onSwitch = this.onPause = () => {}; this.L = [];
    const on = (el, type, fn) => { if (!el) return; el.addEventListener(type, fn); this.L.push([el, type, fn]); };
    on(window, 'keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
      if (e.repeat) return; this.k[e.code] = true;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) this.onJump();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.onSwitch();
      if (e.code === 'Escape' || e.code === 'KeyP') this.onPause();
    });
    on(window, 'keyup', e => { this.k[e.code] = false; });
    const pad = (id, down, up) => {
      const el = document.getElementById(id);
      on(el, 'pointerdown', e => { e.preventDefault(); el.classList.add('on'); down(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => on(el, t, () => { el.classList.remove('on'); up && up(); }));
    };
    pad('bl', () => this.t.l = true, () => this.t.l = false); pad('br', () => this.t.r = true, () => this.t.r = false);
    pad('bj', () => this.onJump()); pad('sw', () => this.onSwitch());
  }
  get left() { return !!(this.k.ArrowLeft || this.k.KeyA || this.t.l); }
  get right() { return !!(this.k.ArrowRight || this.k.KeyD || this.t.r); }
  destroy() { this.L.forEach(([el, t, f]) => el.removeEventListener(t, f)); this.L = []; this.k = {}; this.t = {}; }
}
