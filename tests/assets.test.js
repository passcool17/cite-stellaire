// Les placeholders utilisent les clés, tailles et découpes du pack Créa (remplacement trivial plus tard).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { TEX, TILE, TILESET, TILE_FRAME, SHEETS } from '../src/phaser/assets.js';

const MANIFEST = '/workspace/crea/rpg-cite-stellaire/pack-ch1/manifest.json';
const skip = !existsSync(MANIFEST) && 'manifest Créa absent';

test('tileset placeholder = géométrie du manifest Créa', { skip }, () => {
  const t = JSON.parse(readFileSync(MANIFEST, 'utf8')).assets[`${TILESET}.png`];
  assert.deepEqual([TILE.w, TILE.h], t.tile_base_diamond);
  assert.equal(TILE.cell, t.cell_height);
  for (const frame of Object.values(TILE_FRAME)) assert.ok(t.tiles[frame], `frame ${frame}`);
});

// Personnages peints (pack-ch1-peint) : la géométrie codée dans assets.js = celle préparée (persos.json) = manifest Créa.
const PERSOS = JSON.parse(readFileSync(new URL('../assets/media-persos/persos.json', import.meta.url), 'utf8'));
const CREA = JSON.parse(readFileSync(new URL('../assets/media-persos/manifest-crea-persos.json', import.meta.url), 'utf8')).sprites;

test('feuilles peintes : clés = fichiers Créa, frames, ancrage des pieds et animations du manifest', () => {
  const keys = ['tishra', 'neru', 'balum', 'dumuzi', 'pillard', 'esprit', 'scorpion', 'gardien', 'lahama'].map((k) => TEX[k]);
  assert.deepEqual(keys.slice().sort(), Object.keys(CREA).sort());
  for (const key of keys) {
    const s = SHEETS[key], p = PERSOS[key], c = CREA[key];
    assert.deepEqual({ size: s.size, cols: s.cols, rows: s.rows, origin: s.origin, anims: s.anims },
      { size: p.frame, cols: p.cols, rows: p.rows, origin: p.origin, anims: p.anims }, key);
    assert.deepEqual(s.origin, [c.anchor_feet[0] / c.frame_size[0], c.anchor_feet[1] / c.frame_size[1]], `${key} ancré par les pieds`);
    assert.deepEqual(Object.keys(s.anims).sort(), Object.keys(c.animations).sort(), `${key} animations`);
  }
});

test('échelle écran : frame affichée = frame Créa × display_scale × 1280/1920 (héros 128 px, boss 224 px)', () => {
  for (const [key, c] of Object.entries(CREA)) assert.equal(SHEETS[key].size, Math.round(c.frame_size[0] * c.display_scale * 1280 / 1920), key);
  assert.equal(SHEETS[TEX.tishra].size, 128);
  assert.equal(SHEETS[TEX.lahama].size, 224);
});

test('héros : idle/walk haut et bas + attack, cast, hit ; ennemis idle + attack ; boss idle, attack, rage', () => {
  for (const k of ['tishra', 'neru', 'balum']) assert.deepEqual(Object.keys(SHEETS[TEX[k]].anims).sort(), ['attack', 'cast', 'hit', 'idle_down', 'idle_up', 'walk_down', 'walk_up']);
  for (const k of ['pillard', 'esprit', 'scorpion', 'gardien']) assert.deepEqual(Object.keys(SHEETS[TEX[k]].anims).sort(), ['attack', 'idle']);
  assert.deepEqual(Object.keys(SHEETS[TEX.lahama].anims).sort(), ['attack', 'idle', 'rage']);
  assert.deepEqual(Object.keys(SHEETS[TEX.dumuzi].anims), ['idle']);
});

test('découpe corrigée par Créa : aucune frame suspecte, aucune frame de remplacement (frames du manifest telles quelles)', () => {
  for (const [key, p] of Object.entries(PERSOS)) {
    if (key === '_ui') continue;
    assert.deepEqual(p.suspects, [], `${key} : silhouette coupée par le bord de la frame`);
    assert.deepEqual(SHEETS[key].anims, p.anims, key);
  }
  assert.deepEqual(SHEETS[TEX.pillard].anims.attack, [2, 3]);
  assert.deepEqual(SHEETS[TEX.balum].anims.attack, [16, 17]);
});
