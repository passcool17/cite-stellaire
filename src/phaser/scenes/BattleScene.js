import { W, H, text, bar, panel, keyAction, Menu } from '../ui.js';
import { TEX, PORTRAIT, ICON, SFX, MUSIC, SHEETS, addCharacter, animKey } from '../assets.js';
import { battlePoses, POSE_ONCE } from '../../core/poses.js';
import { LAYOUTS } from '../../core/layout.js';
import { session, loadGame, playSfx, playMusic } from '../session.js';
import { createBattle, update, readyAllies, act } from '../../core/battle.js';
import { createEnemy, createLahama, SKILLS } from '../../core/combat.js';
import { createGame, resolveBattle } from '../../core/world.js';

const alive = (f) => f.hp > 0;
const FIGHT_SCALE = { hero: 1.2, enemy: 1.2, boss: 1.15 }; // un peu plus grands qu'en exploration
const HERO_SPOTS = [[600, 262], [640, 357], [600, 452]]; // équipe face aux ennemis (à gauche)

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  init({ ev }) { this.ev = ev; }

  create() {
    const g = session.game;
    const enemies = this.ev.boss ? [createLahama()] : this.ev.enemies.map((k, i) => createEnemy(k, i));
    this.b = createBattle({ party: g.party, enemies, inventory: g.inventory, atbMode: g.settings.atbMode });
    this.mode = 'idle'; // idle | command | target-enemy | target-ally | done
    this.pending = null;
    this.targetIndex = 0;

    // Paysage : fond de la zone assombri, ennemis à gauche, équipe et commandes à droite.
    this.add.image(0, 0, LAYOUTS[g.zoneId].bg).setOrigin(0).setDisplaySize(W, H);
    this.add.rectangle(0, 0, W, H, this.ev.boss ? 0x12061e : 0x05070f, 0.62).setOrigin(0);
    panel(this, W / 2, 34, 520, 52);
    text(this, W / 2, 34, `Combat — ${this.ev.label}`, 22, { color: '#e7c45a' }).setOrigin(0.5);
    text(this, 330, 704, `ATB : ${g.settings.atbMode === 'wait' ? 'Attente (temps figé pendant le choix)' : 'Actif (le temps continue)'}`, 14, { color: '#bcae8a' }).setOrigin(0.5);

    this.enemyViews = enemies.map((e, i) => {
      const x = enemies.length === 1 ? (e.boss ? 300 : 330) : 190 + i * 260, y = e.boss ? 470 : 420;
      const key = TEX[e.kind];
      const sprite = addCharacter(this, x, y, key, e.boss ? FIGHT_SCALE.boss : FIGHT_SCALE.enemy).setInteractive();
      if (e.boss) sprite.setFlipX(true); // la tête de Lahama vers l'équipe
      sprite.on('pointerdown', () => this.tapTarget('enemy', e));
      const top = y - SHEETS[key].size * sprite.scaleY * SHEETS[key].origin[1] * 0.85;
      const name = text(this, x, y + 10, e.name, 18, { stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0);
      return { e, sprite, base: sprite.x, name, hp: bar(this, x - 90, y + 46, 180, 12, 0xc0392b), gauge: bar(this, x - 90, y + 64, 180, 9, 0xe7c45a), cursor: text(this, x, top - 40, '▼', 30, { color: '#fff2b0' }).setOrigin(0.5, 0) };
    });
    // Les trois héros peints, à droite, tournés vers les ennemis (repos « bas » = trois-quarts gauche).
    this.heroSprites = Object.fromEntries(g.party.map((p, i) => {
      const [x, y] = HERO_SPOTS[i];
      const s = addCharacter(this, x, y, TEX[p.id], FIGHT_SCALE.hero).setDepth(y);
      return [p.id, s];
    }));

    this.partyViews = g.party.map((p, i) => {
      const y = 120 + i * 92;
      const row = this.add.rectangle(970, y, 560, 82, 0x0e1830, 0.85).setStrokeStyle(1, 0x8a6a2a).setInteractive();
      row.on('pointerdown', () => this.tapTarget('ally', p));
      this.add.image(730, y, PORTRAIT[p.id]).setDisplaySize(76, 76); // médaillon peint
      return {
        p, row, name: text(this, 778, y - 32, '', 18), hpText: text(this, 1010, y - 32, '', 16),
        hp: bar(this, 778, y + 4, 220, 12, 0x2ecc71), gauge: bar(this, 1010, y + 4, 220, 12, 0xe7c45a),
        cursor: text(this, 676, y - 16, '▶', 26, { color: '#fff2b0', stroke: '#0b0f1d', strokeThickness: 3 }),
      };
    });

    panel(this, 330, 590, 620, 120);
    this.logText = text(this, 34, 540, '', 17, { wordWrap: { width: 590 }, color: '#e8dcb8' });
    this.prompt = text(this, 970, 400, '', 18, { color: '#fff2b0', align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5);
    this.menu = new Menu(this, 990, 452, 480, 48, 60, [
      { label: () => 'Attaque', action: () => this.choose('attack') },
      { label: () => `Compétence${this.actor()?.skills[0] ? ` : ${SKILLS[this.actor().skills[0]].name}` : ' (niveau 2)'}`, action: () => this.choose('skill') },
      { label: () => `Objet : potion (${this.b.inventory.potions})`, action: () => this.choose('item') },
      { label: () => 'Défense', action: () => this.choose('defend') },
    ]);
    this.icons = ['attack', 'skill', 'item', 'defend'].map((k, i) => this.add.image(780, 452 + i * 60, ICON[k]).setDisplaySize(32, 32).setVisible(false));
    if (this.ev.boss) playMusic(this, MUSIC.temple);
    this.setMode('idle');
    this.input.keyboard.on('keydown', (e) => { if (!e.repeat) this.onKey(keyAction(e)); });
  }

  // Sons et retours visuels des événements du combat (file b.events remplie par la logique).
  playEvents() {
    for (const ev of this.b.events.splice(0)) {
      playSfx(this, ev.type === 'spell' ? SFX.spell : SFX.hit);
      for (const { id, pose } of battlePoses(ev)) this.pose(id, pose);
      if (ev.type === 'rage') this.cameras.main.shake(300, 0.01);
      const enemyView = this.enemyViews.find((v) => v.e.id === ev.targetId);
      if (ev.type === 'hit' && enemyView) {
        enemyView.sprite.setTintFill(0xffffff);
        this.time.delayedCall(90, () => (enemyView.e.phase === 2 ? enemyView.sprite.setTint(0xff9090) : enemyView.sprite.clearTint()));
      }
      const partyView = this.partyViews.find((v) => v.p.id === ev.targetId);
      if (partyView) {
        partyView.row.setStrokeStyle(2, ev.type === 'spell' ? 0x2ecc71 : 0xc0392b);
        this.time.delayedCall(250, () => partyView.row.setStrokeStyle(1, 0x5a4a2a));
      }
    }
  }

  // Animation d'un combattant : attack / cast / hit une fois (avec un élan vers l'adversaire), puis repos ;
  // le boss en phase 2 reste en boucle « rage ». Les ennemis sans frame « hit » ne font que le flash blanc.
  pose(id, pose) {
    const hero = this.heroSprites[id], view = this.enemyViews.find((v) => v.e.id === id);
    const s = hero ?? view?.sprite;
    if (!s) return;
    const key = s.texture.key, anims = SHEETS[key].anims;
    const rest = () => (view?.e.phase === 2 && anims.rage ? 'rage' : anims.idle ? 'idle' : 'idle_down');
    if (!anims[pose]) return;
    s.play(animKey(key, pose), true);
    if (POSE_ONCE.has(pose)) {
      // La pose reste tenue un instant (lisible même avec une seule frame), puis retour au repos.
      s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.time.delayedCall(280, () => { if (s.active) s.play(animKey(key, rest()), true); }));
      if (pose === 'attack') {
        const dir = hero ? -1 : 1;
        this.tweens.add({ targets: s, x: s.x + dir * 36, duration: 140, yoyo: true, hold: 160 });
      }
    }
  }

  actor() { return this.b.party.find((p) => p.id === this.actorId && alive(p) && p.ready); }

  targets() { return this.mode === 'target-enemy' ? this.b.enemies.filter(alive) : this.b.party.filter(alive); }

  choose(type) {
    const skill = this.actor()?.skills[0];
    if (type === 'skill' && !skill) return this.say(`${this.actor().name} débloque sa compétence au niveau 2.`);
    if (type === 'item' && this.b.inventory.potions <= 0) return this.say('Plus de potion.');
    this.pending = type;
    if (type === 'attack' || (type === 'skill' && skill === 'visee')) return this.setMode('target-enemy');
    if (type === 'item') return this.setMode('target-ally');
    this.doAct(null);
  }

  doAct(target) {
    const r = act(this.b, this.actorId, { type: this.pending, targetId: target?.id });
    this.setMode(r.ok ? 'idle' : 'command');
    if (!r.ok) this.say(r.message);
  }

  tapTarget(kind, f) {
    if ((kind === 'enemy' && this.mode === 'target-enemy') || (kind === 'ally' && this.mode === 'target-ally')) this.doAct(f);
  }

  setMode(mode) {
    this.mode = mode;
    this.targetIndex = 0;
    this.menu.setVisible(mode === 'command');
    this.icons?.forEach((i) => i.setVisible(mode === 'command'));
    if (mode === 'command') this.menu.refresh();
    const who = this.actor()?.name ?? '';
    this.prompt.setText({
      command: `${who} est prêt : choisis une action`,
      'target-enemy': 'Choisis un ennemi (←/→ puis Entrée, ou touche-le) — Échap : retour',
      'target-ally': 'Choisis un allié (↑/↓ puis Entrée, ou touche sa ligne) — Échap : retour',
    }[mode] ?? '');
  }

  say(msg) { this.prompt.setText(msg); }

  onKey(a) {
    if (!a) return;
    if (this.mode === 'command') return this.menu.handle(a);
    if (this.mode !== 'target-enemy' && this.mode !== 'target-ally') return;
    const list = this.targets();
    if (a === 'back') return this.setMode('command');
    if (a === 'ok') return this.doAct(list[this.targetIndex]);
    const d = a === 'left' || a === 'up' ? -1 : 1;
    this.targetIndex = (this.targetIndex + d + list.length) % list.length;
  }

  update(time, delta) {
    const b = this.b;
    if (this.mode === 'done') return;
    if (!this.actor() && this.mode !== 'idle') this.setMode('idle'); // acteur KO pendant le choix (mode Actif)
    if (this.mode === 'idle' && readyAllies(b).length) {
      this.actorId = readyAllies(b)[0].id;
      this.setMode('command');
    }
    update(b, Math.min(delta, 100), { menuOpen: this.mode !== 'idle' });
    this.playEvents();
    this.render();
    if (b.outcome) this.finish();
  }

  render() {
    const list = this.targets();
    for (const v of this.enemyViews) {
      v.hp.set(v.e.hp / v.e.hpMax);
      v.gauge.set(v.e.gauge / v.e.gaugeMax);
      v.sprite.setAlpha(alive(v.e) ? 1 : 0.2);
      if (v.e.phase === 2 && !v.raged) { v.raged = true; v.sprite.setTint(0xff9090); v.name.setText(`${v.e.name} — RAGE`); this.pose(v.e.id, 'rage'); }
      v.cursor.setVisible(this.mode === 'target-enemy' && list[this.targetIndex] === v.e);
    }
    for (const v of this.partyViews) {
      const p = v.p;
      v.name.setText(`${p.name}  N${p.level}${p.defending ? '  [Défense]' : ''}`);
      v.hpText.setText(`PV ${p.hp}/${p.hpMax}`);
      v.hp.set(p.hp / p.hpMax);
      v.gauge.set(p.gauge / p.gaugeMax);
      v.row.setFillStyle(p.id === this.actorId && this.mode !== 'idle' ? 0x3b5a96 : 0x1d2b4a, alive(p) ? 0.7 : 0.25);
      this.heroSprites[p.id].setAlpha(alive(p) ? 1 : 0.3);
      v.cursor.setVisible(this.mode === 'target-ally' && list[this.targetIndex] === p);
    }
    this.logText.setText(this.b.log.slice(-3).join('\n'));
  }

  finish() {
    this.mode = 'done';
    this.menu.setVisible(false);
    const g = session.game;
    const r = resolveBattle(g, { encounterId: this.ev.encounterId, outcome: this.b.outcome, xpReward: this.b.xpReward });
    if (r.type === 'defeat') {
      this.say('Défaite… reprise au dernier point de sauvegarde.');
      return this.time.delayedCall(2000, () => {
        if (!loadGame()) session.game = createGame(g.settings);
        this.scene.start('Explore', { toast: 'Reprise au point de sauvegarde.' });
      });
    }
    playSfx(this, SFX.victory);
    const ups = r.levelUps?.length ? ` Niveau supérieur : ${r.levelUps.join(', ')} !` : '';
    this.say(`Victoire ! +${this.b.xpReward} XP.${ups}`);
    // Toujours passer des données : Phaser réutilise sinon celles du démarrage précédent (bannière périmée).
    this.time.delayedCall(2000, () => (r.type === 'ending' ? this.scene.start('Ending') : this.scene.start('Explore', { toast: null })));
  }
}
