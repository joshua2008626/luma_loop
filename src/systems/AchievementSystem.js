import { LEVELS as TOTAL } from './SaveSystem.js';
// Fallback target time when a level does not define `target`.
export const targetTime = L => L.target ?? 15 + L.P.length * 4;
// Each check receives the save data and the event ({type:'complete', id, time, target, deaths}) that triggered evaluation.
export const ACHIEVEMENTS = [
  { id: 'first_light', name: 'First Light', desc: 'Complete Level 1', check: d => !!d.completed[1] },
  { id: 'dimension_walker', name: 'Dimension Walker', desc: 'Switch dimensions 100 times', check: d => d.stats.switches >= 100 },
  { id: 'collector', name: 'Collector', desc: 'Collect 100 energy fragments', check: d => d.stats.fragments >= 100 },
  { id: 'speed_runner', name: 'Speed Runner', desc: 'Beat a level target time', check: (d, e) => e.type === 'complete' && e.time < e.target },
  { id: 'perfect_run', name: 'Perfect Run', desc: 'Finish a level without dying', check: (d, e) => e.type === 'complete' && e.deaths === 0 },
  { id: 'master', name: 'Master of LUMA', desc: 'Complete all 30 levels', check: d => Object.keys(d.completed).length >= TOTAL }
];
// Mutates data.achievements and returns the achievements unlocked by this event.
export function evaluate(data, event) {
  const fresh = ACHIEVEMENTS.filter(a => !data.achievements.includes(a.id) && a.check(data, event || {}));
  fresh.forEach(a => data.achievements.push(a.id));
  return fresh;
}
