// Petits composants UI partagés : texte, bouton tactile, panneau encadré, barre, menu clavier, touches.
import { FRAME_CORNER, SFX } from './assets.js';
import { playSfx } from './session.js';
export const W = 1280;
export const H = 720;
const FONT = { fontFamily: 'Georgia, "Times New Roman", serif', color: '#f3e6c4' };

export const text = (scene, x, y, str, size = 18, extra = {}) =>
  scene.add.text(x, y, str, { ...FONT, fontSize: `${size}px`, ...extra });

export function button(scene, x, y, w, h, label, onClick, size = 20) {
  const bg = scene.add.rectangle(x, y, w, h, 0x1d2b4a, 0.92).setStrokeStyle(2, 0xd9b45a).setInteractive({ useHandCursor: true });
  const t = text(scene, x, y, label, size, { align: 'center' }).setOrigin(0.5);
  bg.on('pointerdown', (p, lx, ly, ev) => { ev?.stopPropagation?.(); onClick(); });
  return {
    bg, t,
    setLabel(s) { t.setText(s); return this; },
    setSelected(on) { bg.setFillStyle(on ? 0x3b5a96 : 0x1d2b4a, 0.92); return this; },
    setEnabled(on) { t.setAlpha(on ? 1 : 0.4); return this; },
    setVisible(on) { bg.setVisible(on); t.setVisible(on); return this; },
  };
}

// Panneau avec les coins ornés du pack (ui-cadre-coin, miroité aux 4 coins, affiché à 32 px).
export function panel(scene, x, y, w, h, depth = 0) {
  const parts = [scene.add.rectangle(x, y, w, h, 0x0e1830, 0.92).setStrokeStyle(2, 0x8a6a2a).setDepth(depth)];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    parts.push(scene.add.image(x + sx * (w / 2 - 16), y + sy * (h / 2 - 16), FRAME_CORNER)
      .setDisplaySize(32, 32).setFlip(sx > 0, sy > 0).setDepth(depth + 0.1));
  }
  return { parts, setVisible(on) { parts.forEach((p) => p.setVisible(on)); return this; } };
}

export function bar(scene, x, y, w, h, color) {
  scene.add.rectangle(x, y, w, h, 0x000000, 0.6).setOrigin(0, 0.5).setStrokeStyle(1, 0x5a4a2a);
  const fill = scene.add.rectangle(x, y, w, h, color).setOrigin(0, 0.5);
  return { fill, set(r) { fill.setSize(Math.max(0, Math.min(1, r)) * w, h); } };
}

// Touche → action ('up' | 'down' | 'left' | 'right' | 'ok' | 'back'). ZQSD (AZERTY) et WASD acceptés.
const KEYS = {
  arrowup: 'up', z: 'up', w: 'up', arrowdown: 'down', s: 'down',
  arrowleft: 'left', q: 'left', a: 'left', arrowright: 'right', d: 'right',
  enter: 'ok', ' ': 'ok', escape: 'back',
};
export const keyAction = (e) => KEYS[e.key.toLowerCase()] ?? null;

// Menu vertical navigable au clavier ; chaque entrée est aussi un bouton tactile.
export class Menu {
  constructor(scene, x, y, w, h, gap, entries) {
    this.scene = scene;
    this.entries = entries.map((e, i) => ({ ...e, btn: button(scene, x, y + i * gap, w, h, e.label(), () => this.pick(i)) }));
    this.index = 0;
    this.refresh();
  }
  refresh() {
    if (!this.entries[0].btn.t.scene) return; // scène déjà quittée
    this.entries.forEach((e, i) => e.btn.setLabel(e.label()).setSelected(i === this.index).setEnabled(e.enabled?.() ?? true));
  }
  pick(i) {
    playSfx(this.scene, SFX.select);
    this.index = i;
    const e = this.entries[i];
    if (e.enabled?.() ?? true) e.action();
    this.refresh();
  }
  handle(action) {
    const n = this.entries.length;
    if (action === 'up' || action === 'left') this.index = (this.index + n - 1) % n;
    if (action === 'down' || action === 'right') this.index = (this.index + 1) % n;
    if (action !== 'ok' && action !== 'back') playSfx(this.scene, SFX.select);
    if (action === 'ok') return this.pick(this.index);
    this.refresh();
  }
  setVisible(on) { this.entries.forEach((e) => e.btn.setVisible(on)); }
}
