// Checks a built game folder against the YouTube Playables stability/privacy/integration requirements that can be
// verified from files alone. Usage: node scripts/audit-bundle.mjs <dir> [--playables]
// FAIL = breaks a MUST requirement. WARN = breaks a SHOULD, or something YouTube may decline to approve. It cannot judge runtime behaviour.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const MiB = 1024 * 1024, KiB = 1024;
const NAMESPACE_HOSTS = new Set(['www.w3.org', 'www.youtube.com']);
const walk = (dir, base = dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); e.isDirectory() ? walk(f, base, out) : out.push({ rel: path.relative(base, f).split(path.sep).join('/'), file: f, size: fs.statSync(f).size }); } return out; };

export function auditBundle(dir, { playables = false } = {}) {
  const fails = [], warns = [], info = [];
  if (!fs.existsSync(dir)) return { fails: [`folder not found: ${dir}`], warns, info };
  const files = walk(dir), total = files.reduce((a, f) => a + f.size, 0);
  info.push(`${files.length} files, ${(total / KiB).toFixed(0)} KiB total`);
  if (files.length > 8000) fails.push(`file count ${files.length} exceeds 8000`);
  if (total >= 250 * MiB) fails.push(`total bundle ${(total / MiB).toFixed(1)} MiB exceeds 250 MiB`);
  for (const f of files) {
    if (!/^[A-Za-z0-9_.\-/]+$/.test(f.rel)) fails.push(`file name has disallowed characters: ${f.rel}`);
    if (f.size >= 30 * MiB) fails.push(`file over 30 MiB: ${f.rel}`);
    else if (f.size >= 512 * KiB) warns.push(`file over the recommended 512 KiB: ${f.rel} (${(f.size / KiB).toFixed(0)} KiB)`);
  }
  const index = files.find(f => f.rel === 'index.html');
  if (!index) { fails.push('index.html missing at the bundle root'); return { fails, warns, info }; }
  const html = fs.readFileSync(index.file, 'utf8');
  if (/(?:src|href)\s*=\s*["']\/(?!\/)/i.test(html)) fails.push('index.html uses an absolute path (src/href starting with "/"): use relative paths');
  const ext = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)].map(m => m[1]).filter(u => !u.includes('youtube.com/game_api/v1'));
  if (ext.length) fails.push('index.html references external URLs: ' + ext.join(', '));
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(m => m[0]);
  const sdkAt = scripts.findIndex(s => s.includes('youtube.com/game_api/v1'));
  if (playables) {
    if (sdkAt < 0) fails.push('Playables SDK script (https://www.youtube.com/game_api/v1) is missing from index.html');
    else if (sdkAt !== 0) fails.push('Playables SDK script must come before every other script in index.html');
  } else if (sdkAt >= 0) warns.push('SDK script present in a non-Playables build');
  const refs = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi)].map(m => m[1].replace(/^\.\//, '')).filter(r => !/^https?:/.test(r));
  const initial = index.size + files.filter(f => refs.includes(f.rel)).reduce((a, f) => a + f.size, 0);
  info.push(`initial bundle (html + directly referenced files): ${(initial / KiB).toFixed(0)} KiB`);
  if (initial >= 30 * MiB) fails.push('initial bundle over 30 MiB'); else if (initial >= 15 * MiB) warns.push('initial bundle over the recommended 15 MiB');
  const hosts = new Map(), risky = { 'eval(': 0, 'new Function(': 0, 'new Worker(': 0, 'WebAssembly': 0, 'importScripts(': 0 };
  for (const f of files) {
    if (f.rel.endsWith('.css') && /url\(\s*["']?\/(?!\/)/.test(fs.readFileSync(f.file, 'utf8'))) fails.push(`css uses an absolute url(): ${f.rel}`);
    if (!/\.(js|mjs|html)$/.test(f.rel)) continue;
    const text = fs.readFileSync(f.file, 'utf8');
    for (const k of Object.keys(risky)) risky[k] += text.split(k).length - 1;
    for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.set(m[1], (hosts.get(m[1]) || 0) + 1);
  }
  for (const [k, n] of Object.entries(risky)) if (n) warns.push(`${n}x "${k}" found: YouTube may decline games it cannot analyse (eval, web workers, WASM); check that it is dead library code`);
  const foreign = [...hosts.keys()].filter(h => !NAMESPACE_HOSTS.has(h));
  if (foreign.length) warns.push(`URL strings in code (verify none are fetched at runtime; external calls are forbidden): ${foreign.slice(0, 12).join(', ')}${foreign.length > 12 ? ', ...' : ''}`);
  return { fails, warns, info };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] || 'dist-playables', r = auditBundle(dir, { playables: process.argv.includes('--playables') });
  r.info.forEach(l => console.log('INFO ', l)); r.warns.forEach(l => console.log('WARN ', l)); r.fails.forEach(l => console.log('FAIL ', l));
  console.log(r.fails.length ? `\n${r.fails.length} FAIL` : '\nNo FAIL results (this is not certification).');
  process.exit(r.fails.length ? 1 : 0);
}
