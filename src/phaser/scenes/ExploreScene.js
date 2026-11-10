import { W, H, text, button, panel, keyAction, Menu } from '../ui.js';
import { TEX, PORTRAIT, TILESET, MINIMAP, SFX, MUSIC, CADRE, SHEETS, tileFrame, painted, fitScale, addCharacter, animKey } from '../assets.js';
import { session, saveGame, saveSettings, playSfx, playMusic, applyMute } from '../session.js';
import { ZONES, ZONE_ORDER, move, interact, facingObject, objectsIn, objective } from '../../core/world.js';
import { LAYOUTS, BG, gridToBg, bgToGrid, bgToScreen, HUD_RECTS, HERO_BOX, CADRE_UI, nineSlice, miniMapBox } from '../../core/layout.js';
import { spreadTrail, stepTrail } from '../../core/followers.js';
import { walkPose } from '../../core/poses.js';
import { ATB_LABEL } from './TitleScene.js';

const DELTA = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const STEP_MS = 190;
const VOLUMES = [0, 0.25, 0.5, 0.75, 1];
const OBJ_TEXT_W = 404; // largeur utile du bandeau d'objectif
const DEPTH = { bg: -10000, tiles: -5000, fg: 5000, hud: 10000, msg: 11000, touch: 12000, pause: 13000, debug: 14000 };

export class ExploreScene extends Phaser.Scene {
  constructor() { super('Explore'); }
  init(data) { this.toastMsg = data?.toast ?? null; }

  // Centre (pieds) d'une case, en coordonnées écran 1280×720.
  cell(x, y) { return bgToScreen(gridToBg(LAYOUTS[session.game.zoneId], x, y)); }

  create() {
    const g = session.game;
    const zone = ZONES[g.zoneId], L = LAYOUTS[g.zoneId];
    this.held = null;
    this.nextStep = 0;
    this.dialog = null;
    this.paused = false;
    playMusic(this, g.zoneId === 'quais' || g.zoneId === 'marche' ? MUSIC.eridu : MUSIC.temple);

    // Fond peint (ou uni) + calque de premier plan facultatif.
    this.add.image(0, 0, L.bg).setOrigin(0).setDisplaySize(W, H).setDepth(DEPTH.bg);
    // Calque avant : toujours devant les héros ; s'estompe si le meneur passe derrière (filet de sécurité, cf. tests de calage).
    this.fg = this.textures.exists(L.fg) ? this.add.image(0, 0, L.fg).setOrigin(0).setDisplaySize(W, H).setDepth(DEPTH.fg) : null;
    this.fgFaded = false;
    if (!painted.has(L.bg)) this.drawTiles(zone, L); // pas encore de peinture : on pose le tileset v1 sur la grille

    this.objSprites = {};
    this.glows = {};
    const paintedScene = painted.has(L.bg);
    for (const o of objectsIn(g)) {
      const p = this.cell(o.x, o.y);
      if (paintedScene && L.painted.includes(o.id)) { // socle ou stèle déjà peint : simple halo au pied, pas de sprite
        this.glows[o.id] = this.add.ellipse(p.x, p.y - 4, 70, 26, 0xffe08a, 0.18).setStrokeStyle(2, 0xffe08a, 0.7).setDepth(p.y - 1);
        continue;
      }
      const key = o.type === 'stone' ? TEX[`stone-${o.symbol}`] : o.type === 'npc' ? TEX.dumuzi : o.type === 'sign' ? TEX.sign : TEX[o.enemies[0]];
      // Personnages peints (PNJ, ennemis, boss) : échelle écran du manifest, ancrés par les pieds ; objets v1 à 72 px.
      const s = SHEETS[key] ? addCharacter(this, p.x, p.y, key) : this.add.sprite(p.x, p.y, key, 0).setOrigin(0.5, 0.95).setScale(fitScale(this, key, 72));
      s.setDepth(p.y);
      this.objSprites[o.id] = s;
    }
    // Le meneur (Tishra) et ses deux suiveurs, en file.
    // Suiveurs écartés en file derrière le meneur dès l'arrivée (plus d'empilement sur la case d'apparition).
    const taken = new Set(objectsIn(g).map((o) => `${o.x},${o.y}`));
    this.trail = spreadTrail((x, y) => zone.map[y]?.[x] === '.' && !taken.has(`${x},${y}`), g.pos, g.facing);
    this.heroes = ['tishra', 'neru', 'balum'].map((id) => addCharacter(this, 0, 0, TEX[id]));
    this.heroCells = [g.pos, ...this.trail].map((c) => ({ ...c }));
    this.heroPose = this.heroes.map(() => walkPose(g.facing));
    this.facingMark = this.add.circle(0, 0, 5, 0xfff2b0).setDepth(DEPTH.fg - 1);
    this.hint = text(this, 0, 0, '', 18, { color: '#fff2b0', backgroundColor: '#0b0f1dcc', padding: { x: 6, y: 3 } }).setOrigin(0.5, 1).setDepth(DEPTH.fg + 1);
    this.refreshStones();

    this.touch = this.sys.game.device.input.touch || /[?&]touch=1/.test(location.search);
    this.makeHud(zone);
    this.placeHeroes(false);
    this.refreshHud();

    this.msgPanel = panel(this, W / 2, 652, 760, 104, DEPTH.msg).setVisible(false);
    this.msgText = text(this, W / 2 - 360, 610, '', 20, { wordWrap: { width: 720 } }).setDepth(DEPTH.msg + 1).setVisible(false);

    if (this.touch) this.makeTouchControls();
    this.makePauseMenu();
    this.makeDebug(zone, L);
    this.input.keyboard.on('keydown', (e) => {
      if (e.repeat) return;
      if (e.key.toLowerCase() === 'g') return this.toggleDebug();
      if (session.debugGrid && this.nudge(e)) return;
      this.onKey(keyAction(e));
    });
    this.input.keyboard.on('keyup', (e) => { if (keyAction(e) === this.held) this.held = null; });
    this.input.on('pointerup', () => { this.held = null; });
    if (this.toastMsg) this.toast(this.toastMsg);
  }

  drawTiles(zone, L) {
    const scale = (L.tile.w * (W / BG.w)) / 128;
    zone.map.forEach((row, y) => [...row].forEach((ch, x) => {
      const p = this.cell(x, y);
      const flat = ch === '.' || ch === '~' || ch === 'E';
      // Losange en bas de la frame : sa pointe basse = centre de case + demi-hauteur.
      this.add.image(p.x, p.y + (L.tile.h * (W / BG.w)) / 2, TILESET, tileFrame(session.game.zoneId, ch))
        .setOrigin(0.5, 1).setScale(scale).setDepth(flat ? DEPTH.tiles : p.y + 1);
    }));
  }

  // Bandeau d'objectif : vrai 9-slice Créa (coins fixes à l'échelle 0,5, bords et centre étirés).
  objectiveFrame(R, d) {
    const tex = this.textures.get(CADRE.objectif);
    for (const p of nineSlice(R, CADRE_UI.objectif)) {
      const f = `ns-${p.piece}`;
      if (!tex.has(f)) tex.add(f, 0, p.src.x, p.src.y, p.src.w, p.src.h);
      if (p.w > 0 && p.h > 0) this.add.image(p.x, p.y, CADRE.objectif, f).setOrigin(0).setDisplaySize(p.w, p.h).setDepth(d);
    }
  }

  makeHud(zone) {
    const g = session.game, d = DEPTH.hud;
    // Bandeau d'objectif (haut gauche) avec emblème.
    this.objectiveFrame(HUD_RECTS.objectif, d);
    const icon = this.add.graphics().setDepth(d + 1);
    icon.lineStyle(3, 0xe7c45a).strokeRect(-14, -14, 28, 28).fillStyle(0xe7c45a).fillRect(-6, -6, 12, 12);
    icon.setPosition(62, 56).setRotation(Math.PI / 4);
    this.objText = text(this, 92, 34, '', 20, { color: '#f3e6c4' }).setDepth(d + 1);
    this.zoneText = text(this, 92, 66, `${zone.name} · ${ZONE_ORDER.indexOf(g.zoneId) + 1}/4`, 15, { color: '#d9b45a' }).setDepth(d + 1);
    // Mini-carte dans le cadre doré peint (haut droite).
    const R = HUD_RECTS.miniCarte;
    const MM = this.mm = miniMapBox(zone.map);
    // Intérieur transparent du cadre : fond sombre translucide sous la carte, cadre doré par-dessus les cases.
    this.add.rectangle(MM.inner.x - 3, MM.inner.y - 3, MM.inner.w + 6, MM.inner.h + 6, 0x0b0f1d, 0.72).setOrigin(0).setDepth(d);
    this.add.image(R.x, R.y, CADRE.minimap).setOrigin(0).setDisplaySize(R.w, R.h).setDepth(d + 1.5);
    const colors = { '.': 0xc89b5a, '~': 0x23a6a0, '#': 0x5e3f22, '"': 0x3c8f88, E: 0xe7c45a };
    zone.map.forEach((row, ty) => [...row].forEach((ch, tx) => {
      this.add.rectangle(MM.x + tx * MM.cell, MM.y + ty * MM.cell, MM.cell, MM.cell, colors[ch]).setOrigin(0).setDepth(d + 1);
    }));
    const pin = (key, tx, ty) => this.add.image(MM.x + (tx + 0.5) * MM.cell, MM.y + (ty + 0.5) * MM.cell, key).setDisplaySize(Math.min(14, MM.cell + 2), Math.min(14, MM.cell + 2)).setDepth(d + 2);
    if (zone.exit) pin(MINIMAP.exit, zone.exit.x, zone.exit.y);
    objectsIn(g).forEach((o) => pin(o.type === 'encounter' || o.type === 'boss' ? MINIMAP.enemy : MINIMAP.other, o.x, o.y));
    this.mmPlayer = pin(MINIMAP.player, 0, 0).setDepth(d + 3);
    // Médaillons de l'équipe en bas à gauche (comme la référence) ; remontés si le pad tactile occupe le coin.
    this.partyHud = g.party.map((p, i) => {
      const y = (this.touch ? 160 : HUD_RECTS.medaillons.y + 38) + i * 84;
      this.add.rectangle(140, y, 216, 70, 0x0b0f1d, 0.8).setStrokeStyle(2, 0x8a6a2a).setDepth(d);
      this.add.image(58, y, PORTRAIT[p.id]).setDisplaySize(80, 80).setDepth(d + 2); // médaillon peint (anneau doré inclus)
      const name = text(this, 108, y - 30, '', 16, { color: '#f3e6c4' }).setDepth(d + 2);
      this.add.rectangle(108, y + 4, 128, 12, 0x000000, 0.7).setOrigin(0, 0.5).setDepth(d + 2);
      const hp = this.add.rectangle(108, y + 4, 128, 12, 0x2bb3a3).setOrigin(0, 0.5).setDepth(d + 3);
      const hpText = text(this, 108, y + 14, '', 14, { color: '#bcd4ff' }).setDepth(d + 2);
      return { p, name, hp, hpText };
    });
  }

  makeTouchControls() {
    const d = DEPTH.touch, cx = 120, cy = 610, r = 62;
    const pad = { up: [cx + r * 0.7, cy - r * 0.7, '↗'], right: [cx + r * 0.7, cy + r * 0.7, '↘'], down: [cx - r * 0.7, cy + r * 0.7, '↙'], left: [cx - r * 0.7, cy - r * 0.7, '↖'] };
    const ghost = (b) => { b.bg.setDepth(d).setAlpha(0.45); b.t.setDepth(d + 1).setAlpha(0.85); };
    for (const [dir, [x, y, label]] of Object.entries(pad)) ghost(button(this, x, y, 74, 74, label, () => this.onKey(dir), 30));
    ghost(button(this, 1180, 620, 130, 90, 'Action', () => this.onKey('ok'), 24));
    ghost(button(this, 1180, 236, 130, 46, 'Menu', () => this.onKey('back'), 18));
  }

  makePauseMenu() {
    const g = session.game, st = session.settings, d = DEPTH.pause;
    this.pausePanel = panel(this, W / 2, H / 2, 560, 440, d);
    this.pauseTitle = text(this, W / 2, 178, 'Pause', 26, { color: '#e7c45a' }).setOrigin(0.5).setDepth(d + 1);
    this.pauseMenu = new Menu(this, W / 2, 236, 460, 52, 64, [
      { label: () => 'Reprendre', action: () => this.setPaused(false) },
      {
        label: () => `Mode ATB : ${g.settings.atbMode === 'wait' ? 'Attente' : 'Actif'}`,
        action: () => {
          g.settings.atbMode = st.atbMode = g.settings.atbMode === 'wait' ? 'active' : 'wait';
          saveSettings();
          this.toast(ATB_LABEL[g.settings.atbMode]);
        },
      },
      {
        label: () => `Volume des effets : ${Math.round(st.sfxVolume * 100)} %`,
        action: () => { st.sfxVolume = VOLUMES[(VOLUMES.indexOf(st.sfxVolume) + 1) % VOLUMES.length]; saveSettings(); },
      },
      { label: () => `Muet : ${st.muted ? 'oui' : 'non'}`, action: () => { st.muted = !st.muted; saveSettings(); applyMute(this); } },
      { label: () => 'Retour au titre (reprise au dernier point)', action: () => this.scene.start('Title') },
    ]);
    for (const e of this.pauseMenu.entries) { e.btn.bg.setDepth(d + 2); e.btn.t.setDepth(d + 3); }
    this.setPaused(false);
  }

  // Mode calage (touche G) : grille, coordonnées, et réglage de l'origine / taille des cases.
  makeDebug(zone, L) {
    const d = DEPTH.debug;
    const gfx = this.add.graphics().setDepth(d);
    const colors = { '.': 0x33ff66, E: 0xffdd33, '~': 0x3399ff, '#': 0xff4444, '"': 0xff8844 };
    const k = W / BG.w, hw = (L.tile.w * k) / 2, hh = (L.tile.h * k) / 2;
    const labels = [];
    zone.map.forEach((row, y) => [...row].forEach((ch, x) => {
      const p = this.cell(x, y);
      gfx.lineStyle(2, colors[ch], 0.9).fillStyle(colors[ch], 0.18);
      const pts = [p.x, p.y - hh, p.x + hw, p.y, p.x, p.y + hh, p.x - hw, p.y];
      gfx.fillPoints([0, 2, 4, 6].map((i) => ({ x: pts[i], y: pts[i + 1] })), true);
      gfx.strokePoints([0, 2, 4, 6].map((i) => ({ x: pts[i], y: pts[i + 1] })), true);
      labels.push(text(this, p.x, p.y, `${x},${y}`, 11, { color: '#ffffff' }).setOrigin(0.5).setDepth(d + 1));
    }));
    for (const o of ZONES[session.game.zoneId].objects) {
      const p = this.cell(o.x, o.y);
      labels.push(text(this, p.x, p.y + 12, o.id, 12, { color: '#ffdd33', backgroundColor: '#000000aa' }).setOrigin(0.5, 0).setDepth(d + 1));
    }
    const info = text(this, W / 2, 104, '', 15, { color: '#ffffff', backgroundColor: '#000000cc', padding: { x: 8, y: 4 }, align: 'center' }).setOrigin(0.5, 0).setDepth(d + 2);
    const showInfo = (pointer) => {
      const bx = Math.round((pointer?.x ?? 0) / k), by = Math.round((pointer?.y ?? 0) / k);
      const c = bgToGrid(L, bx, by);
      info.setText(`CALAGE ${session.game.zoneId} — origin {x:${L.origin.x}, y:${L.origin.y}}  tile {w:${L.tile.w}, h:${L.tile.h}}\n` +
        `souris : fond (${bx}, ${by}) → case (${c.x}, ${c.y})   ·   I/J/K/L origine ±5 (Maj ±1)   ·   U/O taille ±4   ·   G quitter`);
    };
    this.input.on('pointermove', (p) => session.debugGrid && showInfo(p));
    showInfo();
    this.debugParts = [gfx, info, ...labels];
    this.debugParts.forEach((p) => p.setVisible(!!session.debugGrid));
  }

  toggleDebug() {
    session.debugGrid = !session.debugGrid;
    this.debugParts.forEach((p) => p.setVisible(session.debugGrid));
  }

  nudge(e) {
    const L = LAYOUTS[session.game.zoneId], step = e.shiftKey ? 1 : 5, key = e.key.toLowerCase();
    const moves = { i: [0, -step], k: [0, step], j: [-step, 0], l: [step, 0] };
    if (moves[key]) { L.origin.x += moves[key][0]; L.origin.y += moves[key][1]; }
    else if (key === 'u' || key === 'o') { L.tile.w += key === 'o' ? 4 : -4; L.tile.h = L.tile.w / 2; }
    else return false;
    console.log(`LAYOUTS.${session.game.zoneId} = { origin: { x: ${L.origin.x}, y: ${L.origin.y} }, tile: { w: ${L.tile.w}, h: ${L.tile.h} } }`);
    this.scene.restart({ toast: null });
    return true;
  }

  setPaused(on) {
    this.paused = on;
    this.held = null;
    this.pausePanel.setVisible(on);
    this.pauseTitle.setVisible(on);
    this.pauseMenu.setVisible(on);
    if (on) this.pauseMenu.refresh();
  }

  onKey(action) {
    if (!action) return;
    if (this.paused) return action === 'back' ? this.setPaused(false) : this.pauseMenu.handle(action);
    if (action === 'back') return this.setPaused(true);
    if (this.dialog) return action === 'ok' && this.advanceDialog();
    if (action === 'ok') return this.handleEvent(interact(session.game));
    if (DELTA[action]) {
      this.held = action;
      this.step();
    }
  }

  update(time) {
    if (this.held && !this.paused && !this.dialog && time >= this.nextStep) this.step();
    for (const h of this.heroes) h.setDepth(h.y); // tri en profondeur selon y
  }

  step() {
    this.nextStep = this.time.now + STEP_MS;
    const g = session.game;
    const prev = { ...g.pos };
    const [dx, dy] = DELTA[this.held];
    const r = move(g, dx, dy);
    if (r.moved && !r.event) {
      playSfx(this, SFX.step);
      this.trail = stepTrail(this.trail, prev);
    }
    this.placeHeroes(r.moved);
    if (r.event) this.handleEvent(r.event);
  }

  handleEvent(ev) {
    if (!ev) return;
    this.held = null;
    if (ev.type === 'zone') {
      playSfx(this, SFX.door);
      saveGame();
      this.scene.restart({ toast: `${ZONES[ev.zoneId].name} — partie sauvegardée, équipe soignée.` });
    } else if (ev.type === 'blocked') this.toast(ev.message);
    else if (ev.type === 'dialog') { playSfx(this, SFX.select); this.showDialog(ev.lines); }
    else if (ev.type === 'puzzle') {
      playSfx(this, ev.result === 'reset' ? SFX.hit : SFX.door);
      this.refreshStones();
      this.toast(ev.message);
    } else if (ev.type === 'battle') this.scene.start('Battle', { ev });
    this.refreshHud();
  }

  // Place (ou fait glisser) le meneur et ses suiveurs sur leurs cases ; sprites dessinés vers le bas-droite.
  placeHeroes(animate) {
    const g = session.game;
    [g.pos, ...this.trail].forEach((pos, i) => {
      const s = this.heroes[i], to = this.cell(pos.x, pos.y), from = this.heroCells[i];
      const dx = pos.x - from.x, dy = pos.y - from.y;
      if (dx || dy) this.heroPose[i] = walkPose({ dx, dy });
      else if (i === 0) this.heroPose[0] = walkPose(g.facing); // le meneur se tourne même sans avancer
      const pose = this.heroPose[i];
      s.setFlipX(pose.flipX);
      this.heroCells[i] = { ...pos };
      if (animate && (to.x !== s.x || to.y !== s.y)) {
        s.play(animKey(s.texture.key, `walk_${pose.dir}`), true);
        this.tweens.add({ targets: s, x: to.x, y: to.y, duration: STEP_MS, onComplete: () => { if (!this.held) s.play(animKey(s.texture.key, `idle_${this.heroPose[i].dir}`), true); } });
      } else {
        s.setPosition(to.x, to.y);
        if (!this.held) s.play(animKey(s.texture.key, `idle_${pose.dir}`), true);
      }
    });
    const { facing } = g;
    const f = this.cell(g.pos.x + facing.dx * 0.45, g.pos.y + facing.dy * 0.45);
    this.facingMark.setPosition(f.x, f.y);
    const o = facingObject(g);
    if (o) {
      const op = this.cell(o.x, o.y);
      this.hint.setText(`Action : ${o.label}`).setPosition(op.x, op.y - 110).setVisible(true);
    } else this.hint.setVisible(false);
    const MM = this.mm;
    this.mmPlayer.setPosition(MM.x + (g.pos.x + 0.5) * MM.cell, MM.y + (g.pos.y + 0.5) * MM.cell);
    this.updateFgFade();
  }

  // Si le calque avant couvre le torse du meneur, on l'estompe pour ne jamais perdre le héros de vue.
  updateFgFade() {
    if (!this.fg) return;
    const g = session.game, p = this.cell(g.pos.x, g.pos.y), src = this.fg.texture.getSourceImage(), k = src.width / W;
    const pts = [[0, -HERO_BOX.h * 0.5], [0, -HERO_BOX.h * 0.25], [-HERO_BOX.w * 0.3, -HERO_BOX.h * 0.4], [HERO_BOX.w * 0.3, -HERO_BOX.h * 0.4]];
    const hidden = pts.filter(([dx, dy]) => (this.textures.getPixelAlpha((p.x + dx) * k, (p.y + dy) * k, this.fg.texture.key) ?? 0) > 128).length >= 2;
    if (hidden === this.fgFaded) return;
    this.fgFaded = hidden;
    this.tweens.add({ targets: this.fg, alpha: hidden ? 0.45 : 1, duration: 160 });
  }

  refreshStones() {
    const pz = session.game.puzzle;
    for (const s of ['eau', 'etoile', 'roseau']) {
      const lit = pz.solved || pz.input.includes(s);
      this.objSprites[`pierre-${s}`]?.setTint(lit ? 0xffffff : 0x8a8a8a);
      this.glows[`pierre-${s}`]?.setFillStyle(lit ? 0x5ad8ff : 0xffe08a, lit ? 0.55 : 0.18).setStrokeStyle(lit ? 3 : 2, lit ? 0x9ff0ff : 0xffe08a, lit ? 1 : 0.7);
    }
  }

  refreshHud() {
    const g = session.game;
    // Une seule ligne dans le bandeau : la police se réduit pour les objectifs longs (20 → 14 px).
    const obj = objective(g);
    if (this.objText.text !== obj) {
      this.objText.setText(obj);
      for (let px = 20; px >= 14 && (px === 20 || this.objText.width > OBJ_TEXT_W); px--) this.objText.setFontSize(px);
      this.objText.setY(34 + (20 - parseInt(this.objText.style.fontSize, 10)) / 2);
    }
    this.zoneText.setText(`${ZONES[g.zoneId].name} · ${ZONE_ORDER.indexOf(g.zoneId) + 1}/4 · Potions ${g.inventory.potions}`);
    for (const v of this.partyHud) {
      v.name.setText(`${v.p.name}  N${v.p.level}`);
      v.hp.setSize(128 * (v.p.hp / v.p.hpMax), 12);
      v.hpText.setText(`PV ${v.p.hp}/${v.p.hpMax}`);
    }
  }

  showMsg(str) {
    this.msgPanel.setVisible(true);
    this.msgText.setVisible(true).setText(str);
  }

  hideMsg() {
    this.msgPanel.setVisible(false);
    this.msgText.setVisible(false);
  }

  toast(str) {
    if (this.dialog) return;
    this.showMsg(str);
    this.toastTimer?.remove();
    this.toastTimer = this.time.delayedCall(2600, () => { if (!this.dialog) this.hideMsg(); });
  }

  showDialog(lines) {
    this.toastTimer?.remove();
    this.dialog = { lines, i: 0 };
    this.showMsg(`${lines[0]}\n▶ Action / Entrée`);
  }

  advanceDialog() {
    const d = this.dialog;
    d.i += 1;
    playSfx(this, SFX.select);
    if (d.i < d.lines.length) return this.showMsg(`${d.lines[d.i]}\n▶ Action / Entrée`);
    this.dialog = null;
    this.hideMsg();
  }
}
