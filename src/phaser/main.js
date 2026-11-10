import { W, H } from './ui.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { ExploreScene } from './scenes/ExploreScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { session } from './session.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0f1d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, ExploreScene, BattleScene, EndingScene],
});

// Accès de diagnostic (vérifications automatisées en navigateur).
window.__citeStellaire = { game, session };
