import Phaser from 'phaser';
import { makeButton } from '../ui/Button.js';
import { LEVELS } from '../levels/index.js';
const T = { fontFamily: 'system-ui,sans-serif', color: '#99bbdd', fontSize: '13px' };
export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }
  init(d) { this.world = (d && d.world) || 1; }
  create() {
    const save = this.registry.get('save');
    this.add.rectangle(480, 270, 960, 540, 0x0a2a60);
    this.add.text(480, 50, `World ${this.world}: Select Level`, { fontFamily: 'system-ui,sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#aaeeff' }).setOrigin(.5);
    for (let k = 0; k < 10; k++) {
      const id = (this.world - 1) * 10 + k + 1, x = 240 + (k % 5) * 120, y = 160 + Math.floor(k / 5) * 140;
      const L = LEVELS.find(l => l.id === id), open = !!L && save.isUnlocked(id), done = save.data.completed[id];
      const b = makeButton(this, x, y, 90, 80, String(id), () => { if (open) this.scene.start('Game', { levelId: id }); }, done ? 0x22aa66 : open ? 0x2a78b4 : 0x444444);
      if (!open) b.setAlpha(.45);
      this.add.text(x, y + 52, L ? L.name : '', { ...T }).setOrigin(.5);
      if (done) this.add.text(x, y + 68, `${done.time.toFixed(1)}s · ${done.score}`, { ...T, color: '#88ffaa' }).setOrigin(.5);
    }
    makeButton(this, 480, 480, 200, 44, 'Back', () => this.scene.start('WorldSelect'));
  }
}
