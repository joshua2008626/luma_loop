import { isActive } from './DimensionSystem.js';
// Conservative jump envelope from the prototype physics (speed 230 px/s, jump 540 px/s, gravity 1500 px/s^2).
export const MAX_GAP = 140, MAX_RISE = 85;
export const SPEED = 230, JUMP = 540, GRAVITY = 1500, MARGIN = 0.85, BODY = 22;
// Can a player jump across a horizontal edge gap `gap` to a target whose top is `rise` px above the launch top (negative = lower)?
// The body needs to travel about gap - 20 px (it can launch overhanging the edge and land overlapping the far edge), at SPEED while airborne.
export function canJump(gap, rise) {
  const apex = JUMP * JUMP / (2 * GRAVITY);
  if (rise > MAX_RISE || rise > apex) return false;
  const t = JUMP / GRAVITY + Math.sqrt(2 * (apex - rise) / GRAVITY);
  return Math.max(0, gap - (BODY - 2)) <= SPEED * t * MARGIN;
}
// Positions a platform can occupy (moving platforms: both extremes; the player may wait for the right moment).
const pos = q => { const o = q[5] || {}; return (o.mx || o.my) ? [[q[0], q[1], q[2], q[3]], [q[0] + (o.mx || 0), q[1] + (o.my || 0), q[2], q[3]]] : [[q[0], q[1], q[2], q[3]]]; };
const gapX = (a, b) => Math.max(b[0] - (a[0] + a[2]), a[0] - (b[0] + b[2]), 0);
const near = (a, b) => pos(a).some(pa => pos(b).some(pb => canJump(gapX(pa, pb), pa[1] - pb[1])));
// Breadth-first search over (platform, dimension, switches-left). Energy refills from fragments are ignored (strict test).
// Laser barriers are not modelled (they can be crossed by switching in the air).
export function validateLevel(L, { maxEnergy = 100, cost = 20 } = {}) {
  const errors = [], P = L.P;
  if (!P.length) return { ok: false, errors: ['no platforms'] };
  for (const q of P) {
    for (const [x, y, w] of pos(q)) if (x < 0 || x + w > 960 || y < 0 || y > 540) errors.push('platform out of bounds: ' + q);
    const o = q[5] || {};
    if ((o.mx || o.my) && (!(o.t >= 3) || Math.abs(o.mx || 0) > 220 || Math.abs(o.my || 0) > 140)) errors.push('moving platform too fast or too far: ' + q);
    if (o.on !== undefined && (!(o.on >= 1.5) || !(o.off <= 3))) errors.push('timed platform window unfair: ' + q);
  }
  if (L.need > L.F.length) errors.push('need exceeds fragment count');
  // A laser may cross a platform, but only if some part of it leaves room to stand safely beside the beam.
  if (L.laser) { const { x, y, h, dim } = L.laser; for (const q of P) if (isActive(q, dim)) for (const [px, py, pw] of pos(q)) if (px < x + 3 && px + pw > x - 3 && py > y && py - 22 < y + h && (x - 3) - px < 22 && (px + pw) - (x + 3) < 22) errors.push('laser overlaps a platform: ' + q); }
  const sx = L.start[0] + 11, sb = L.start[1] + 22;
  const start = P.findIndex(q => sx >= q[0] && sx <= q[0] + q[2] && q[1] >= sb - 2 && q[1] - sb <= 12 && isActive(q, 0));
  if (start < 0) errors.push('start is not on a Light-active platform');
  let goal = -1, bestD = 1e9;
  P.forEach((q, i) => { const dy = q[1] - L.portal[1]; if (L.portal[0] >= q[0] && L.portal[0] <= q[0] + q[2] && dy >= 0 && dy < bestD) { bestD = dy; goal = i; } });
  if (goal < 0 || bestD > 70) errors.push('portal has no platform beneath it');
  if ((start >= 0 && P[start][5]) || (goal >= 0 && P[goal][5])) errors.push('start and goal platforms must be plain');
  if (errors.length) return { ok: false, errors };
  const seen = new Set(), key = (i, d, e) => i + '|' + d + '|' + e;
  let frontier = [[start, 0, Math.floor(maxEnergy / cost), 0]], minSwitches = null;
  seen.add(key(start, 0, frontier[0][2]));
  while (frontier.length && minSwitches === null) {
    const next = [];
    for (const [i, d, e, n] of frontier) {
      if (i === goal) { minSwitches = n; break; }
      const push = (j, d2, e2) => { const k = key(j, d2, e2); if (!seen.has(k)) { seen.add(k); next.push([j, d2, e2, n + 1]); } };
      if (P[i][4] === 0 && e > 0) push(i, 1 - d, e - 1);
      for (let j = 0; j < P.length; j++) {
        if (j === i || !near(P[i], P[j])) continue;
        if (isActive(P[j], d)) push(j, d, e);
        else if (e > 0 && isActive(P[j], 1 - d)) push(j, 1 - d, e - 1);
      }
    }
    frontier = next;
  }
  return minSwitches === null ? { ok: false, errors: ['portal unreachable'] } : { ok: true, errors: [], steps: minSwitches };
}
