import { CALAGE } from './calage-data.js';

// Calage de la grille de marche (invisible) de chaque zone sur son fond peint.
// Coordonnées « fond » = pixels de l'image 1920×1080, quelle que soit la taille réelle du fichier.
// origin = centre de la case (0,0) ; tile = taille d'un losange de la grille. À recaler avec la touche G en jeu.
export const BG = { w: 1920, h: 1080 };
export const SCREEN = { w: 1280, h: 720 };

// bg = clé du fond peint (zoneN-<nom>), fg = calque avant Créa (zoneN-avant, dessiné au-dessus des héros).
// origin/tile viennent du calage généré (assets/calage/ajustements.json → scripts/calage.mjs).
const grid = (n, name, zoneId) => ({ bg: `zone${n}-${name}`, fg: `zone${n}-avant`, origin: { ...CALAGE[zoneId].origin }, tile: { ...CALAGE[zoneId].tile }, painted: CALAGE[zoneId].painted });
export const LAYOUTS = {
  quais: grid(1, 'quais', 'quais'),
  marche: grid(2, 'marche', 'marche'),
  cour: grid(3, 'cour', 'cour'),
  sanctuaire: grid(4, 'sanctuaire', 'sanctuaire'),
};

export function gridToBg({ origin, tile }, x, y) {
  return { x: origin.x + (x - y) * (tile.w / 2), y: origin.y + (x + y) * (tile.h / 2) };
}

export function bgToGrid({ origin, tile }, px, py) {
  const u = (px - origin.x) / (tile.w / 2), v = (py - origin.y) / (tile.h / 2);
  return { x: Math.round((u + v) / 2) + 0, y: Math.round((v - u) / 2) + 0 }; // + 0 : pas de -0
}

const K = SCREEN.w / BG.w;
export const bgToScreen = (p) => ({ x: p.x * K, y: p.y * K });

// Encombrement d'un héros à l'écran (pieds au centre de la case).
export const HERO_BOX = { w: 64, h: 112 }; // silhouette peinte ≈ 108 px de haut dans une frame de 128
export const heroRect = (p) => ({ x: p.x - HERO_BOX.w / 2, y: p.y - HERO_BOX.h, w: HERO_BOX.w, h: HERO_BOX.h });
export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
// Rectangles écran (1280×720) du HUD d'exploration au clavier ; ExploreScene s'en sert pour se placer.
export const HUD_RECTS = {
  objectif: { x: 16, y: 10, w: 508, h: 104 },
  miniCarte: { x: 1096, y: 4, w: 180, h: 164 }, // proportions du cadre Créa (390×355)
  medaillons: { x: 16, y: 448, w: 228, h: 244 },
};

// Cadres dorés Créa (v3-final), géométrie préparée par scripts/prepare-persos.py (persos.json « _ui », vérifiée par les tests).
export const CADRE_UI = {
  objectif: { size: [427, 540], margins: { left: 94, right: 94, top: 90, bottom: 90 }, scale: 0.5 },
  minimap: { size: [390, 355], interior: [44, 52, 304, 258] },
};

// Vrai 9-slice : coins fixes (marges × échelle), bords et centre étirés. Rectangles écran + découpe source de chaque pièce.
export function nineSlice(R, { size: [W, H], margins: m, scale: k }) {
  const L = m.left * k, Rt = m.right * k, T = m.top * k, B = m.bottom * k;
  const xs = [R.x, R.x + L, R.x + R.w - Rt, R.x + R.w], ys = [R.y, R.y + T, R.y + R.h - B, R.y + R.h];
  const sx = [0, m.left, W - m.right, W], sy = [0, m.top, H - m.bottom, H];
  const names = [['tl', 't', 'tr'], ['l', 'c', 'r'], ['bl', 'b', 'br']];
  return names.flatMap((row, j) => row.map((piece, i) => ({
    piece, x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], h: ys[j + 1] - ys[j],
    src: { x: sx[i], y: sy[j], w: sx[i + 1] - sx[i], h: sy[j + 1] - sy[j] },
  })));
}

// Mini-carte : cases carrées centrées dans l'intérieur transparent du cadre (marge de 3 px).
export function miniMapBox(map) {
  const R = HUD_RECTS.miniCarte, [ix, iy, iw, ih] = CADRE_UI.minimap.interior, k = R.w / CADRE_UI.minimap.size[0];
  const I = { x: R.x + ix * k + 3, y: R.y + iy * k + 3, w: iw * k - 6, h: ih * k - 6 };
  const rows = map.length, cols = map[0].length, cell = Math.floor(Math.min(I.w / cols, I.h / rows));
  return { cell, x: Math.round(I.x + (I.w - cols * cell) / 2), y: Math.round(I.y + (I.h - rows * cell) / 2), inner: I };
}
