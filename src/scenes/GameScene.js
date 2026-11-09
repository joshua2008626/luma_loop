import Phaser from 'phaser';
import { EnergySystem } from '../systems/EnergySystem.js';
import { canSwitch, isActive } from '../systems/DimensionSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { makeButton } from '../ui/Button.js';
import { evaluate, targetTime } from '../systems/AchievementSystem.js';
import { Playables } from '../platform/Playables.js';
import { LEVELS } from '../levels/index.js';
const S = 22, TXT = { fontFamily: 'system-ui,sans-serif', color: '#ffffff' };
export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(d) { this.levelId = (d && d.levelId) || 1; this.deaths = (d && d.deaths) || 0; }
  create() {
    this.L = LEVELS.find(l => l.id === this.levelId); this.save = this.registry.get('save'); this.audio = this.registry.get('audio');
    this.dim = 0; this.energy = new EnergySystem(); this.shownE = 100; this.score = 0; this.elapsed = 0; this.got = 0;
    this.paused = false; this.done = false; this.coyote = 0; this.jbuf = 0; this.dead = false;
    this.reduced = this.save.data.settings.reducedMotion || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.add.rectangle(480, 270, 960, 540, 0x0a2a60);
    this.shadowBg = this.add.rectangle(480, 270, 960, 540, 0x2a0a4a).setAlpha(0);
    this.stars = Array.from({ length: 60 }, () => { const z = .2 + Math.random() * .8; const s = this.add.image(Math.random() * 960, Math.random() * 540, 'dot').setAlpha(.2 + .5 * z); s.z = z; s.bx = s.x; return s; });
    // platforms (static bodies toggled per dimension)
    this.plats = this.L.P.map(q => {
      const color = q[4] === 0 ? 0xd8f6ff : q[4] === 1 ? 0x38e8ff : 0xe64cff;
      const r = this.add.rectangle(q[0] + q[2] / 2, q[1] + q[3] / 2, q[2], q[3], color), o = q[5] || {}, moving = !!(o.mx || o.my);
      this.physics.add.existing(r, !moving);
      if (moving) { r.body.setImmovable(true); r.body.allowGravity = false; }
      r.q = q; r.opts = o; r.col = color; r.bx = r.x; r.by = r.y; r.dx = 0; return r;
    });
    if (this.L.laser) { const l = this.L.laser; this.laser = this.add.rectangle(l.x, l.y + l.h / 2, 6, l.h, 0xff4a6a); }
    this.player = this.physics.add.image(this.L.start[0] + 11, this.L.start[1] + 11, 'orb').setTint(0xaaeeff);
    this.player.body.setSize(S, S).setOffset(3, 3); this.player.setCollideWorldBounds(true);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.riding = null;
    this.plats.forEach(r => this.physics.add.collider(this.player, r, (pl, plat) => { if (!pl.body.touching.down) return; this.riding = plat; if (plat.opts.fall && plat.fs === undefined) plat.fs = 0; }));
    this.frags = this.L.F.map(f => { const i = this.add.image(f[0], f[1], 'frag').setTint(0xd0ffff); this.tweens.add({ targets: i, y: f[1] - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); return i; });
    this.portal = this.add.image(this.L.portal[0], this.L.portal[1], 'portal').setTint(0x667788);
    if (!this.reduced) this.tweens.add({ targets: this.portal, angle: 4, duration: 1200, yoyo: true, repeat: -1 });
    this.trail = this.add.particles(0, 0, 'dot', { lifespan: 400, speed: 15, scale: { start: 1.2, end: 0 }, alpha: { start: .7, end: 0 }, frequency: this.reduced ? -1 : 40, tint: 0x77ffff, follow: this.player });
    this.burst = this.add.particles(0, 0, 'dot', { lifespan: 600, speed: { min: 40, max: 200 }, scale: { start: 1.5, end: 0 }, emitting: false });
    // HUD
    this.hudLevel = this.add.text(16, 12, `Level ${this.L.id}/30 · ${this.L.name}`, { ...TXT, fontSize: '16px' });
    this.add.rectangle(16, 44, 200, 12, 0xffffff, .12).setOrigin(0, .5);
    this.bar = this.add.rectangle(16, 44, 200, 12, 0x38e8ff).setOrigin(0, .5);
    this.hudScore = this.add.text(16, 62, '', { ...TXT, fontSize: '14px' });
    this.hudFrag = this.add.text(16, 82, '', { ...TXT, fontSize: '14px' });
    const bt = this.save.data.completed[this.levelId];
    this.add.text(16, 100, bt ? `Best ${bt.time.toFixed(1)}s` : '', { ...TXT, fontSize: '14px', color: '#aaccee' });
    this.hudDim = this.add.text(480, 12, '', { ...TXT, fontSize: '16px' }).setOrigin(.5, 0);
    this.msg = this.add.text(480, 60, '', { ...TXT, fontSize: '16px', color: '#ffffdd' }).setOrigin(.5, 0);
    makeButton(this, 920, 30, 50, 40, 'II', () => this.togglePause());
    this.applyDim(true);
    document.body.classList.add('playing'); this.inp = new InputSystem();
    this.inp.onJump = () => { this.jbuf = .12; }; this.inp.onSwitch = () => this.doSwitch(); this.inp.onPause = () => this.togglePause();
    this.ytPause = () => { if (!this.paused && !this.done && !this.dead) this.togglePause(); };
    this.game.events.on('yt-pause', this.ytPause);
    this.events.once('shutdown', () => { document.body.classList.remove('playing'); this.inp.destroy(); this.game.events.off('yt-pause', this.ytPause); });
  }
  curP() { return this.plats.map(r => [r.x - r.width / 2, r.y - r.height / 2, r.width, r.height, r.q[4]]); }
  refresh() {
    const t = this.elapsed;
    this.plats.forEach(r => {
      const o = r.opts; let on = isActive(r.q, this.dim), a = 1;
      if (o.on !== undefined) { const ph = (t + (o.ph || 0)) % (o.on + o.off); if (ph >= o.on) on = false; else if (ph > o.on - .6) a = .5 + .5 * Math.sin(t * 30); }
      if (r.gone) on = false; else if (r.fs !== undefined) a = .6 + .4 * Math.sin(t * 40);
      r.body.enable = on; r.setAlpha(on ? a : (r.gone ? .08 : .2));
    });
  }
  stepPlatforms(dt) {
    const t = this.elapsed;
    this.plats.forEach(r => {
      const o = r.opts;
      if (o.mx || o.my) { const k = .5 - .5 * Math.cos(6.2832 * t / o.t), ox = r.x; r.x = r.bx + (o.mx || 0) * k; r.y = r.by + (o.my || 0) * k; r.dx = r.x - ox; }
      if (r.fs !== undefined) { r.fs += dt; if (r.fs > .5) r.gone = true; if (r.fs > 2.5) { r.fs = undefined; r.gone = false; } }
    });
    if (this.riding && this.riding.dx) this.player.x += this.riding.dx;
    this.riding = null; this.refresh();
  }
  checkAch() {
    const won = evaluate(this.save.data, { type: 'tick' });
    if (won.length) { this.save.save(); won.forEach((a, i) => this.toast('Achievement: ' + a.name, i)); }
  }
  toast(text, i = 0) {
    const t = this.add.text(480, -30, text, { ...TXT, fontSize: '18px', backgroundColor: '#1a3a6a', padding: { x: 14, y: 8 } }).setOrigin(.5).setDepth(120);
    this.tweens.add({ targets: t, y: 110 + i * 44, duration: this.reduced ? 1 : 300, hold: 2200, yoyo: false, onComplete: () => this.time.delayedCall(2200, () => t.destroy()) });
  }
  closePanel() { if (this.panel) { this.save.save(); this.panel.destroy(); this.panel = null; } }
  pausePanel() {
    if (this.panel) return;
    const s = this.save.data.settings, c = this.add.container(0, 0).setDepth(110), clamp = v => Math.max(0, Math.min(1, Math.round(v * 10) / 10));
    c.add(this.add.rectangle(480, 270, 960, 540, 0x00000a, .92).setInteractive());
    c.add(this.add.text(480, 100, 'Settings', { ...TXT, fontSize: '40px', fontStyle: 'bold' }).setOrigin(.5));
    const row = (y, label, key, fx) => {
      const t = this.add.text(480, y, '', { ...TXT, fontSize: '20px' }).setOrigin(.5), show = () => t.setText(`${label} ${Math.round(s[key] * 100)}%`); c.add(t);
      c.add(makeButton(this, 300, y, 56, 40, '-', () => { s[key] = clamp(s[key] - .2); show(); fx(); })); c.add(makeButton(this, 660, y, 56, 40, '+', () => { s[key] = clamp(s[key] + .2); show(); fx(); })); show();
    };
    row(180, 'Effects', 'sfx', () => this.audio.sfx('collect')); row(240, 'Music', 'music', () => this.audio.startMusic());
    const rm = makeButton(this, 480, 310, 340, 44, '', () => { s.reducedMotion = !s.reducedMotion; lab(); }), lab = () => rm.text.setText('Reduced motion: ' + (s.reducedMotion ? 'On (next level)' : 'Off (next level)')); lab(); c.add(rm);
    c.add(makeButton(this, 480, 380, 200, 44, 'Back', () => this.closePanel())); this.panel = c;
  }
  say(t) { this.msg.setText(t); this.time.delayedCall(1600, () => this.msg.setText('')); }
  applyDim(instant) {
    this.refresh();
    const to = this.dim ? 1 : 0;
    if (instant) this.shadowBg.setAlpha(to); else this.tweens.add({ targets: this.shadowBg, alpha: to, duration: this.reduced ? 1 : 300 });
    this.bar.setFillStyle(this.dim ? 0xd64cff : 0x38e8ff); this.player.setTint(this.dim ? 0xf4a8ff : 0xaaeeff);
    this.hudDim.setText(this.dim ? 'SHADOW WORLD' : 'LIGHT WORLD').setColor(this.dim ? '#f4a8ff' : '#aaeeff');
    if (this.laser) this.laser.setAlpha(this.dim === this.L.laser.dim ? 1 : .18);
  }
  doSwitch() {
    if (this.paused || this.done || this.dead) return;
    if (!this.energy.canSwitch()) { this.say('Not enough energy'); this.audio.sfx('deny'); return; }
    const b = this.player.body, r = canSwitch({ x: b.x, y: b.y, w: S, h: S }, this.curP(), this.dim, b.blocked.down || b.touching.down);
    if (!r.ok) { this.say(r.reason === 'blocked' ? 'Cannot switch: blocked' : 'Cannot switch: platform would vanish'); this.audio.sfx('deny'); return; }
    this.energy.consume(); this.dim = 1 - this.dim; this.save.data.stats.switches++; this.checkAch();
    this.applyDim(false); this.audio.sfx(this.dim ? 'toShadow' : 'toLight');
    if (!this.reduced) { this.burst.emitParticleAt(this.player.x, this.player.y, 24); this.cameras.main.flash(120, this.dim ? 120 : 40, this.dim ? 20 : 120, this.dim ? 160 : 160); }
  }
  die() {
    if (this.dead) return; this.dead = true; this.save.data.stats.deaths++; this.save.save(); this.audio.sfx('die');
    if (!this.reduced) this.cameras.main.shake(250, .01);
    this.time.delayedCall(450, () => { const n = this.deaths + 1; if (n % 5 === 0) this.scene.start('GameOver', { levelId: this.levelId, deaths: n }); else this.scene.restart({ levelId: this.levelId, deaths: n }); });
  }
  togglePause() {
    if (this.panel) { this.closePanel(); return; }
    if (this.done || this.dead) return; this.paused = !this.paused;
    if (this.paused) { this.physics.pause(); this.pauseUI = this.overlay('Paused', [['Resume', () => this.togglePause()], ['Restart', () => this.scene.restart({ levelId: this.levelId })], ['Settings', () => this.pausePanel()], ['Main Menu', () => this.scene.start('Menu')]]); }
    else { this.physics.resume(); this.pauseUI.destroy(); }
  }
  overlay(title, buttons, sub) {
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(480, 270, 960, 540, 0x00000a, .7).setInteractive());
    c.add(this.add.text(480, 130, title, { ...TXT, fontSize: '48px', fontStyle: 'bold' }).setOrigin(.5));
    if (sub) c.add(this.add.text(480, 185, sub, { ...TXT, fontSize: '18px', color: '#ccffff' }).setOrigin(.5));
    buttons.forEach((b, i) => c.add(makeButton(this, 480, 250 + i * 60, 240, 48, b[0], b[1])));
    return c;
  }
  complete() {
    this.done = true; this.physics.pause(); const t = this.elapsed;
    this.score += Math.max(0, Math.round(1000 - t * 10)); const prev = this.save.data.completed[this.levelId], newBest = !prev || t < prev.time; this.save.completeLevel(this.levelId, this.score, t); Playables.sendScore(this.save.totalScore()); this.audio.win();
    const won = evaluate(this.save.data, { type: 'complete', id: this.levelId, time: t, target: targetTime(this.L), deaths: this.deaths }); if (won.length) this.save.save();
    const next = LEVELS.find(l => l.id === this.levelId + 1), btns = [];
    if (next) btns.push(['Next Level', () => this.scene.start('Game', { levelId: next.id })]);
    btns.push(['Replay', () => this.scene.restart({ levelId: this.levelId })], ['Level Select', () => this.scene.start('LevelSelect')]);
    this.overlay(next ? 'Level Complete' : 'The Loop Is Broken', btns, `Score ${this.score}  ·  Time ${t.toFixed(1)}s${newBest ? '  ·  New best!' : ''}` + (next ? '' : '\nYou have completed all 30 levels. There are no more levels.\nLUMA is free: every shadow hid a path, every light revealed one.') + (won.length ? '\nAchievement: ' + won.map(a => a.name).join(', ') : ''));
  }
  update(_, delta) {
    const dt = delta / 1000; this.stars.forEach(s => { s.x = ((s.bx - this.player.x * .05 * s.z * 10) % 960 + 960) % 960; });
    this.shownE += (this.energy.value - this.shownE) * Math.min(1, dt * 8); this.bar.width = 2 * Math.max(0, this.shownE);
    this.hudScore.setText('Score ' + this.score); this.hudFrag.setText(`Fragments ${this.got}/${this.L.F.length} (need ${this.L.need})`);
    if (this.paused || this.done || this.dead) return;
    this.elapsed += dt; this.stepPlatforms(dt); const b = this.player.body, dir = (this.inp.left ? -1 : 0) + (this.inp.right ? 1 : 0);
    b.setVelocityX(Phaser.Math.Linear(b.velocity.x, dir * 230, Math.min(1, dt * 12)));
    const g = b.blocked.down || b.touching.down; this.coyote = g ? .1 : this.coyote - dt; this.jbuf -= dt;
    if (this.jbuf > 0 && this.coyote > 0) { b.setVelocityY(-540); this.coyote = 0; this.jbuf = 0; this.audio.sfx('jump'); }
    this.frags.forEach((f, i) => { if (f.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y) < 22) { f.destroy(); this.got++; this.score += 100; this.energy.restore(15); this.save.data.stats.fragments++; this.checkAch(); this.audio.sfx('collect'); if (!this.reduced) this.burst.emitParticleAt(f.x, f.y, 14); } });
    const l = this.L.laser;
    if (l && this.dim === l.dim && b.right > l.x - 3 && b.x < l.x + 3 && b.bottom > l.y) return this.die();
    if (this.player.y > 580) return this.die();
    const open = this.got >= this.L.need; this.portal.setTint(open ? 0xffffff : 0x667788);
    if (Math.abs(this.player.x - this.portal.x) < 28 && Math.abs(this.player.y - this.portal.y) < 40) { if (open) this.complete(); else if (!this.msg.text) this.say(`Collect at least ${this.L.need} fragments`); }
  }
}
