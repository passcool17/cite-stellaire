import { W, text, panel, Menu, keyAction } from '../ui.js';
import { session, clearSave } from '../session.js';
import { completeChapter } from '../../core/world.js';
import { MYTH_NOTE } from './TitleScene.js';

export class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }
  create() {
    const g = session.game;
    const lines = completeChapter(g);
    clearSave();
    text(this, W / 2, 50, 'Fin du chapitre 1', 34, { color: '#e7c45a' }).setOrigin(0.5);
    text(this, 140, 110, lines.join('\n\n'), 20, { wordWrap: { width: W - 280 } });
    text(this, 140, 400, `Équipe : ${g.party.map((p) => `${p.name} niveau ${p.level}`).join(', ')}.`, 16, { color: '#bcd4ff', wordWrap: { width: W - 280 } });
    panel(this, W / 2, 500, 900, 90);
    text(this, W / 2, 500, MYTH_NOTE, 18, { align: 'center', wordWrap: { width: 840 } }).setOrigin(0.5);
    const menu = new Menu(this, W / 2, 620, 360, 56, 70, [{ label: () => 'Retour au titre', action: () => this.scene.start('Title') }]);
    this.input.keyboard.on('keydown', (e) => { const a = keyAction(e); if (a) menu.handle(a); });
  }
}
