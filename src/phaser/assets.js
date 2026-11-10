// Textures et sons : les médias embarqués (window.CS_MEDIA, pack Créa + SFX Voix) sont chargés sous leurs clés ;
// toute clé absente reçoit un placeholder géométrique de même taille et découpe (manifest Créa).
import { LAYOUTS, CADRE_UI } from '../core/layout.js';

export const TILE = { w: 128, h: 64, cell: 92 }; // losange 128×64 en bas d'une cellule de 92 px (tileset v1)
export const painted = new Set(); // clés réellement chargées depuis les médias (vs placeholders)
// Échelle pour afficher la frame 0 d'une texture à `px` pixels de haut (héros 96 px quelle que soit la feuille).
export const fitScale = (scene, key, px) => px / scene.textures.getFrame(key, 0).height;
const ZONE_COLORS = { quais: '#1d4a52', marche: '#5a4326', cour: '#4a3220', sanctuaire: '#1b2546' };

export const TILESET = 'tileset-eridu';
// Frames du tileset utilisées par les cartes (noms du manifest).
export const TILE_FRAME = { '.': 'sol-brique', '~': 'canal-turquoise', '#': 'mur-temple', '"': 'roseaux', E: 'escalier' };
// Variantes par zone (frames du même tileset).
export const ZONE_TILES = { cour: { E: 'porte-temple' }, sanctuaire: { '.': 'dalle-stellaire' } };
export const tileFrame = (zoneId, ch) => ZONE_TILES[zoneId]?.[ch] ?? TILE_FRAME[ch];
const TILE_GRID = ['sol-brique', 'sol-brique-use', 'canal-turquoise', 'bord-canal', 'digue', 'mur-temple', 'porte-temple', 'roseaux', 'palmier', 'escalier', 'dalle-stellaire', 'sable-ocre'];

// Clé de texture par entité = nom du fichier Créa (pack-ch1-peint, préparé par scripts/prepare-persos.py).
export const TEX = {
  tishra: 'tishra', neru: 'neru', balum: 'balum', dumuzi: 'dumuzi-abzu',
  pillard: 'pillard-des-digues', esprit: 'esprit-des-roseaux', scorpion: 'scorpion-des-briques', gardien: 'gardien-de-seuil', lahama: 'lahama-fausse',
  // Hors pack (placeholders ; dans la cour peinte, socles et stèle sont dans le décor) :
  'stone-eau': 'obj-stone-eau', 'stone-etoile': 'obj-stone-etoile', 'stone-roseau': 'obj-stone-roseau', sign: 'obj-inscription',
};
// Feuilles peintes, à leur taille d'affichage à l'écran 1280×720 (frame Créa × display_scale × 1280/1920) :
// size = côté d'une frame, origin = ancrage des pieds (fraction de frame), anims = frames par animation (manifest Créa).
// Vérifié contre assets/media-persos/persos.json et le manifest Créa par tests/assets.test.js.
const FEET = [0.5, 184 / 192];
const HERO_ANIMS = { idle_down: [0, 1], idle_up: [4, 5], walk_down: [8, 9, 10, 11], walk_up: [12, 13, 14, 15], attack: [16, 17], cast: [20, 21], hit: [24] };
const ENEMY_ANIMS = { idle: [0, 1], attack: [2, 3] };
const hero = { size: 128, cols: 4, rows: 7, origin: FEET, anims: HERO_ANIMS };
const enemy = { size: 128, cols: 4, rows: 1, origin: FEET, anims: ENEMY_ANIMS };
const SHEETS_CREA = {
  tishra: hero, neru: hero, balum: hero,
  'dumuzi-abzu': { size: 128, cols: 2, rows: 1, origin: FEET, anims: { idle: [0, 1] } },
  'pillard-des-digues': enemy, 'esprit-des-roseaux': enemy, 'scorpion-des-briques': enemy, 'gardien-de-seuil': enemy,
  'lahama-fausse': { size: 224, cols: 2, rows: 3, origin: [0.5, 188 / 192], anims: { idle: [0, 1], attack: [2, 3], rage: [4, 5] } },
};
export const SHEETS = SHEETS_CREA; // frames du manifest telles quelles (découpe corrigée par Créa)
// Animations : boucles (repos, marche, rage) ou jouées une fois (attack, cast, hit), en images/seconde.
const ANIM_RATE = { idle: 2, idle_down: 2, idle_up: 2, walk_down: 8, walk_up: 8, attack: 5, cast: 4, hit: 3, rage: 5 };
const LOOP = new Set(['idle', 'idle_down', 'idle_up', 'walk_down', 'walk_up', 'rage']);
export const animKey = (key, name) => `${key}-${name}`;
// Cadres d'interface peints (Créa) ; les pictos et coins du pack v1 restent en pixel art.
export const CADRE = { minimap: 'cadre-minimap', objectif: 'cadre-objectif' };
const PIXEL_ART = /^(icon-|ui-|tileset-)/;
export const PORTRAIT = { tishra: 'portrait-tishra', neru: 'portrait-neru', balum: 'portrait-balum' };
export const ICON = { attack: 'icon-attaque', skill: 'icon-competence', item: 'icon-objet', defend: 'icon-defense' };
export const MINIMAP = { player: 'ui-minimap-joueur', enemy: 'ui-minimap-ennemi', exit: 'ui-minimap-sortie', other: 'ui-minimap-coffre' };
export const FRAME_CORNER = 'ui-cadre-coin';
export const TITLE_BG = 'fond-titre';
// Clés audio : SFX (Voix) ; musiques facultatives, jouées seulement si le fichier a été embarqué.
export const SFX = { step: 'sfx-step', hit: 'sfx-hit', spell: 'sfx-spell', victory: 'sfx-victory', door: 'sfx-door', select: 'sfx-select' };
export const MUSIC = { eridu: 'music-eridu', temple: 'music-temple' };

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// Images du pack : chargées depuis leurs data URI, pixel art en nearest-neighbor.
export async function loadMedia(scene, media) {
  if (!media) return;
  const images = await Promise.all(Object.entries(media.images).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve([key, img]);
    img.onerror = () => resolve([key, null]); // image illisible : le placeholder prendra le relais
    img.src = src;
  })));
  for (const [key, img] of images) {
    if (!img) continue;
    painted.add(key);
    if (SHEETS[key]) scene.textures.addSpriteSheet(key, img, { frameWidth: SHEETS[key].size, frameHeight: SHEETS[key].size });
    else scene.textures.addImage(key, img);
    if (key === TILESET) for (const [name, [x, y, w, h]] of Object.entries(media.tiles)) scene.textures.get(key).add(name, 0, x, y, w, h);
    // Pixel art du pack v1 en nearest-neighbor ; peintures et personnages peints lissés.
    scene.textures.get(key).setFilter(PIXEL_ART.test(key) ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR);
  }
  const audio = Object.entries(media.audio);
  if (!audio.length || !scene.sound.decodeAudio) return;
  await new Promise((resolve) => {
    scene.sound.once('decodedall', resolve);
    setTimeout(resolve, 4000); // un son non décodable ne bloque pas le démarrage
    scene.sound.decodeAudio(audio.map(([key, data]) => ({ key, data })));
  });
}

export function makeAnims(scene) {
  for (const [key, sheet] of Object.entries(SHEETS)) {
    for (const [name, frames] of Object.entries(sheet.anims)) {
      scene.anims.create({ key: animKey(key, name), frames: scene.anims.generateFrameNumbers(key, { frames }), frameRate: ANIM_RATE[name], repeat: LOOP.has(name) ? -1 : 0 });
    }
  }
}

// Sprite d'un personnage peint, ancré par les pieds, à l'échelle écran (× k en combat).
export function addCharacter(scene, x, y, key, k = 1) {
  const sheet = SHEETS[key];
  const s = scene.add.sprite(x, y, key, 0).setOrigin(...sheet.origin).setScale(k);
  const idle = sheet.anims.idle ? 'idle' : 'idle_down';
  s.play(animKey(key, idle));
  return s;
}

function canvasTexture(scene, key, w, h) {
  const tex = scene.textures.createCanvas(key, w, h);
  return { tex, ctx: tex.getContext() };
}

function diamond(ctx, x, y, fill, line) {
  const { w, h, cell } = TILE;
  const top = y + cell - h;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, top); ctx.lineTo(x + w, top + h / 2); ctx.lineTo(x + w / 2, top + h); ctx.lineTo(x, top + h / 2);
  ctx.closePath();
  ctx.fillStyle = hex(fill); ctx.fill();
  ctx.strokeStyle = hex(line); ctx.lineWidth = 2; ctx.stroke();
}

const TILE_DRAW = {
  'sol-brique': (c, x, y) => diamond(c, x, y, 0xc89b5a, 0x8a6534),
  'canal-turquoise': (c, x, y) => {
    diamond(c, x, y, 0x23a6a0, 0x7fe0d6);
    c.strokeStyle = '#9ff2ea'; c.beginPath(); c.moveTo(x + 44, y + 56); c.lineTo(x + 70, y + 56); c.moveTo(x + 60, y + 66); c.lineTo(x + 86, y + 66); c.stroke();
  },
  'porte-temple': (c, x, y) => diamond(c, x, y, 0xe7c45a, 0xfff2b0),
  'mur-temple': (c, x, y) => {
    const { w, h, cell } = TILE, wall = 26;
    c.fillStyle = '#7a5530'; c.fillRect(x, y + cell - h / 2 - wall, w / 2, wall);
    c.fillStyle = '#5e3f22'; c.fillRect(x + w / 2, y + cell - h / 2 - wall, w / 2, wall);
    c.beginPath(); c.moveTo(x, y + cell - h / 2); c.lineTo(x + w / 2, y + cell); c.lineTo(x + w, y + cell - h / 2); c.closePath();
    c.fillStyle = '#6a4828'; c.fill();
    diamond(c, x, y - wall, 0xa77a45, 0x5e3f22);
  },
  roseaux: (c, x, y) => {
    diamond(c, x, y, 0x3c8f88, 0x7fe0d6);
    c.strokeStyle = '#6fa83a'; c.lineWidth = 5;
    for (const dx of [44, 56, 68, 80]) { c.beginPath(); c.moveTo(x + dx, y + 66); c.lineTo(x + dx + 4, y + 12 + (dx % 9)); c.stroke(); }
  },
};

function makeTileset(scene) {
  if (scene.textures.exists(TILESET)) return;
  const { tex, ctx } = canvasTexture(scene, TILESET, 4 * TILE.w, 3 * TILE.cell);
  TILE_GRID.forEach((name, i) => {
    const x = (i % 4) * TILE.w, y = Math.floor(i / 4) * TILE.cell;
    (TILE_DRAW[name] ?? TILE_DRAW['sol-brique'])(ctx, x, y);
    tex.add(name, 0, x, y, TILE.w, TILE.cell);
  });
  tex.refresh();
}

// Feuille de sprites (mêmes dimensions que le pack) : la même silhouette dans chaque frame.
function makeSheet(scene, key, draw, { cols, rows, size } = SHEETS[key] ?? { cols: 1, rows: 1, size: 72 }) {
  if (scene.textures.exists(key)) return;
  const { tex, ctx } = canvasTexture(scene, key, cols * size, rows * size);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.save(); ctx.translate(c * size, r * size); draw(ctx, size); ctx.restore();
      tex.add(r * cols + c, 0, c * size, r * size, size, size);
    }
  }
  tex.refresh();
}

const figure = (body, head, accent) => (c, s) => {
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(s / 2, s - 4, s * 0.32, 4, 0, 0, 7); c.fill();
  c.fillStyle = hex(body); c.fillRect(s * 0.25, s * 0.38, s * 0.5, s * 0.56);
  c.fillStyle = hex(accent); c.fillRect(s * 0.25, s * 0.62, s * 0.5, 4);
  c.fillStyle = hex(head); c.beginPath(); c.arc(s / 2, s * 0.25, s * 0.17, 0, 7); c.fill();
};

const stone = (color) => (c, s) => {
  c.fillStyle = '#4a3a2a'; c.fillRect(s * 0.3, s * 0.2, s * 0.4, s * 0.75);
  c.strokeStyle = '#2a1a0a'; c.lineWidth = 2; c.strokeRect(s * 0.3, s * 0.2, s * 0.4, s * 0.75);
  c.fillStyle = hex(color); c.beginPath(); c.arc(s / 2, s * 0.45, s * 0.12, 0, 7); c.fill();
};

const dot = (color, shape) => (c, s) => {
  c.fillStyle = hex(color); c.beginPath();
  if (shape === 'tri') { c.moveTo(s / 2, 1); c.lineTo(s - 1, s - 1); c.lineTo(1, s - 1); } else c.arc(s / 2, s / 2, s / 2 - 1, 0, 7);
  c.fill();
};

export function makePlaceholders(scene) {
  for (const [zoneId, L] of Object.entries(LAYOUTS)) { // fonds unis 1920×1080 en attendant les peintures
    if (scene.textures.exists(L.bg)) continue;
    const { tex, ctx } = canvasTexture(scene, L.bg, 1920, 1080);
    ctx.fillStyle = ZONE_COLORS[zoneId]; ctx.fillRect(0, 0, 1920, 1080);
    tex.refresh();
  }
  makeTileset(scene);
  const heroes = { tishra: [0x2a4fa0, 0xe0b080, 0xd9b45a], neru: [0xe8e0c8, 0xd2a070, 0x2a4fa0], balum: [0x6b4a2a, 0xb88050, 0x6fa83a] };
  for (const [k, c] of Object.entries(heroes)) makeSheet(scene, TEX[k], figure(...c));
  const enemies = { pillard: [0x8c2f2f, 0x5a1f1f, 0xd9b45a], esprit: [0x4fa36f, 0xa8f0c0, 0xe0fff0], scorpion: [0xc86a2a, 0x8a4a1a, 0x2a1a0a], gardien: [0x6e6e78, 0x9a9aa8, 0xd9b45a] };
  for (const [k, c] of Object.entries(enemies)) makeSheet(scene, TEX[k], figure(...c));
  makeSheet(scene, TEX.lahama, (c, s) => {
    c.scale(s / 96, s / 96);
    c.fillStyle = '#1f5f7a'; c.beginPath(); c.moveTo(10, 88); c.lineTo(86, 88); c.lineTo(48, 12); c.closePath(); c.fill();
    c.strokeStyle = '#d9b45a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#2fb8b0'; c.beginPath(); c.arc(48, 34, 16, 0, 7); c.fill();
    c.fillStyle = '#d9b45a'; c.fillRect(39, 30, 6, 6); c.fillRect(51, 30, 6, 6);
  });
  makeSheet(scene, TEX.dumuzi, figure(0xf5f1e6, 0xc89070, 0xd9b45a));
  makeSheet(scene, TEX['stone-eau'], stone(0x2f7fd0));
  makeSheet(scene, TEX['stone-etoile'], stone(0xe7c45a));
  makeSheet(scene, TEX['stone-roseau'], stone(0x6fa83a));
  for (const [k, c] of Object.entries(heroes)) makeSheet(scene, PORTRAIT[k], figure(...c), { cols: 1, rows: 1, size: 128 });
  // Cadres dorés de secours (même taille et même géométrie que les cadres Créa).
  if (!scene.textures.exists(CADRE.minimap)) {
    const [w, h] = CADRE_UI.minimap.size, [ix, iy, iw, ih] = CADRE_UI.minimap.interior, { tex, ctx } = canvasTexture(scene, CADRE.minimap, w, h);
    ctx.fillStyle = '#d9b45a'; ctx.fillRect(0, 0, w, h); ctx.clearRect(ix, iy, iw, ih); tex.refresh();
  }
  if (!scene.textures.exists(CADRE.objectif)) {
    const [w, h] = CADRE_UI.objectif.size, { tex, ctx } = canvasTexture(scene, CADRE.objectif, w, h);
    ctx.fillStyle = '#d9b45a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2a1c0e'; ctx.fillRect(46, 46, w - 92, h - 92);
    ctx.fillStyle = '#12100e'; ctx.fillRect(94, 90, w - 188, h - 180); tex.refresh();
  }
  const icons = { attack: 0xc0392b, skill: 0x2a4fa0, item: 0x2ecc71, defend: 0x9a9aa8 };
  for (const [k, color] of Object.entries(icons)) makeSheet(scene, ICON[k], dot(color), { cols: 1, rows: 1, size: 32 });
  const pins = { player: [0x2fe0e0], enemy: [0xe04040, 'tri'], exit: [0xe7c45a], other: [0xd9b45a] };
  for (const [k, [color, shape]] of Object.entries(pins)) makeSheet(scene, MINIMAP[k], dot(color, shape), { cols: 1, rows: 1, size: 16 });
  makeSheet(scene, FRAME_CORNER, (c) => { c.fillStyle = '#d9b45a'; c.fillRect(0, 0, 64, 6); c.fillRect(0, 0, 6, 64); }, { cols: 1, rows: 1, size: 64 });
  if (!scene.textures.exists(TITLE_BG)) {
    const { tex, ctx } = canvasTexture(scene, TITLE_BG, 1280, 720);
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, '#13203f'); grad.addColorStop(1, '#3a2a1a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#2a4fa0'; ctx.beginPath(); ctx.moveTo(440, 620); ctx.lineTo(840, 620); ctx.lineTo(640, 260); ctx.closePath(); ctx.fill();
    tex.refresh();
  }
  makeSheet(scene, TEX.sign, (c, s) => {
    c.fillStyle = '#9a7a50'; c.fillRect(s * 0.22, s * 0.3, s * 0.56, s * 0.62);
    c.strokeStyle = '#3a2a1a'; for (let y = 0.42; y < 0.9; y += 0.12) { c.beginPath(); c.moveTo(s * 0.3, s * y); c.lineTo(s * 0.7, s * y); c.stroke(); }
  });
}
