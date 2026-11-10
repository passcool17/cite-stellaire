import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, update, readyAllies, act } from '../src/core/battle.js';
import { createParty, gainXp } from '../src/core/party.js';
import { createInventory } from '../src/core/inventory.js';
import { createEnemy, createLahama } from '../src/core/combat.js';

const setup = (atbMode = 'wait', enemies = [createEnemy('pillard', 0)]) =>
  createBattle({ party: createParty(), enemies, inventory: createInventory(), atbMode, rng: () => 0 });

const untilAllyReady = (b) => {
  for (let i = 0; i < 1000 && !readyAllies(b).length; i++) update(b, 100, { menuOpen: false });
};

test('mode Attente : jauges figées pendant le menu', () => {
  const b = setup('wait');
  untilAllyReady(b);
  const snap = [...b.party, ...b.enemies].map((f) => f.gauge);
  update(b, 3000, { menuOpen: true });
  assert.deepEqual([...b.party, ...b.enemies].map((f) => f.gauge), snap);
});

test('mode Actif : jauges avancent pendant le menu', () => {
  const b = setup('active');
  const g = b.enemies[0].gauge;
  update(b, 500, { menuOpen: true });
  assert.ok(b.enemies[0].gauge > g);
});

test('ennemi prêt attaque automatiquement un héros', () => {
  const b = setup('active');
  const total = () => b.party.reduce((s, p) => s + p.hp, 0);
  const before = total();
  update(b, 10000, { menuOpen: false });
  assert.ok(total() < before);
  assert.ok(b.log.some((l) => l.includes('Pillard')));
});

test('act : attaque d’un héros prêt, jauge vidée', () => {
  const b = setup();
  untilAllyReady(b);
  const hero = readyAllies(b)[0];
  const e = b.enemies[0];
  const hp = e.hp;
  assert.equal(act(b, hero.id, { type: 'attack', targetId: e.id }).ok, true);
  assert.ok(e.hp < hp);
  assert.equal(hero.gauge, 0);
});

test('act refusé si héros pas prêt', () => {
  const b = setup();
  assert.equal(act(b, 'tishra', { type: 'defend' }).ok, false);
});

test('compétence verrouillée au niveau 1, utilisable au niveau 2', () => {
  const b = setup();
  untilAllyReady(b);
  const hero = readyAllies(b)[0];
  const e = b.enemies[0];
  assert.equal(act(b, hero.id, { type: 'skill', targetId: e.id }).ok, false);
  gainXp(hero, 30);
  assert.equal(act(b, hero.id, { type: 'skill', targetId: e.id }).ok, true);
});

test('objet : potion soigne un allié, refus si PV pleins (jauge conservée)', () => {
  const b = setup();
  untilAllyReady(b);
  const hero = readyAllies(b)[0];
  const full = b.party.find((p) => p.hp === p.hpMax);
  assert.equal(act(b, hero.id, { type: 'item', targetId: full.id }).ok, false);
  assert.equal(hero.ready, true);
  full.hp -= 20;
  assert.equal(act(b, hero.id, { type: 'item', targetId: full.id }).ok, true);
  assert.equal(b.inventory.potions, 2);
});

test('défense jusqu’au prochain tour du héros', () => {
  const b = setup();
  untilAllyReady(b);
  const hero = readyAllies(b)[0];
  act(b, hero.id, { type: 'defend' });
  assert.equal(hero.defending, true);
  hero.gauge = hero.gaugeMax; hero.ready = true;
  act(b, hero.id, { type: 'attack', targetId: b.enemies[0].id });
  assert.equal(hero.defending, false);
});

test('victoire quand tous les ennemis tombent ; XP de récompense', () => {
  const b = setup();
  b.enemies[0].hp = 1;
  untilAllyReady(b);
  act(b, readyAllies(b)[0].id, { type: 'attack', targetId: b.enemies[0].id });
  assert.equal(b.outcome, 'victory');
  assert.equal(b.xpReward, 10);
});

test('défaite quand tous les héros tombent', () => {
  const b = setup('active');
  for (const p of b.party) p.hp = 1;
  for (let i = 0; i < 200 && !b.outcome; i++) update(b, 200, { menuOpen: false });
  assert.equal(b.outcome, 'defeat');
});

test('Lahama : phase 2 visible dans le combat (vitesse doublée)', () => {
  const boss = createLahama();
  const b = setup('wait', [boss]);
  untilAllyReady(b);
  boss.hp = boss.hpMax / 2 + 1;
  act(b, readyAllies(b)[0].id, { type: 'attack', targetId: boss.id });
  assert.equal(boss.phase, 2);
  assert.equal(boss.speed, boss.baseSpeed * 2);
  assert.ok(b.log.some((l) => l.includes('rage')));
});

test('une action refusée ne modifie pas l’état du héros (défense conservée)', () => {
  const b = setup();
  untilAllyReady(b);
  const hero = readyAllies(b)[0];
  hero.defending = true;
  assert.equal(act(b, hero.id, { type: 'item', targetId: hero.id }).ok, false);
  assert.equal(hero.defending, true);
});

test('journal : nom complet du soin de Nerû et PV rendus', () => {
  const b = setup();
  const neru = b.party.find((p) => p.id === 'neru');
  gainXp(neru, 30);
  b.party[0].hp -= 20;
  neru.gauge = neru.gaugeMax; neru.ready = true;
  act(b, 'neru', { type: 'skill' });
  assert.match(b.log.at(-1), /Nerû utilise Soin des me d’Enki : \+20 PV/);
});

test('événements de combat pour sons/effets : hit, spell, rage', () => {
  const boss = createLahama();
  const b = setup('wait', [boss]);
  untilAllyReady(b);
  b.events.length = 0;
  const hero = readyAllies(b)[0];
  boss.hp = boss.hpMax / 2 + 1;
  act(b, hero.id, { type: 'attack', targetId: boss.id });
  assert.deepEqual(b.events.map((e) => e.type), ['hit', 'rage']);
  assert.equal(b.events[0].targetId, 'lahama');
  assert.equal(b.events[0].actorId, hero.id, 'qui frappe (pour l’animation attack)');
  assert.equal(b.events[0].pose, 'attack');
  b.events.length = 0;
  const neru = b.party.find((p) => p.id === 'neru');
  gainXp(neru, 30);
  neru.gauge = neru.gaugeMax; neru.ready = true;
  act(b, 'neru', { type: 'skill' });
  assert.deepEqual(b.events, [{ type: 'spell', targetId: 'neru', actorId: 'neru', pose: 'cast' }]);
});

test('événement hit quand un ennemi frappe', () => {
  const b = setup('active');
  update(b, 10000, { menuOpen: false });
  const e = b.events.find((x) => x.type === 'hit');
  assert.ok(b.party.some((p) => p.id === e.targetId));
  assert.ok(b.enemies.some((x) => x.id === e.actorId));
  assert.equal(e.pose, 'attack');
});

test('Visée et potion : pose « cast » pour le lanceur', () => {
  const b = setup();
  const kanu = b.party.find((p) => p.skills.includes('visee')) ?? b.party.find((p) => p.id === 'balum');
  gainXp(kanu, 30);
  kanu.gauge = kanu.gaugeMax; kanu.ready = true;
  b.events.length = 0;
  act(b, kanu.id, { type: 'skill', targetId: b.enemies[0].id });
  assert.equal(b.events[0].pose, 'cast');
  assert.equal(b.events[0].actorId, kanu.id);
  b.party[0].hp -= 10;
  const t = b.party[1]; t.gauge = t.gaugeMax; t.ready = true;
  b.events.length = 0;
  act(b, t.id, { type: 'item', targetId: b.party[0].id });
  assert.deepEqual(b.events[0], { type: 'spell', targetId: b.party[0].id, actorId: t.id, pose: 'cast' });
});
