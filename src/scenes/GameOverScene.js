import Phaser from 'phaser';
import { makeButton } from '../ui/Button.js';
export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }
  init(d) { this.levelId = (d && d.levelId) || 1; this.deaths = (d && d.deaths) || 0; }
  create() {
    const T = { fontFamily: 'system-ui,sans-serif', color: '#ffffff', align: 'center' };
    this.add.rectangle(480, 270, 960, 540, 0x1a0a30);
    this.add.text(480, 120, 'Game Over', { ...T, fontSize: '56px', fontStyle: 'bold', color: '#f4a8ff' }).setOrigin(.5);
    this.add.text(480, 185, `Level ${this.levelId} · ${this.deaths} falls this run\nTip: dashed outlines show platforms in the other world. Switch in mid-air to cross lasers.`, { ...T, fontSize: '16px', color: '#ccbbdd', lineSpacing: 6 }).setOrigin(.5);
    makeButton(this, 480, 270, 240, 48, 'Try Again', () => this.scene.start('Game', { levelId: this.levelId, deaths: this.deaths }));
    makeButton(this, 480, 330, 240, 48, 'Level Select', () => this.scene.start('LevelSelect', { world: Math.ceil(this.levelId / 10) }));
    makeButton(this, 480, 390, 240, 48, 'Main Menu', () => this.scene.start('Menu'));
  }
}
