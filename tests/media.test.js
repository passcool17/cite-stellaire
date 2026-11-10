import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { collectMedia, MEDIA_DIR, MEDIA_DIRS } from '../scripts/media.mjs';

// Pack v1 restant : fond de titre, pictos, coins et pastilles (sprites v1, portraits v1 et tileset retirés :
// les 4 zones sont peintes, le tileset reste en placeholder et dans assets/archive/).
const IMAGES = [
  'fond-titre', 'icon-attaque', 'icon-competence', 'icon-defense', 'icon-objet', 'ui-cadre-coin',
  'ui-minimap-coffre', 'ui-minimap-ennemi', 'ui-minimap-joueur', 'ui-minimap-sortie',
];
const SFX = ['sfx-door', 'sfx-hit', 'sfx-select', 'sfx-spell', 'sfx-step', 'sfx-victory'];

test('pack Créa + 6 SFX Voix embarqués en data URI, sans musique', () => {
  const m = collectMedia(MEDIA_DIR);
  assert.deepEqual(Object.keys(m.images).sort(), IMAGES);
  assert.deepEqual(Object.keys(m.audio).sort(), SFX);
  assert.match(m.images['icon-attaque'], /^data:image\/png;base64,/);
  assert.match(m.images['fond-titre'], /^data:image\/jpeg;base64,/);
  assert.match(m.audio['sfx-hit'], /^data:audio\/mpeg;base64,/);
});

test('frames du tileset reprises du manifest Créa', () => {
  const { tiles } = collectMedia(MEDIA_DIR);
  assert.deepEqual(tiles['sol-brique'], [0, 9, 128, 83]);
  assert.equal(Object.keys(tiles).length, 12);
});

test('musique : music-eridu / music-temple embarquées seulement si le fichier existe', () => {
  const dir = mkdtempSync(`${tmpdir()}/cs-media-`);
  copyFileSync(`${MEDIA_DIR}/manifest-crea.json`, `${dir}/manifest-crea.json`);
  assert.deepEqual(Object.keys(collectMedia(dir).audio), []);
  writeFileSync(`${dir}/music-eridu.mp3`, 'ID3');
  assert.deepEqual(Object.keys(collectMedia(dir).audio), ['music-eridu']);
});

test('fonds peints : 4 fonds JPEG + 4 calques avant WebP (alpha) dans media-peint', () => {
  const m = collectMedia(MEDIA_DIRS);
  for (const k of ['zone1-quais', 'zone2-marche', 'zone3-cour', 'zone4-sanctuaire']) assert.match(m.images[k], /^data:image\/jpeg;base64,/, k);
  for (let n = 1; n <= 4; n++) assert.match(m.images[`zone${n}-avant`], /^data:image\/webp;base64,/, `zone${n}-avant`);
});

test('personnages peints : feuilles Créa (WebP), portraits et cadres ; anciens sprites v1 retirés', () => {
  const m = collectMedia(MEDIA_DIRS);
  for (const k of ['tishra', 'neru', 'balum', 'dumuzi-abzu', 'pillard-des-digues', 'esprit-des-roseaux', 'scorpion-des-briques', 'gardien-de-seuil', 'lahama-fausse',
    'portrait-tishra', 'portrait-neru', 'portrait-balum', 'cadre-minimap', 'cadre-objectif']) {
    assert.match(m.images[k] ?? '', /^data:image\/webp;base64,/, k);
  }
  for (const k of ['hero-tishra', 'enemy-pillard', 'boss-lahama', 'cadre-objectif-frise', 'cadre-objectif-noeud']) assert.equal(m.images[k], undefined, `${k} retiré`);
});
