import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrail, stepTrail } from '../src/core/followers.js';

test('suiveurs au départ sur la case du meneur', () => {
  assert.deepEqual(createTrail({ x: 1, y: 1 }), [{ x: 1, y: 1 }, { x: 1, y: 1 }]);
});

test('le 1er suiveur prend la case quittée par le meneur, le 2e celle d’avant', () => {
  let t = createTrail({ x: 1, y: 1 });
  t = stepTrail(t, { x: 1, y: 1 }); // meneur passe de (1,1) à (2,1)
  t = stepTrail(t, { x: 2, y: 1 }); // puis de (2,1) à (3,1)
  assert.deepEqual(t, [{ x: 2, y: 1 }, { x: 1, y: 1 }]);
  t = stepTrail(t, { x: 3, y: 1 });
  assert.deepEqual(t, [{ x: 3, y: 1 }, { x: 2, y: 1 }]);
});

test('stepTrail ne modifie pas l’entrée et copie les positions', () => {
  const t = createTrail({ x: 0, y: 0 });
  const prev = { x: 5, y: 5 };
  const t2 = stepTrail(t, prev);
  prev.x = 9;
  assert.deepEqual(t, [{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  assert.deepEqual(t2[0], { x: 5, y: 5 });
});

import { spreadTrail } from '../src/core/followers.js';
import { ZONES, ZONE_ORDER, createGame, enterZone, objectsIn } from '../src/core/world.js';

const freeIn = (g) => (x, y) => ZONES[g.zoneId].map[y]?.[x] === '.' && !objectsIn(g).some((o) => o.x === x && o.y === y);
const adj = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

test('arrivée dans chaque zone : suiveurs écartés en file, sur du sol libre, derrière le meneur si possible', () => {
  const g = createGame();
  for (const id of ZONE_ORDER) {
    enterZone(g, id);
    const t = spreadTrail(freeIn(g), g.pos, g.facing);
    assert.equal(t.length, 2, id);
    const all = [g.pos, ...t].map((c) => `${c.x},${c.y}`);
    assert.equal(new Set(all).size, 3, `${id} : trois cases distinctes ${all}`);
    for (const c of t) assert.ok(freeIn(g)(c.x, c.y), `${id} : ${c.x},${c.y} libre`);
    assert.ok(adj(g.pos, t[0]) && adj(t[0], t[1]), `${id} : file continue`);
  }
});

test('spreadTrail : préfère la case derrière le meneur ; sans place, reste sur sa case', () => {
  const open = () => true;
  assert.deepEqual(spreadTrail(open, { x: 5, y: 5 }, { dx: 0, dy: -1 }), [{ x: 5, y: 6 }, { x: 5, y: 7 }]);
  assert.deepEqual(spreadTrail(() => false, { x: 5, y: 5 }, { dx: 0, dy: -1 }), [{ x: 5, y: 5 }, { x: 5, y: 5 }]);
});
