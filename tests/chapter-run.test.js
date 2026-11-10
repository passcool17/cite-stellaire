// Parcours complet du chapitre 1 (logique pure) : quais → marché → cour → sanctuaire → victoire sur Lahama → fin,
// avec sauvegarde à chaque zone et reprise depuis le storage (simule un rechargement de page).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, createGame, interact, resolveBattle, completeChapter, objectsIn } from '../src/core/world.js';
import { createEnemy, createLahama } from '../src/core/combat.js';
import { QUEST } from '../src/core/quest.js';
import { saveTo, loadFrom, SAVE_KEY } from '../src/core/save.js';
import { gainXp } from '../src/core/party.js';
import { memStorage, walkToObject, walkToExit, autoFight } from './helpers.js';

function fight(game, id, atbMode) {
  walkToObject(game, id);
  const ev = interact(game);
  assert.equal(ev.type, 'battle', `${id} déclenche un combat`);
  const enemies = ev.boss ? [createLahama()] : ev.enemies.map((k, i) => createEnemy(k, i));
  const b = autoFight(game, enemies, { atbMode });
  assert.equal(b.outcome, 'victory', `${id} gagné`);
  return { result: resolveBattle(game, { encounterId: id, outcome: b.outcome, xpReward: b.xpReward }), enemies, battle: b };
}

function changeZoneAndReload(game, storage, expected) {
  const r = walkToExit(game);
  assert.equal(r.event.type, 'zone');
  assert.equal(game.zoneId, expected);
  assert.equal(saveTo(storage, SAVE_KEY, game), true);
  const resumed = loadFrom(storage, SAVE_KEY); // « rechargement » : on continue avec l'état relu
  assert.deepEqual(resumed, JSON.parse(JSON.stringify(game)));
  return resumed;
}

for (const atbMode of ['wait', 'active']) {
  test(`parcours complet du chapitre 1 jusqu’à la victoire sur Lahama (mode ${atbMode})`, () => {
    const storage = memStorage();
    let g = createGame({ atbMode });
    saveTo(storage, SAVE_KEY, g);

    fight(g, 'quais1', atbMode);
    fight(g, 'quais2', atbMode);
    g = changeZoneAndReload(g, storage, 'marche');

    walkToObject(g, 'dumuzi');
    assert.equal(interact(g).type, 'dialog');
    assert.equal(g.quest.state, QUEST.ACCEPTED);
    fight(g, 'tuto', atbMode);
    g = changeZoneAndReload(g, storage, 'cour');

    walkToObject(g, 'inscription');
    assert.match(interact(g).lines[0], /eau.*étoile.*roseau/);
    for (const s of ['eau', 'etoile', 'roseau']) {
      walkToObject(g, `pierre-${s}`);
      interact(g);
    }
    assert.equal(g.puzzle.solved, true);
    fight(g, 'cour1', atbMode);
    g = changeZoneAndReload(g, storage, 'sanctuaire');
    assert.ok(g.party.every((p) => p.level >= 2 && p.skills.length === 1), 'compétences débloquées avant le boss');

    const { result, enemies, battle } = fight(g, 'lahama', atbMode);
    const rounds = battle.heroActions;
    assert.ok(rounds >= 6 && rounds <= 9, `combat Lahama ≈ 6–9 actions de héros (obtenu ${battle.heroActions})`);
    assert.equal(enemies[0].phase, 2, 'Lahama est passé en phase 2');
    assert.equal(result.type, 'ending');
    assert.equal(objectsIn(g).length, 0);
    completeChapter(g);
    assert.equal(g.quest.state, QUEST.COMPLETED);
    assert.equal(g.artefact, true);
  });
}

test('défaite contre Lahama → reprise au point de sauvegarde d’avant le boss', () => {
  const storage = memStorage();
  const g = createGame();
  g.cleared = { quais1: true, quais2: true, cour1: true };
  g.quest.state = QUEST.ACCEPTED;
  g.puzzle.solved = true;
  g.zoneId = 'cour'; g.pos = { ...ZONES.cour.spawn };
  walkToExit(g);
  saveTo(storage, SAVE_KEY, g);

  for (const p of g.party) p.hp = 1;
  walkToObject(g, 'lahama');
  const b = autoFight(g, [createLahama()]);
  assert.equal(b.outcome, 'defeat');
  assert.equal(resolveBattle(g, { encounterId: 'lahama', outcome: 'defeat', xpReward: 0 }).type, 'defeat');

  const resumed = loadFrom(storage, SAVE_KEY);
  assert.equal(resumed.zoneId, 'sanctuaire');
  assert.equal(resumed.checkpointId, 'sanctuaire');
  assert.ok(resumed.party.every((p) => p.hp === p.hpMax));
  assert.ok(objectsIn(resumed).some((o) => o.id === 'lahama'));
});

test('Lahama battable aux attaques normales seules (sans entraînement, niveau 2, sans compétence)', () => {
  const g = createGame();
  g.cleared = { quais1: true, quais2: true };
  for (const p of g.party) gainXp(p, 30);
  g.zoneId = 'sanctuaire'; g.pos = { x: 4, y: 7 }; g.quest.state = QUEST.ACCEPTED;
  walkToObject(g, 'lahama');
  const b = autoFight(g, [createLahama()], { skills: false });
  assert.equal(b.outcome, 'victory');
  assert.ok(b.heroActions <= 16, `${b.heroActions} actions`);
});
