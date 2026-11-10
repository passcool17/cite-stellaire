// Calage de la grille de marche (invisible) sur les fonds peints 1920×1080.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BG, LAYOUTS, gridToBg, bgToGrid, bgToScreen, SCREEN } from '../src/core/layout.js';
import { ZONES, ZONE_ORDER } from '../src/core/world.js';
import { CALAGE } from '../src/core/calage-data.js';

test('une mise en page par zone, clés = noms de fichiers Créa', () => {
  const expected = { quais: 'zone1-quais', marche: 'zone2-marche', cour: 'zone3-cour', sanctuaire: 'zone4-sanctuaire' };
  const avant = { quais: 'zone1-avant', marche: 'zone2-avant', cour: 'zone3-avant', sanctuaire: 'zone4-avant' };
  for (const id of ZONE_ORDER) {
    assert.equal(LAYOUTS[id].bg, expected[id]);
    assert.equal(LAYOUTS[id].fg, avant[id], 'calque avant = nom du fichier Créa');
  }
});

test('gridToBg / bgToGrid : aller-retour exact sur chaque case', () => {
  for (const id of ZONE_ORDER) {
    const L = LAYOUTS[id];
    ZONES[id].map.forEach((row, y) => [...row].forEach((_, x) => {
      const p = gridToBg(L, x, y);
      assert.deepEqual(bgToGrid(L, p.x, p.y), { x, y });
      assert.deepEqual(bgToGrid(L, p.x + L.tile.w / 5, p.y - L.tile.h / 5), { x, y }, 'point intérieur au losange');
    }));
  }
});

test('cases utiles (sol, objets, sortie) dans l’image, avec la place d’un héros de 96 px au-dessus', () => {
  const headroom = 96 * (BG.w / SCREEN.w);
  for (const id of ZONE_ORDER) {
    const z = ZONES[id], L = LAYOUTS[id];
    z.map.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!'.E'.includes(ch)) return;
      const p = gridToBg(L, x, y);
      assert.ok(p.x > 0 && p.x < BG.w && p.y - headroom > 0 && p.y < BG.h, `${id} (${x},${y}) → ${p.x},${p.y}`);
    }));
  }
});

test('bgToScreen : 1920×1080 → 1280×720 (FIT paysage)', () => {
  assert.deepEqual(SCREEN, { w: 1280, h: 720 });
  assert.deepEqual(bgToScreen({ x: 1920, y: 1080 }), { x: 1280, y: 720 });
  assert.deepEqual(bgToScreen({ x: 960, y: 540 }), { x: 640, y: 360 });
});

// Calage des 4 zones sur leurs peintures, à partir des polygones Créa (assets/calage/*-zones.json) + ajustements.
import { readFileSync } from 'node:fs';
import { generate, ajustements, readJson, inPoly, inRect } from '../scripts/calage.mjs';
const ADJ = ajustements();
const calOf = (id) => readJson(ADJ[id].zones);
const key = (c) => `${c.x},${c.y}`;
const cellsOf = (id, chars = '.') => {
  const out = [];
  ZONES[id].map.forEach((row, y) => [...row].forEach((ch, x) => chars.includes(ch) && out.push({ x, y })));
  return out;
};

test('calage-data.js à jour (régénéré depuis assets/calage/)', () => {
  assert.equal(readFileSync(new URL('../src/core/calage-data.js', import.meta.url), 'utf8'), generate());
});

for (const id of ZONE_ORDER) {
  test(`${id} : chaque case de sol, objet et apparition tombe dans un polygone marchable (hors couloir déclaré)`, () => {
    const cal = calOf(id), L = LAYOUTS[id], z = ZONES[id];
    const corridor = new Set(CALAGE[id].corridor.map(key));
    const cells = cellsOf(id);
    for (const c of [...cells, ...z.objects, z.spawn]) {
      if (corridor.has(key(c))) continue;
      const p = gridToBg(L, c.x, c.y);
      assert.ok(cal.walkable_polygons.some((poly) => inPoly(poly.points, p.x, p.y)), `(${c.x},${c.y}) → ${p.x},${p.y} hors sol peint`);
      assert.ok(!ADJ[id].blocked.some((r) => inRect(r, p.x, p.y)) || z.objects.some((o) => key(o) === key(c)), `(${c.x},${c.y}) dans une zone retirée`);
    }
    assert.ok(CALAGE[id].corridor.length <= 4, 'couloir court');
    assert.ok(cells.length >= 25, `assez de sol : ${cells.length}`);
  });

  test(`${id} : sortie dans le rectangle de sortie Créa, apparition à moins d’une case du point suggéré`, () => {
    const cal = calOf(id), L = LAYOUTS[id], z = ZONES[id];
    if (z.exit) {
      const e = gridToBg(L, z.exit.x, z.exit.y);
      assert.ok(inRect(cal.exit.rect, e.x, e.y), `sortie ${e.x},${e.y}`);
      assert.equal(z.map[z.exit.y][z.exit.x], 'E');
    } else assert.ok(!z.map.join('').includes('E'), 'pas de sortie (salle du boss)');
    const s = gridToBg(L, z.spawn.x, z.spawn.y), [sx, sy] = cal.spawn_suggested;
    assert.ok(Math.hypot(s.x - sx, s.y - sy) <= L.tile.w / 2, `apparition ${s.x},${s.y}`);
  });
}

test('cour : les 3 socles et la stèle sont posés sur les éléments peints (pas de sprite par-dessus)', () => {
  const near = (id, [px, py], tol) => {
    const o = ZONES.cour.objects.find((x) => x.id === id), p = gridToBg(LAYOUTS.cour, o.x, o.y);
    assert.ok(Math.hypot(p.x - px, p.y - py) <= tol, `${id} à ${p.x},${p.y}`);
  };
  near('pierre-eau', [790, 800], 60); // vasque
  near('pierre-etoile', [930, 860], 60); // stèle à l'étoile
  near('pierre-roseau', [1090, 890], 60); // stèle au roseau
  near('inscription', [1040, 620], 70); // relief du mur
  assert.deepEqual(LAYOUTS.cour.painted.sort(), ['inscription', 'pierre-eau', 'pierre-etoile', 'pierre-roseau']);
});

// HUD : médaillons de l'équipe en bas à gauche (clavier). Aucune case de sol ne doit y cacher un héros de 96 px.
import { HERO_BOX, HUD_RECTS, heroRect, overlaps } from '../src/core/layout.js';
test('aucune case marchable ne place un héros sous le bandeau, la mini-carte ou les médaillons', () => {
  for (const id of ZONE_ORDER) for (const c of cellsOf(id, '.E')) {
    const r = heroRect(bgToScreen(gridToBg(LAYOUTS[id], c.x, c.y)));
    for (const [name, h] of Object.entries(HUD_RECTS)) assert.ok(!overlaps(r, h), `${id} (${c.x},${c.y}) sous ${name}`);
  }
  assert.deepEqual(HERO_BOX, { w: 64, h: 112 });
});

// Calque avant : passe devant les héros, mais ne doit pas les masquer sur une case de passage obligatoire.
const masks = Object.fromEntries(ZONE_ORDER.map((id, i) => [id, JSON.parse(readFileSync(new URL(`../assets/calage/zone${i + 1}-avant-masque.json`, import.meta.url), 'utf8'))]));
const coverage = (id, c) => {
  const m = masks[id], k = BG.w / SCREEN.w, r = heroRect(bgToScreen(gridToBg(LAYOUTS[id], c.x, c.y)));
  let n = 0, on = 0;
  for (let y = r.y * k; y < (r.y + r.h) * k; y += m.step) for (let x = r.x * k; x < (r.x + r.w) * k; x += m.step) {
    n++; if (m.rows[Math.floor(y / m.step)]?.[Math.floor(x / m.step)] === '1') on++;
  }
  return on / n;
};
const reach = (z, from, removed) => {
  const ok = (x, y) => '.E'.includes(z.map[y]?.[x] ?? '#') && !z.objects.some((o) => o.x === x && o.y === y) && key({ x, y }) !== removed;
  const seen = new Set([key(from)]), q = [from];
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: x + dx, y: y + dy };
      if (ok(n.x, n.y) && !seen.has(key(n))) { seen.add(key(n)); q.push(n); }
    }
  }
  return seen;
};
// Case obligatoire : l'apparition, la sortie, ou une case dont le retrait coupe l'accès à la sortie ou à un objet.
function mandatoryCells(id) {
  const z = ZONES[id];
  const goalsOk = (seen) => (!z.exit || seen.has(key(z.exit))) &&
    z.objects.every((o) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(key({ x: o.x + dx, y: o.y + dy }))));
  return [z.spawn, ...(z.exit ? [z.exit] : []), ...cellsOf(id).filter((c) => key(c) !== key(z.spawn) && !goalsOk(reach(z, z.spawn, key(c))))];
}

test('calque avant : couvre moins de la moitié d’un héros sur chaque case de passage obligatoire', () => {
  for (const id of ZONE_ORDER) {
    const cells = mandatoryCells(id);
    for (const c of cells) {
      const cov = coverage(id, c);
      assert.ok(cov < 0.5, `${id} (${c.x},${c.y}) couvert à ${Math.round(cov * 100)} %`);
    }
  }
});

test('calque avant : présent sur chaque zone (le test ci-dessus n’est pas vide)', () => {
  for (const id of ZONE_ORDER) assert.ok(masks[id].rows.join('').includes('1'), id);
});

// Cadres dorés Créa (v3-final) : vrai 9-slice pour le bandeau, cadre à intérieur transparent pour la mini-carte.
import { CADRE_UI, nineSlice, miniMapBox } from '../src/core/layout.js';
const UI = JSON.parse(readFileSync(new URL('../assets/media-persos/persos.json', import.meta.url), 'utf8'))._ui;

test('cadres : géométrie codée = celle préparée depuis le pack Créa (9-slice 94/90, intérieur de la mini-carte)', () => {
  assert.deepEqual(CADRE_UI.objectif, UI['cadre-objectif']);
  assert.deepEqual(CADRE_UI.minimap, UI['cadre-minimap']);
  assert.deepEqual(CADRE_UI.objectif.margins, { left: 94, right: 94, top: 90, bottom: 90 });
  assert.equal(CADRE_UI.objectif.scale, 0.5);
});

test('9-slice : 9 pièces qui pavent exactement le bandeau, coins à 0,5 (47×45), bord doré hors du texte', () => {
  const R = HUD_RECTS.objectif, P = nineSlice(R, CADRE_UI.objectif);
  assert.equal(P.length, 9);
  assert.equal(P.reduce((s, p) => s + p.w * p.h, 0), R.w * R.h);
  for (const p of P) assert.ok(p.x >= R.x && p.y >= R.y && p.x + p.w <= R.x + R.w && p.y + p.h <= R.y + R.h, p.piece);
  const tl = P.find((p) => p.piece === 'tl'), br = P.find((p) => p.piece === 'br');
  assert.deepEqual([tl.x, tl.y, tl.w, tl.h], [R.x, R.y, 47, 45]);
  assert.deepEqual([br.x + br.w, br.y + br.h], [R.x + R.w, R.y + R.h]);
  for (const p of P) assert.ok(p.w >= 0 && p.h >= 0);
});

test('mini-carte : carte centrée dans l’intérieur transparent du cadre, cadre aux proportions Créa', () => {
  const R = HUD_RECTS.miniCarte, [fw, fh] = CADRE_UI.minimap.size;
  assert.ok(Math.abs(R.w / R.h - fw / fh) < 0.01, 'pas de déformation');
  for (const map of [Array(8).fill('.'.repeat(12)), Array(12).fill('.'.repeat(8)), Array(10).fill('.'.repeat(10))]) {
    const M = miniMapBox(map), [ix, iy, iw, ih] = CADRE_UI.minimap.interior, k = R.w / fw;
    const I = { x: R.x + ix * k, y: R.y + iy * k, w: iw * k, h: ih * k };
    assert.ok(M.cell >= 6);
    assert.ok(M.x >= I.x && M.y >= I.y && M.x + map[0].length * M.cell <= I.x + I.w + 0.01 && M.y + map.length * M.cell <= I.y + I.h + 0.01);
  }
});
