import Phaser from 'phaser';
import { Playables } from '../platform/Playables.js';
// Procedural textures only: no external assets to fail loading. Doubles as the loading screen.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    this.add.text(480, 270, 'LUMA LOOP\nloading...', { fontFamily: 'system-ui,sans-serif', fontSize: '32px', color: '#aaeeff', align: 'center' }).setOrigin(.5);
    Playables.firstFrameReady(); // the loading screen is on screen (certification Integration 2)
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    for (let r = 14; r > 0; r -= 2) { g.fillStyle(0xffffff, r > 11 ? .08 : r > 8 ? .2 : 1); g.fillCircle(14, 14, r); }
    g.generateTexture('orb', 28, 28); g.clear();
    g.fillStyle(0xffffff, .25); g.fillRect(2, 2, 16, 16); g.fillStyle(0xffffff, 1); g.fillRect(6, 6, 8, 8); g.generateTexture('frag', 20, 20); g.clear();
    g.lineStyle(2, 0xffffff, 1); for (let i = 0; i < 3; i++) g.strokeEllipse(30, 40, 28 + i * 12, 52 + i * 6); g.generateTexture('portal', 60, 80); g.clear();
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4); g.generateTexture('dot', 4, 4); g.destroy();
    Promise.resolve(this.registry.get('ready')).catch(() => {}).then(() => this.scene.start('Menu'));
  }
}
