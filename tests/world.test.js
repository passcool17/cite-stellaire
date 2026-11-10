import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, ZONE_ORDER, createGame, move, interact, facingObject, objectsIn, objective, resolveBattle, completeChapter } from '../src/core/world.js';
import { QUEST } from '../src/core/quest.js';
import { pathTo, walkToObject, walkToExit, freeNeighbors, faceObject } from './helpers.js';

test('4 zones dans l’ordre quais → marché → cour → sanctuaire', () => {
  assert.deepEqual(ZONE_ORDER, ['quais', 'marche', 'cour', 'sanctuaire']);
  for (const id of ZONE_ORDER) {
    const z = ZONES[id];
    assert.ok(z.name);
    const w = z.map[0].length;
    assert.ok(z.map.every((row) => row.length === w), `${id} : lignes de même largeur`);
    assert.equal(z.map[z.spawn.y][z.spawn.x], '.');
  }
});

test('toutes les cases d’objets sont praticables et accessibles depuis le départ', () => {
  for (const id of ZONE_ORDER) {
    const g = createGame();
    g.zoneId = id; g.pos = { ...ZONES[id].spawn };
    for (const o of ZONES[id].objects) {
      assert.equal(ZONES[id].map[o.y][o.x], '.', `${id}/${o.id} sur sol`);
      assert.ok(pathTo(g, o, { adjacent: true }), `${id}/${o.id} accessible`);
    }
    if (ZONES[id].exit) assert.ok(pathTo(g, ZONES[id].exit, { adjacent: false }), `${id} sortie accessible`);
  }
});

test('nouvelle partie : quais, 3 héros, mode Attente par défaut', () => {
  const g = createGame();
  assert.equal(g.zoneId, 'quais');
  assert.equal(g.checkpointId, 'quais');
  assert.equal(g.party.length, 3);
  assert.equal(g.settings.atbMode, 'wait');
  assert.equal(createGame({ atbMode: 'active' }).settings.atbMode, 'active');
});

test('déplacement bloqué par eau, murs, objets ; autorisé sur sol', () => {
  const g = createGame();
  const res = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => {
    const before = { ...g.pos };
    const r = move(g, dx, dy);
    const ch = ZONES.quais.map[before.y + dy][before.x + dx];
    if (r.moved) move(g, -dx, -dy);
    return { ch, moved: r.moved };
  });
  for (const r of res) assert.equal(r.moved, r.ch === '.', JSON.stringify(r));
});

test('interagir sans rien à côté → null', () => {
  const g = createGame();
  assert.equal(interact(g), null);
});

test('sortie des quais verrouillée tant que les pillards bloquent', () => {
  const g = createGame();
  const r = walkToExit(g);
  assert.equal(r.event.type, 'blocked');
  assert.equal(g.zoneId, 'quais');
});

test('rencontre visible → événement combat ; victoire la retire de la carte et donne l’XP', () => {
  const g = createGame();
  walkToObject(g, 'quais1');
  const ev = interact(g);
  assert.equal(ev.type, 'battle');
  assert.deepEqual(ev.enemies, ['pillard', 'pillard']);
  const r = resolveBattle(g, { encounterId: 'quais1', outcome: 'victory', xpReward: 20 });
  assert.equal(r.type, 'victory');
  assert.ok(!objectsIn(g).some((o) => o.id === 'quais1'));
  assert.equal(g.party[0].xp, 20);
});

test('après victoire, les héros KO reviennent à 1 PV', () => {
  const g = createGame();
  g.party[1].hp = 0;
  resolveBattle(g, { encounterId: 'quais1', outcome: 'victory', xpReward: 5 });
  assert.equal(g.party[1].hp, 1);
});

test('défaite → événement defeat (rechargement du checkpoint par la scène)', () => {
  const g = createGame();
  assert.equal(resolveBattle(g, { encounterId: 'quais1', outcome: 'defeat', xpReward: 20 }).type, 'defeat');
  assert.ok(objectsIn(g).some((o) => o.id === 'quais1'));
});

test('marché : Dumuzi-abzu donne la quête et l’indice ; recharge les potions', () => {
  const g = createGame();
  g.cleared.quais1 = g.cleared.quais2 = true;
  assert.equal(walkToExit(g).event.type, 'zone');
  assert.equal(g.zoneId, 'marche');
  assert.equal(g.checkpointId, 'marche');
  g.inventory.potions = 0;
  const r0 = walkToExit(g);
  assert.equal(r0.event.type, 'blocked');
  g.pos = { ...ZONES.marche.spawn };
  walkToObject(g, 'dumuzi');
  const ev = interact(g);
  assert.equal(ev.type, 'dialog');
  assert.equal(g.quest.state, QUEST.ACCEPTED);
  assert.equal(g.inventory.potions, 3);
  assert.ok(ev.lines.join(' ').includes('eau'));
});

test('entrer dans une zone soigne l’équipe (point de reprise)', () => {
  const g = createGame();
  g.cleared.quais1 = g.cleared.quais2 = true;
  g.party[0].hp = 3;
  walkToExit(g);
  assert.equal(g.party[0].hp, g.party[0].hpMax);
});

test('cour : énigme par les pierres ; mauvais ordre réinitialise ; sortie exige énigme + gardien', () => {
  const g = createGame();
  g.zoneId = 'cour'; g.pos = { ...ZONES.cour.spawn };
  walkToObject(g, 'pierre-roseau');
  assert.equal(interact(g).result, 'reset');
  for (const s of ['eau', 'etoile']) {
    walkToObject(g, `pierre-${s}`);
    assert.equal(interact(g).result, 'progress');
  }
  walkToObject(g, 'pierre-roseau');
  assert.equal(interact(g).result, 'solved');
  assert.equal(walkToExit(g).event.type, 'blocked');
  g.pos = { ...ZONES.cour.spawn };
  g.cleared.cour1 = true;
  assert.equal(walkToExit(g).event.type, 'zone');
  assert.equal(g.zoneId, 'sanctuaire');
});

test('objectif HUD suit la progression', () => {
  const g = createGame();
  assert.match(objective(g), /pillards/i);
  g.cleared.quais1 = g.cleared.quais2 = true;
  assert.match(objective(g), /marché/i);
});

test('boss vaincu → tablette récupérée → fin ; completeChapter rend la tablette et révèle l’artefact', () => {
  const g = createGame();
  g.zoneId = 'sanctuaire'; g.pos = { ...ZONES.sanctuaire.spawn };
  g.quest.state = QUEST.ACCEPTED;
  walkToObject(g, 'lahama');
  const ev = interact(g);
  assert.equal(ev.type, 'battle');
  assert.equal(ev.boss, true);
  assert.equal(resolveBattle(g, { encounterId: 'lahama', outcome: 'victory', xpReward: 0 }).type, 'ending');
  assert.equal(g.quest.state, QUEST.TABLET_HELD);
  assert.equal(g.inventory.questKey, 'tablette');
  const lines = completeChapter(g);
  assert.equal(g.quest.state, QUEST.COMPLETED);
  assert.equal(g.inventory.questKey, null);
  assert.equal(g.artefact, true);
  assert.ok(lines.length > 0);
});

test('interaction avec l’objet face au héros, depuis chaque case libre autour de chaque pierre', () => {
  const g = createGame();
  g.zoneId = 'cour';
  for (const id of ['pierre-eau', 'pierre-etoile', 'pierre-roseau']) {
    const sides = freeNeighbors(g, id);
    assert.ok(sides.length > 0, `${id} accessible`);
    sides.forEach((_, i) => {
      faceObject(g, id, i);
      g.puzzle.input = []; g.puzzle.solved = false;
      assert.equal(facingObject(g).id, id);
      assert.equal(interact(g).symbol, id.slice('pierre-'.length));
    });
  }
});

test('message de pierre nomme la pierre pressée ; re-presser une pierre allumée est sans effet', () => {
  const g = createGame();
  g.zoneId = 'cour';
  faceObject(g, 'pierre-etoile');
  const r = interact(g);
  assert.equal(r.result, 'reset');
  assert.match(r.message, /étoile/);
  faceObject(g, 'pierre-eau');
  assert.equal(interact(g).result, 'progress');
  const again = interact(g);
  assert.equal(again.result, 'already');
  assert.deepEqual(g.puzzle.input, ['eau']);
});

test('facingObject : objet en face du héros (pour l’indice à l’écran), sinon null', () => {
  const g = createGame();
  g.zoneId = 'cour';
  const c = faceObject(g, 'pierre-eau');
  assert.equal(facingObject(g).id, 'pierre-eau');
  g.facing = { dx: -c.dx, dy: -c.dy }; // dos à la pierre
  const behind = ZONES.cour.map[c.y - c.dy]?.[c.x - c.dx];
  if (!objectsIn(g).some((o) => o.x === c.x - c.dx && o.y === c.y - c.dy)) assert.equal(facingObject(g), null, `derrière : ${behind}`);
});
