import Phaser from 'phaser';
import { SaveSystem } from './systems/SaveSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { Playables, CloudStorage } from './platform/Playables.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { WorldSelectScene } from './scenes/WorldSelectScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { CreditsScene } from './scenes/CreditsScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { GameScene } from './scenes/GameScene.js';

let local = null;
try { local = window.localStorage; local.getItem('ll_probe'); } catch { local = null; }
const store = new CloudStorage(local), save = new SaveSystem(store), audio = new AudioSystem(save);
audio.setPlatformAudio(Playables.isAudioEnabled());
// Boot waits (briefly) for cloud data so the menu shows the merged progress.
const cloud = Promise.race([Playables.loadData().then(raw => { if (raw && save.mergeFrom(raw)) save.save(); }), new Promise(r => setTimeout(r, 2000))]);
window.addEventListener('error', () => Playables.logError());

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 960, height: 540, backgroundColor: '#050818',
  physics: { default: 'arcade', arcade: { gravity: { y: 1500 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: { preBoot: g => { g.registry.set('save', save); g.registry.set('audio', audio); g.registry.set('ready', cloud); } },
  scene: [BootScene, MenuScene, WorldSelectScene, LevelSelectScene, SettingsScene, CreditsScene, GameOverScene, GameScene]
});
let sleepTimer = null;
Playables.onPause(() => { game.events.emit('yt-pause'); audio.suspend(); sleepTimer = setTimeout(() => game.loop.sleep(), 120); });
Playables.onResume(() => { clearTimeout(sleepTimer); game.loop.wake(); audio.resume(); });
Playables.onAudioEnabledChange(on => audio.setPlatformAudio(on));
