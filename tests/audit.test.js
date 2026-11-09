// Regression tests written from the Playables certification audit (see PLAYABLES_AUDIT.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Playables, CloudStorage } from '../src/platform/Playables.js';
import { AudioSystem } from '../src/systems/AudioSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import viteConfig from '../vite.config.js';
import { auditBundle } from '../scripts/audit-bundle.mjs';

const memStore = () => ({ d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; } });
const fakeSdk = (extra = {}) => ({ IN_PLAYABLES_ENV: true, game: { saveData: async () => {}, loadData: async () => '' }, ...extra });

test('BUG-1 (Integration 4): inside Playables, progress must not also be written to localStorage', async () => {
  const saved = []; globalThis.ytgame = fakeSdk({ game: { saveData: async d => { saved.push(d); }, loadData: async () => '' } });
  const local = memStore(), cs = new CloudStorage(local, 5); cs.setItem('k', 'v'); await cs.flush();
  assert.deepEqual(local.d, {}, 'localStorage must stay untouched in Playables'); assert.deepEqual(saved, ['v']);
  delete globalThis.ytgame;
});

test('BUG-2 (Integration 4): saveData must wait until loadData has completed', async () => {
  const saved = []; globalThis.ytgame = fakeSdk({ game: { saveData: async d => { saved.push(d); }, loadData: async () => '' } });
  let release; const gate = new Promise(r => { release = r; });
  const cs = new CloudStorage(null, 5); cs.setGate(gate);
  cs.setItem('k', 'early'); const p = cs.flush(); await new Promise(r => setTimeout(r, 20));
  assert.deepEqual(saved, [], 'no saveData before loadData completes');
  release(); await p; assert.deepEqual(saved, ['early']);
  delete globalThis.ytgame;
});

test('BUG-3 (Integration 6): no audio is scheduled while the game is paused or muted by the platform', () => {
  let oscillators = 0, tick = null;
  class FakeCtx { constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    resume() { this.state = 'running'; } suspend() { this.state = 'suspended'; }
    createOscillator() { oscillators++; return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } }
  globalThis.window = { AudioContext: FakeCtx };
  const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
  globalThis.setInterval = fn => { tick = fn; return 1; }; globalThis.clearInterval = () => { tick = null; };
  const a = new AudioSystem(new SaveSystem(null)); a.startMusic(); tick && tick();
  const playing = oscillators; assert.ok(playing > 0, 'music plays normally');
  a.suspend(); tick && tick(); tick && tick();
  assert.equal(oscillators, playing, 'nothing may be scheduled while paused');
  a.resume(); tick && tick(); assert.ok(oscillators > playing, 'music resumes after onResume');
  a.setPlatformAudio(false); const muted = oscillators; tick && tick(); a.sfx('jump'); assert.equal(oscillators, muted, 'nothing while YouTube mute is set');
  globalThis.setInterval = realSet; globalThis.clearInterval = realClear; delete globalThis.window;
});

const html0 = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>t</title><script type="module" src="./assets/index-a1_B-2.js"></script></head><body></body></html>';

test('vite: Playables mode injects the SDK before the game script; standalone does not', () => {
  const play = viteConfig({ mode: 'playables' }), plain = viteConfig({ mode: 'production' });
  const out = play.plugins[0].transformIndexHtml(html0), plainOut = plain.plugins[0].transformIndexHtml(html0);
  assert.ok(out.indexOf('https://www.youtube.com/game_api/v1') > 0 && out.indexOf('game_api/v1') < out.indexOf('type="module"'), 'SDK first');
  assert.ok(!plainOut.includes('game_api'), 'no external script in the standalone build');
  assert.equal(play.base, './'); assert.equal(play.build.outDir, 'dist-playables'); assert.equal(plain.build.outDir, 'dist');
});

function makeBundle(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-'));
  for (const [rel, content] of Object.entries(files)) { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); }
  return dir;
}
test('bundle audit passes a clean Playables bundle', () => {
  const sdk = '<script src="https://www.youtube.com/game_api/v1"></script>';
  const dir = makeBundle({ 'index.html': html0.replace('<head>', '<head>' + sdk), 'assets/index-a1_B-2.js': 'console.log(1)' });
  const r = auditBundle(dir, { playables: true }); assert.deepEqual(r.fails, []);
});
test('bundle audit flags every MUST violation it can see', () => {
  const dir = makeBundle({
    'index.html': '<html><head><script src="/assets/a.js"></script><script src="https://cdn.example.com/x.js"></script></head></html>',
    'assets/bad name.js': 'eval("1"); new Worker("w.js");', 'assets/big.bin': Buffer.alloc(600 * 1024) });
  const r = auditBundle(dir, { playables: true }), all = r.fails.join('\n');
  assert.match(all, /absolute path/); assert.match(all, /external URLs/); assert.match(all, /SDK script/); assert.match(all, /disallowed characters/);
  assert.match(r.warns.join('\n'), /512 KiB/); assert.match(r.warns.join('\n'), /eval\(/); assert.match(r.warns.join('\n'), /new Worker/);
  assert.ok(auditBundle(makeBundle({ 'assets/x.js': '1' }), { playables: true }).fails.some(f => /index.html missing/.test(f)));
});
test('bundle audit requires the SDK to be the first script', () => {
  const dir = makeBundle({ 'index.html': '<html><head><script src="./a.js"></script><script src="https://www.youtube.com/game_api/v1"></script></head></html>', 'a.js': '1' });
  assert.ok(auditBundle(dir, { playables: true }).fails.some(f => /before every other script/.test(f)));
});
