import { loadMedia, makePlaceholders, makeAnims } from '../assets.js';
import { applyMute } from '../session.js';
import { W, H, text } from '../ui.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  async create() {
    text(this, W / 2, H / 2, 'Chargement…', 22).setOrigin(0.5);
    await loadMedia(this, window.CS_MEDIA);
    makePlaceholders(this);
    makeAnims(this);
    applyMute(this);
    this.scene.start('Title');
  }
}
