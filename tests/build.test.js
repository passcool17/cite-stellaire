import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { build, OUT } from '../scripts/build.mjs';

test('build : HTML autonome unique, reproductible, sans dépendance réseau', async () => {
  const a = await build();
  const b = await build();
  assert.equal(a.sha256, b.sha256, 'deux builds identiques');
  assert.equal(a.path, OUT);
  assert.match(OUT, /dist\/Cite-Stellaire-ch1-v3-final\.html$/);
  assert.ok(a.bytes <= 4.5e6, `HTML ≤ 4,5 Mo : ${a.bytes}`);
  const html = readFileSync(OUT, 'utf8');
  assert.match(html, /Tourne ton téléphone/);
  assert.match(html, /orientation: ?portrait/);
  assert.doesNotMatch(html, /<script[^>]+src=/i, 'aucun script externe');
  assert.doesNotMatch(html, /<link[^>]+href=/i, 'aucune feuille externe');
  assert.match(html, /VERSION:"3\.90\.0"/);
  assert.match(html, /fiction/i);
  assert.equal((html.match(/<\/script>/g) || []).length, 3, 'Phaser + médias + jeu inline');
  assert.match(html, /window\.CS_MEDIA = \{"images":\{"fond-titre":"data:image\/jpeg;base64,/);
  assert.match(html, /"tishra":"data:image\/webp;base64,/);
});

// Les anciennes versions ne sont versionnées que dans le dépôt de travail (pas dans le dépôt public) : test sauté sans elles.
const OLD = new URL('../dist/Cite-Stellaire-ch1-v3-persos.html', import.meta.url);
test('les versions livrées (prototype, v2, v3-moteur, v3, v3-persos) restent intactes', { skip: !existsSync(OLD) && 'anciennes versions absentes (dépôt public)' }, () => {
  const sha = (f) => createHash('sha256').update(readFileSync(new URL(`../dist/${f}`, import.meta.url))).digest('hex');
  assert.equal(sha('Cite-Stellaire-ch1-prototype.html'), 'b717573c86ffc2c98eb9a613be48f1e75d3a159ba2b125593af5aab00622b055');
  assert.equal(sha('Cite-Stellaire-ch1-v2.html'), '93588a732ba4b4740d61f4976d9dd7e63f86bd6da8cc282c5f70f940f1f6acfc');
  assert.equal(sha('Cite-Stellaire-ch1-v3-moteur.html'), '64d51739062ae4f8e4768dfd0a724aa81c9ae714addb4625926e5862df667a89');
  assert.equal(sha('Cite-Stellaire-ch1-v3.html'), '0fa8519bddab72097476eb201518403e1f5ef81840158bbe1622d540f7878725');
  assert.equal(sha('Cite-Stellaire-ch1-v3-persos.html'), 'b7c6abaa074ca4696b50cca32f3724d0958fac9859e1f45fea2711de7f373c46');
});
