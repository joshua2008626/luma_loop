import Phaser from 'phaser';
import { makeButton } from '../ui/Button.js';
export class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }
  create() {
    this.add.rectangle(480, 270, 960, 540, 0x0a2a60);
    const T = { fontFamily: 'system-ui,sans-serif', color: '#ffffff', align: 'center' };
    this.add.text(480, 60, 'Credits', { ...T, fontSize: '40px', fontStyle: 'bold', color: '#aaeeff' }).setOrigin(.5);
    this.add.text(480, 130, 'LUMA LOOP', { ...T, fontSize: '28px', fontStyle: 'bold' }).setOrigin(.5);
    this.add.text(480, 250, 'Design, code and levels: Joshua Samuel\nGaming brand: Just An Hour With Josh\nyoutube.com/@justanhourjosh\n\nBuilt with Phaser 3 and Vite\nAll graphics and sounds are generated in code', { ...T, fontSize: '20px', lineSpacing: 8 }).setOrigin(.5);
    this.add.text(480, 400, 'Every shadow hides a different path.\nEvery light reveals a new possibility.', { ...T, fontSize: '16px', color: '#bbddff' }).setOrigin(.5);
    makeButton(this, 480, 480, 200, 44, 'Back', () => this.scene.start('Menu'));
  }
}
