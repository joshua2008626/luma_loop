import Phaser from 'phaser';
import { makeButton } from '../ui/Button.js';
import { Playables } from '../platform/Playables.js';
import { LEVELS } from '../levels/index.js';
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    if (!this.registry.get('ytReady')) { this.registry.set('ytReady', true); Playables.firstFrameReady(); this.events.once('update', () => Playables.gameReady()); }
    const save = this.registry.get('save');
    this.add.rectangle(480, 270, 960, 540, 0x0a2a60);
    for (let i = 0; i < 70; i++) { const s = this.add.image(Math.random() * 960, Math.random() * 540, 'dot').setAlpha(.2 + Math.random() * .6); this.tweens.add({ targets: s, alpha: .1, duration: 1000 + Math.random() * 2000, yoyo: true, repeat: -1 }); }
    this.add.text(480, 130, 'LUMA LOOP', { fontFamily: 'system-ui,sans-serif', fontSize: '84px', fontStyle: 'bold', color: '#aaeeff' }).setOrigin(.5).setShadow(0, 0, '#44ffff', 30, true, true);
    this.add.text(480, 190, 'Every shadow hides a different path. Every light reveals a new possibility.', { fontFamily: 'system-ui,sans-serif', fontSize: '16px', color: '#bbddff' }).setOrigin(.5);
    const orb = this.add.image(480, 235, 'orb').setTint(0xaaeeff); this.tweens.add({ targets: orb, y: 225, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const next = Math.min(save.data.unlocked, LEVELS.length);
    makeButton(this, 480, 305, 220, 52, 'Play', () => this.scene.start('Game', { levelId: next }));
    makeButton(this, 480, 368, 220, 44, 'Level Select', () => this.scene.start('WorldSelect'));
    makeButton(this, 425, 424, 106, 44, 'Settings', () => this.scene.start('Settings'));
    makeButton(this, 535, 424, 106, 44, 'Credits', () => this.scene.start('Credits'));
    this.add.text(480, 480, 'A/D or arrows move · Space jump · Shift switch dimension · Esc pause', { fontFamily: 'system-ui,sans-serif', fontSize: '14px', color: '#99bbdd' }).setOrigin(.5);
    this.add.text(480, 515, 'A game by Joshua Samuel · Just An Hour With Josh', { fontFamily: 'system-ui,sans-serif', fontSize: '13px', color: '#7799cc' }).setOrigin(.5);
  }
}
