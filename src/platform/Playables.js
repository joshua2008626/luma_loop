// Thin wrapper over the documented YouTube Playables web SDK (ytgame). Every call is a safe no-op when the SDK is absent,
// so the game runs normally in a plain browser. Only methods from the official SDK reference are used:
// game.firstFrameReady/gameReady/loadData/saveData, system.isAudioEnabled/onAudioEnabledChange/onPause/onResume,
// engagement.sendScore, health.logError, IN_PLAYABLES_ENV.
const yt = () => { const g = globalThis.ytgame; return g && typeof g === 'object' ? g : null; };
const guard = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
const live = () => { const g = yt(); return g && g.IN_PLAYABLES_ENV ? g : null; };
export const Playables = {
  get active() { return !!live(); },
  firstFrameReady() { guard(() => yt() && yt().game.firstFrameReady()); },
  gameReady() { guard(() => yt() && yt().game.gameReady()); },
  isAudioEnabled() { return guard(() => (yt() ? yt().system.isAudioEnabled() !== false : true), true); },
  onAudioEnabledChange(cb) { return guard(() => yt() && yt().system.onAudioEnabledChange(cb)); },
  onPause(cb) { return guard(() => yt() && yt().system.onPause(cb)); },
  onResume(cb) { return guard(() => yt() && yt().system.onResume(cb)); },
  async loadData() { try { const g = live(); if (!g) return null; const d = await g.game.loadData(); return typeof d === 'string' && d ? d : null; } catch { return null; } },
  async saveData(str) { try { const g = live(); if (!g) return false; await g.game.saveData(str); return true; } catch { return false; } },
  async sendScore(n) { try { const g = live(); if (!g) return false; await g.engagement.sendScore({ value: Math.max(0, Math.round(n)) }); return true; } catch { return false; } },
  logError() { guard(() => live() && live().health.logError()); }
};
// Storage adapter for SaveSystem.
// Standalone: localStorage. Inside Playables: cloud save ONLY (the certification forbids any other progress mechanism),
// debounced, and never sent before loadData() has completed (otherwise the SDK rejects it).
export class CloudStorage {
  constructor(local, delay = 500) { this.local = local; this.delay = delay; this.timer = null; this.pending = null; this.gate = Promise.resolve(); }
  setGate(promise) { this.gate = Promise.resolve(promise).catch(() => {}); }
  getItem(k) { return !Playables.active && this.local ? this.local.getItem(k) : null; }
  setItem(k, v) {
    if (Playables.active) { this.pending = v; clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), this.delay); return; }
    if (!this.local) throw new Error('no storage');
    this.local.setItem(k, v);
  }
  async flush() {
    clearTimeout(this.timer); await this.gate;
    if (this.pending === null) return false;
    const v = this.pending; this.pending = null; return Playables.saveData(v);
  }
}
