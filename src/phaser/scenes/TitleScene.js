import { W, H, text, panel, Menu, keyAction } from '../ui.js';
import { TITLE_BG } from '../assets.js';
import { session, saveSettings, saveGame, loadGame, hasSave } from '../session.js';
import { createGame } from '../../core/world.js';

export const MYTH_NOTE = 'Cadre mésopotamien et mythes des Anunna documentés ; toute lecture extraterrestre est de la FICTION, pas un fait historique.';
export const ATB_LABEL = { wait: 'Attente (le temps se fige dans les menus)', active: 'Actif (le temps continue)' };

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const settings = session.settings;
    const canContinue = hasSave();
    const bg = this.add.image(W / 2, H / 2, TITLE_BG);
    bg.setScale(Math.max(W / bg.width, H / bg.height)); // « cover » : recadré au centre
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.35);
    text(this, W / 2, 80, 'Cité Stellaire', 72, { color: '#e7c45a', stroke: '#0b0f1d', strokeThickness: 6 }).setOrigin(0.5);
    text(this, W / 2, 150, 'Chapitre 1 — Eridu', 26, { stroke: '#0b0f1d', strokeThickness: 4 }).setOrigin(0.5);
    panel(this, W / 2, 380, 900, 84);
    text(this, W / 2, 380, MYTH_NOTE, 18, { align: 'center', wordWrap: { width: 840 } }).setOrigin(0.5);

    this.menu = new Menu(this, W / 2, 470, 420, 52, 62, [
      { label: () => 'Nouvelle partie', action: () => this.start(createGame({ atbMode: settings.atbMode })) },
      { label: () => 'Continuer', enabled: () => canContinue, action: () => loadGame() && this.scene.start('Explore', { toast: 'Partie reprise au dernier point de sauvegarde.' }) },
      {
        label: () => `Mode ATB : ${settings.atbMode === 'wait' ? 'Attente' : 'Actif'}`,
        action: () => {
          settings.atbMode = settings.atbMode === 'wait' ? 'active' : 'wait';
          saveSettings();
          this.modeText.setText(ATB_LABEL[settings.atbMode]);
        },
      },
    ]);
    if (canContinue) this.menu.index = 1;
    this.menu.refresh();
    this.modeText = text(this, W / 2, 666, ATB_LABEL[settings.atbMode], 16, { color: '#e8dcb8', stroke: '#0b0f1d', strokeThickness: 3 }).setOrigin(0.5);
    text(this, W / 2, 698, 'Flèches/ZQSD + Entrée, ou touchez les boutons · G : grille de calage (exploration)', 15, { color: '#e8dcb8', stroke: '#0b0f1d', strokeThickness: 3 }).setOrigin(0.5);
    this.input.keyboard.on('keydown', (e) => { const a = keyAction(e); if (a && !e.repeat) this.menu.handle(a); });
  }
  start(game) {
    session.game = game;
    saveGame();
    this.scene.start('Explore', { toast: 'Partie sauvegardée (début des quais).' });
  }
}
