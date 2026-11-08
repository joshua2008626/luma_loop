import Phaser from 'phaser';
import { makeButton } from '../ui/Button.js';
import { LEVELS } from '../levels/index.js';
const T = { fontFamily: 'system-ui,sans-serif', color: '#ffffff' };
export const WORLDS = [['World 1', 'THE AWAKENING'], ['World 2', 'THE FRACTURED REALM'], ['World 3', 'THE FINAL LOOP']];
export class WorldSelectScene extends Phaser.Scene {
  constructor() { super('WorldSelect'); }
  create() {
    const save = this.registry.get('save');
    this.add.rectangle(480, 270, 960, 540, 0x0a2a60);
    this.add.text(480, 50, 'Select World', { ...T, fontSize: '36px', fontStyle: 'bold', color: '#aaeeff' }).setOrigin(.5);
    WORLDS.forEach(([n, title], i) => {
      const first = i * 10 + 1, open = save.isUnlocked(first) && LEVELS.some(l => l.id === first);
      const done = LEVELS.filter(l => l.world === i + 1 && save.data.completed[l.id]).length;
      const b = makeButton(this, 480, 150 + i * 105, 560, 84, `${n}: ${title}   (${done}/10)`, () => { if (open) this.scene.start('LevelSelect', { world: i + 1 }); }, open ? 0x2a78b4 : 0x444444);
      if (!open) { b.setAlpha(.45); b.text.setText(`${n}: ${title}   (locked)`); }
    });
    makeButton(this, 480, 480, 200, 44, 'Back', () => this.scene.start('Menu'));
  }
}
