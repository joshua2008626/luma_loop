// Procedural WebAudio sfx and a quiet generative music loop. Never required: every failure is swallowed.
// AudioContext is created lazily on a user gesture. `platformEnabled` mirrors the YouTube audio setting.
const SFX = {
  jump: [320, .15, 'square', .05, 640], collect: [880, .14, 'sine', .07, 1320], deny: [120, .15, 'square', .05, 0],
  toLight: [400, .3, 'sawtooth', .05, 900], toShadow: [700, .3, 'sawtooth', .05, 150], die: [220, .5, 'sawtooth', .06, 50], click: [600, .08, 'sine', .05, 0]
};
const NOTES = [220, 261.6, 329.6, 392, 329.6, 261.6, 196, 261.6];
export class AudioSystem {
  constructor(save) { this.save = save; this.ctx = null; this.platformEnabled = true; this.timer = null; this.i = 0; }
  get volume() { return this.save.data.settings.sfx; }
  tone(f, d, type = 'sine', v = .06, f2 = 0, delay = 0, vol = this.volume) {
    if (vol <= 0 || !this.platformEnabled) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v * vol / .8, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d);
    } catch { /* audio is optional */ }
  }
  sfx(name) { const s = SFX[name]; if (s) this.tone(...s); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .3, 'sine', .07, 0, i * .12)); }
  startMusic() {
    if (this.timer) return;
    this.timer = setInterval(() => { const m = this.save.data.settings.music; if (m > 0) this.tone(NOTES[this.i++ % NOTES.length], 1.4, 'sine', .035, 0, 0, m); }, 650);
  }
  setPlatformAudio(on) { this.platformEnabled = on; try { if (this.ctx) on ? this.ctx.resume() : this.ctx.suspend(); } catch { /* ignore */ } }
  suspend() { try { this.ctx && this.ctx.suspend(); } catch { /* ignore */ } }
  resume() { try { this.platformEnabled && this.ctx && this.ctx.resume(); } catch { /* ignore */ } }
}
