import Phaser from 'phaser';
export function makeButton(scene, x, y, w, h, label, cb, color = 0x2a78b4) {
  const bg = scene.add.rectangle(0, 0, w, h, color, .35).setStrokeStyle(2, 0x66ffff);
  const t = scene.add.text(0, 0, label, { fontFamily: 'system-ui,sans-serif', fontSize: Math.min(22, Math.floor(h * .5)) + 'px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(.5);
  const c = scene.add.container(x, y, [bg, t]).setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  c.on('pointerdown', () => { const a = scene.registry.get('audio'); a.startMusic(); a.sfx('click'); cb(); });
  c.on('pointerover', () => bg.setFillStyle(color, .6)); c.on('pointerout', () => bg.setFillStyle(color, .35));
  c.text = t; c.bg = bg; return c;
}
