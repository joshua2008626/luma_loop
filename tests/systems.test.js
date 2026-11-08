import test from 'node:test';
import assert from 'node:assert/strict';
import { EnergySystem } from '../src/systems/EnergySystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { canSwitch } from '../src/systems/DimensionSystem.js';
import { validateLevel, canJump, SPEED, JUMP, GRAVITY } from '../src/systems/LevelValidator.js';
import { LEVELS } from '../src/levels/index.js';
import { evaluate, targetTime } from '../src/systems/AchievementSystem.js';
const mem = (init = {}) => ({ d: { ...init }, getItem(k) { return k in this.d ? this.d[k] : null; }, setItem(k, v) { this.d[k] = v; } });

test('energy consume, refuse, restore, clamp', () => {
  const e = new EnergySystem(); for (let i = 0; i < 5; i++) assert.ok(e.consume());
  assert.equal(e.value, 0); assert.equal(e.consume(), false); e.restore(500); assert.equal(e.value, 100);
});
test('save: round trip, unlocks, best score/time', () => {
  const s = mem(), a = new SaveSystem(s); a.completeLevel(1, 500, 30); a.completeLevel(1, 300, 20);
  const b = new SaveSystem(s);
  assert.deepEqual(b.data.completed[1], { score: 500, time: 20 }); assert.ok(b.isUnlocked(2)); assert.ok(!b.isUnlocked(3));
});
test('save: corrupted, wrong version, unavailable storage fall back safely', () => {
  assert.equal(new SaveSystem(mem({ 'lumaloop.save': '{nope' })).data.unlocked, 1);
  assert.equal(new SaveSystem(mem({ 'lumaloop.save': JSON.stringify({ version: 99, unlocked: 30 }) })).data.unlocked, 1);
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const s = new SaveSystem(bad); assert.equal(s.completeLevel(1, 1, 1), false); assert.equal(s.data.unlocked, 2);
  assert.equal(new SaveSystem(null).data.unlocked, 1);
});
test('save: out-of-range values are sanitised', () => {
  const raw = JSON.stringify({ version: 1, unlocked: 999, completed: { 5: { score: 'x', time: 1 }, 99: { score: 1, time: 1 } }, settings: { music: 7 } });
  const d = new SaveSystem(mem({ 'lumaloop.save': raw })).data;
  assert.equal(d.unlocked, 30); assert.deepEqual(d.completed, {}); assert.equal(d.settings.music, .7);
});
test('dimension: refuses switch on vanishing platform or into a solid', () => {
  const P = [[0, 100, 100, 16, 1], [0, 0, 100, 16, 2]];
  assert.equal(canSwitch({ x: 10, y: 78, w: 22, h: 22 }, P, 0, true).reason, 'vanishing-platform');
  assert.equal(canSwitch({ x: 10, y: 2, w: 22, h: 22 }, P, 0, false).reason, 'blocked');
  assert.ok(canSwitch({ x: 10, y: 50, w: 22, h: 22 }, P, 0, false).ok);
});
test('every shipped level passes validation', () => {
  assert.ok(LEVELS.length >= 3);
  for (const L of LEVELS) { const r = validateLevel(L); assert.ok(r.ok, `level ${L.id}: ${r.errors}`); }
});
test('validator rejects impossible layouts', () => {
  const L = { start: [60, 470], portal: [880, 458], need: 1, P: [[0, 500, 200, 40, 0], [700, 500, 200, 40, 0]], F: [[100, 400]] };
  assert.deepEqual(validateLevel(L).errors, ['portal unreachable']);
  const tall = { ...L, P: [[0, 500, 200, 40, 0], [220, 300, 200, 16, 1], [440, 500, 460, 40, 0]] };
  assert.ok(!validateLevel(tall).ok);
  const chain = { ...L, portal: [935, 458], P: [[0, 500, 200, 40, 0], [230, 440, 140, 16, 2], [400, 440, 140, 16, 1], [570, 440, 140, 16, 2], [740, 440, 140, 16, 1], [910, 500, 50, 40, 0]] };
  assert.ok(validateLevel(chain).ok, 'four switches fit in 100 energy');
  assert.ok(!validateLevel(chain, { maxEnergy: 60 }).ok, 'insufficient energy must fail');
});

test('levels are sequential, unique, and have enough fragments', () => {
  LEVELS.forEach((L, i) => { assert.equal(L.id, i + 1); assert.ok(L.F.length >= L.need); });
  assert.equal(new Set(LEVELS.map(L => JSON.stringify(L.P))).size, LEVELS.length, 'no duplicate layouts');
});
test('achievements unlock once, from real conditions', () => {
  const d = new SaveSystem(null).data;
  assert.deepEqual(evaluate(d, { type: 'complete', time: 5, target: 20, deaths: 0 }).map(a => a.id).sort(), ['perfect_run', 'speed_runner']);
  d.completed[1] = { score: 1, time: 1 }; d.stats.switches = 100;
  assert.deepEqual(evaluate(d, { type: 'complete', time: 50, target: 20, deaths: 2 }).map(a => a.id).sort(), ['dimension_walker', 'first_light']);
  assert.deepEqual(evaluate(d, { type: 'complete', time: 50, target: 20, deaths: 2 }), []);
  assert.ok(!d.achievements.includes('master')); assert.ok(targetTime(LEVELS[0]) > 0);
});

test('validator checks moving, timed and plain-start rules', () => {
  const base = { start: [60, 470], portal: [880, 458], need: 1, F: [[100, 400]] };
  const G = [0, 500, 200, 40, 0], E = [760, 500, 200, 40, 0];
  assert.ok(validateLevel({ ...base, P: [G, [330, 450, 100, 16, 0, { mx: 200, t: 4 }], E] }).ok, 'fair mover bridges a wide gap');
  assert.ok(!validateLevel({ ...base, P: [G, [330, 450, 100, 16, 0, { mx: 150, t: 1 }], E] }).ok, 'too-fast mover rejected');
  assert.ok(!validateLevel({ ...base, P: [G, [330, 450, 100, 16, 0, { on: 0.5, off: 3 }], E] }).ok, 'too-short timed window rejected');
  assert.ok(!validateLevel({ ...base, P: [[0, 500, 200, 40, 0, { mx: 10, t: 4 }], E] }).ok, 'moving start rejected');
  assert.ok(!validateLevel({ ...base, P: [G, [330, 450, 100, 16, 0, { mx: 500, t: 4 }], E] }).ok, 'huge mover rejected');
});

test('all 30 levels exist, are in bounds, and the master achievement is reachable', () => {
  assert.equal(LEVELS.length, 30); assert.deepEqual([1, 2, 3].map(w => LEVELS.filter(L => L.world === w).length), [10, 10, 10]);
  for (const L of LEVELS) for (const [x, y] of L.F) assert.ok(x > 0 && x < 960 && y > 0 && y < 540, `fragment out of bounds in level ${L.id}`);
  const d = new SaveSystem(null).data; LEVELS.forEach(L => { d.completed[L.id] = { score: 1, time: 1 }; });
  assert.ok(evaluate(d, { type: 'complete', time: 99, target: 1, deaths: 1 }).some(a => a.id === 'master'));
});

test('validator rejects a laser that cuts through a platform players stand on', () => {
  const L = { start: [60, 470], portal: [880, 458], need: 1, F: [[100, 400]], P: [[0, 500, 200, 40, 0], [90, 400, 24, 16, 0], [760, 500, 200, 40, 0]], laser: { x: 100, y: 300, h: 250, dim: 0 } };
  assert.ok(validateLevel(L).errors.some(e => e.startsWith('laser overlaps')));
  assert.ok(!validateLevel({ ...L, laser: { ...L.laser, x: 400 } }).errors.some(e => e.startsWith('laser overlaps')));
});

test('jump envelope is conservative versus a frame-stepped simulation of the game physics', () => {
  const dt = 1 / 60;
  for (const rise of [-120, -60, 0, 30, 60, 85]) {
    // simulate: leave the edge at SPEED, jump, and record how far the body travels before descending to `rise`
    let x = 0, y = 0, vy = -JUMP, t = 0, travel = 0;
    for (let i = 0; i < 600; i++) { vy += GRAVITY * dt; y += vy * dt; x += SPEED * dt; t += dt; if (vy > 0 && -y <= rise) { travel = x; break; } }
    assert.ok(travel > 0, 'simulation reached the target height for rise ' + rise);
    const maxGap = 18 + travel; // gap - 18 = travel
    assert.ok(canJump(maxGap * .8, rise), 'comfortable gap must pass at rise ' + rise);
    assert.ok(!canJump(maxGap + 40, rise), 'impossible gap must fail at rise ' + rise);
  }
  assert.ok(!canJump(30, 120), 'rise above the jump apex fails');
});
