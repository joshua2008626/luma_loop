import test from 'node:test';
import assert from 'node:assert/strict';
import { Playables, CloudStorage } from '../src/platform/Playables.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';

test('Playables wrapper is a safe no-op without the SDK', async () => {
  delete globalThis.ytgame;
  assert.equal(Playables.active, false); Playables.firstFrameReady(); Playables.gameReady(); Playables.logError();
  assert.equal(Playables.isAudioEnabled(), true); assert.equal(await Playables.loadData(), null);
  assert.equal(await Playables.saveData('x'), false); assert.equal(await Playables.sendScore(5), false);
});
test('Playables wrapper calls only documented SDK methods when present', async () => {
  const calls = [];
  globalThis.ytgame = { IN_PLAYABLES_ENV: true,
    game: { firstFrameReady: () => calls.push('ffr'), gameReady: () => calls.push('ready'), loadData: async () => '{"a":1}', saveData: async d => calls.push('save:' + d) },
    system: { isAudioEnabled: () => false, onPause: cb => { calls.push('onPause'); return cb; }, onResume: () => calls.push('onResume'), onAudioEnabledChange: () => calls.push('onAudio') },
    engagement: { sendScore: async s => calls.push('score:' + s.value) }, health: { logError: () => calls.push('err') } };
  Playables.firstFrameReady(); Playables.gameReady(); Playables.onPause(() => {}); Playables.onResume(() => {}); Playables.onAudioEnabledChange(() => {}); Playables.logError();
  assert.equal(Playables.active, true); assert.equal(Playables.isAudioEnabled(), false);
  assert.equal(await Playables.loadData(), '{"a":1}'); await Playables.saveData('S'); await Playables.sendScore(12.6);
  assert.deepEqual(calls, ['ffr', 'ready', 'onPause', 'onResume', 'onAudio', 'err', 'save:S', 'score:13']);
  const mem = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; } };
  const cs = new CloudStorage(mem, 10); cs.setItem('k', 'v1'); cs.setItem('k', 'v2'); await cs.flush();
  assert.equal(mem.d.k, 'v2'); assert.deepEqual(calls.slice(-1), ['save:v2']);
  globalThis.ytgame = { IN_PLAYABLES_ENV: true, game: { saveData: async () => { throw new Error('x'); }, loadData: async () => { throw new Error('x'); } } };
  assert.equal(await Playables.saveData('x'), false); assert.equal(await Playables.loadData(), null);
  delete globalThis.ytgame;
});
test('cloud merge keeps the best of both saves and never loses progress', () => {
  const a = new SaveSystem(null); a.completeLevel(1, 500, 30); a.data.stats.switches = 10; a.data.achievements = ['first_light'];
  const b = new SaveSystem(null); b.completeLevel(1, 300, 20); b.completeLevel(2, 400, 25); b.data.stats.switches = 50; b.data.achievements = ['collector'];
  assert.ok(a.mergeFrom(JSON.stringify(b.data)));
  assert.deepEqual(a.data.completed[1], { score: 500, time: 20 }); assert.ok(a.isUnlocked(3));
  assert.equal(a.data.stats.switches, 50); assert.deepEqual(a.data.achievements.sort(), ['collector', 'first_light']); assert.equal(a.totalScore(), 900);
  assert.equal(a.mergeFrom('{garbage'), false); assert.equal(a.totalScore(), 900);
});
