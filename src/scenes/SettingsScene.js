import Phaser from 'phaser';
import { makeButton } from '../ui/Button.js';
import { ACHIEVEMENTS } from '../systems/AchievementSystem.js';
const T = { fontFamily: 'system-ui,sans-serif', color: '#ffffff' };
const clamp = v => Math.max(0, Math.min(1, Math.round(v * 10) / 10));
export class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }
  create() {
    const save = this.registry.get('save'), audio = this.registry.get('audio'), s = save.data.settings, st = save.data.stats;
    this.add.rectangle(480, 270, 960, 540, 0x0a2a60);
    this.add.text(480, 40, 'Settings', { ...T, fontSize: '36px', fontStyle: 'bold', color: '#aaeeff' }).setOrigin(.5);
    const row = (y, label, key, test) => {
      this.add.text(60, y - 34, label, { ...T, fontSize: '18px' });
      const v = this.add.text(300, y, '', { ...T, fontSize: '22px' }).setOrigin(.5), show = () => v.setText(Math.round(s[key] * 100) + '%');
      const step = d => { s[key] = clamp(s[key] + d); save.save(); show(); test(); };
      makeButton(this, 180, y, 56, 44, '-', () => step(-.2)); makeButton(this, 420, y, 56, 44, '+', () => step(.2)); show();
    };
    row(150, 'Sound effects volume', 'sfx', () => audio.sfx('collect'));
    row(225, 'Music volume', 'music', () => audio.startMusic());
    const rm = makeButton(this, 300, 290, 300, 44, '', () => { s.reducedMotion = !s.reducedMotion; save.save(); lab(); });
    const lab = () => rm.text.setText('Reduced motion: ' + (s.reducedMotion ? 'On' : 'Off')); lab();
    makeButton(this, 300, 350, 300, 44, 'Reset progress', () => this.confirmReset(save), 0x8a2a3a);
    this.add.text(60, 395, `Statistics\nSwitches ${st.switches}   Fragments ${st.fragments}   Deaths ${st.deaths}\nLevels completed ${Object.keys(save.data.completed).length}/30   Total score ${save.totalScore()}`, { ...T, fontSize: '15px', color: '#cceeff', lineSpacing: 5 });
    this.add.text(560, 100, 'Achievements', { ...T, fontSize: '18px' });
    ACHIEVEMENTS.forEach((a, i) => { const got = save.data.achievements.includes(a.id); this.add.text(560, 140 + i * 44, `${got ? '✓' : '·'} ${a.name}`, { ...T, fontSize: '17px', color: got ? '#88ffaa' : '#8899bb' }); this.add.text(580, 160 + i * 44, a.desc, { ...T, fontSize: '13px', color: '#8899bb' }); });
    makeButton(this, 780, 495, 160, 36, 'Back', () => this.scene.start('Menu'));
  }
  confirmReset(save) {
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(480, 270, 960, 540, 0x00000a, .8).setInteractive());
    c.add(this.add.text(480, 200, 'Erase all progress?', { ...T, fontSize: '36px', fontStyle: 'bold' }).setOrigin(.5));
    c.add(this.add.text(480, 245, 'Levels, scores, stats and achievements will be lost.', { ...T, fontSize: '16px', color: '#ccddee' }).setOrigin(.5));
    c.add(makeButton(this, 380, 320, 160, 48, 'Erase', () => { save.reset(); this.scene.restart(); }, 0x8a2a3a));
    c.add(makeButton(this, 580, 320, 160, 48, 'Cancel', () => c.destroy()));
  }
}
