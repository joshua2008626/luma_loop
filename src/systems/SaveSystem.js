export const SAVE_VERSION = 1, LEVELS = 30;
const defaults = () => ({ version: SAVE_VERSION, unlocked: 1, completed: {},
  settings: { music: 0.7, sfx: 0.8, reducedMotion: false }, stats: { switches: 0, fragments: 0, deaths: 0 }, achievements: [] });
const num = (v, lo, hi, d) => (Number.isFinite(v) && v >= lo && v <= hi ? v : d);
// `storage` is injectable (localStorage, a fake, or a future cloud-save adapter exposing getItem/setItem).
export class SaveSystem {
  constructor(storage = null, key = 'lumaloop.save') { this.storage = storage; this.key = key; this.data = this.load(); }
  load() {
    try { const raw = this.storage && this.storage.getItem(this.key); return raw ? this.validate(JSON.parse(raw)) : defaults(); }
    catch { return defaults(); }
  }
  validate(o) {
    const d = defaults();
    if (!o || typeof o !== 'object' || o.version !== SAVE_VERSION) return d;
    d.unlocked = Number.isInteger(o.unlocked) ? Math.min(LEVELS, Math.max(1, o.unlocked)) : 1;
    for (const [k, v] of Object.entries(o.completed || {})) {
      const id = +k;
      if (Number.isInteger(id) && id >= 1 && id <= LEVELS && v && Number.isFinite(v.score) && Number.isFinite(v.time)) d.completed[id] = { score: v.score, time: v.time };
    }
    const s = o.settings || {};
    d.settings = { music: num(s.music, 0, 1, .7), sfx: num(s.sfx, 0, 1, .8), reducedMotion: s.reducedMotion === true };
    const t = o.stats || {};
    d.stats = { switches: num(t.switches, 0, 1e9, 0), fragments: num(t.fragments, 0, 1e9, 0), deaths: num(t.deaths, 0, 1e9, 0) };
    d.achievements = Array.isArray(o.achievements) ? o.achievements.filter(a => typeof a === 'string') : [];
    return d;
  }
  save() { try { this.storage && this.storage.setItem(this.key, JSON.stringify(this.data)); return true; } catch { return false; } }
  completeLevel(id, score, time) {
    const prev = this.data.completed[id];
    this.data.completed[id] = { score: prev ? Math.max(prev.score, score) : score, time: prev ? Math.min(prev.time, time) : time };
    this.data.unlocked = Math.max(this.data.unlocked, Math.min(LEVELS, id + 1));
    return this.save();
  }
  totalScore() { return Object.values(this.data.completed).reduce((a, v) => a + v.score, 0); }
  // Merge cloud data without losing anything: best of each level, max stats, union of achievements. Local settings win.
  mergeFrom(raw) {
    let o; try { o = this.validate(JSON.parse(raw)); } catch { return false; }
    const d = this.data; d.unlocked = Math.max(d.unlocked, o.unlocked);
    for (const [k, v] of Object.entries(o.completed)) { const m = d.completed[k]; d.completed[k] = m ? { score: Math.max(m.score, v.score), time: Math.min(m.time, v.time) } : v; }
    for (const k of ['switches', 'fragments', 'deaths']) d.stats[k] = Math.max(d.stats[k], o.stats[k]);
    d.achievements = [...new Set([...d.achievements, ...o.achievements])]; return true;
  }
  isUnlocked(id) { return id >= 1 && id <= this.data.unlocked; }
  reset() { this.data = defaults(); return this.save(); }
}
