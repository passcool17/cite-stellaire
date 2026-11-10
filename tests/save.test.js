import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize, deserialize, saveTo, loadFrom, SAVE_KEY } from '../src/core/save.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

const sample = () => ({
  zoneId: 'cour', pos: { x: 2, y: 3 },
  party: [{ id: 'tishra', hp: 40, level: 2, skills: ['taunt'] }],
  inventory: { potions: 2, questKey: null },
  quest: { state: 'ACCEPTED' },
  puzzle: { solution: ['eau', 'etoile', 'roseau'], input: ['eau'], solved: false },
  settings: { atbMode: 'active' },
  checkpointId: 'cour', cleared: { quais1: true },
});

test('round-trip serialize/deserialize', () => {
  const s = sample();
  assert.deepEqual(deserialize(serialize(s)), s);
});

test('saveTo / loadFrom via storage (façade localStorage)', () => {
  const st = memStorage();
  saveTo(st, SAVE_KEY, sample());
  assert.deepEqual(loadFrom(st, SAVE_KEY), sample());
});

test('copie indépendante : modifier l’état après save ne change pas la sauvegarde', () => {
  const st = memStorage();
  const s = sample();
  saveTo(st, SAVE_KEY, s);
  s.party[0].hp = 1;
  assert.equal(loadFrom(st, SAVE_KEY).party[0].hp, 40);
});

test('clé absente → null', () => {
  assert.equal(loadFrom(memStorage(), SAVE_KEY), null);
});

test('JSON corrompu ou version inconnue → null', () => {
  assert.equal(deserialize('{pas du json'), null);
  assert.equal(deserialize(JSON.stringify({ v: 999, state: {} })), null);
});

test('storage indisponible (exception) → null, pas de crash', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(loadFrom(broken, SAVE_KEY), null);
  assert.equal(saveTo(broken, SAVE_KEY, sample()), false);
});
