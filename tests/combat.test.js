import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAttack, applySkill, startDefend, clearDefend, createLahama, createEnemy,
  enemyChooseAction, ENEMY_KINDS
} from '../src/core/combat.js';

test('attaque inflige au moins 1', () => {
  const r = applyAttack({ atk: 10 }, { def: 100, hp: 50 }, { defending: false });
  assert.equal(r.damage, 1);
});

test('formule max(1, atk - def/2) et PV réduits', () => {
  const t = { def: 9, hp: 50 };
  const r = applyAttack({ atk: 20 }, t);
  assert.equal(r.damage, 16); // 20 - floor(4.5)
  assert.equal(t.hp, 34);
});

test('PV jamais négatifs', () => {
  const t = { def: 0, hp: 5 };
  applyAttack({ atk: 50 }, t);
  assert.equal(t.hp, 0);
});

test('défense réduit les dégâts de moitié', () => {
  const t = { def: 0, hp: 40 };
  startDefend(t);
  const r = applyAttack({ atk: 20 }, t, { defending: true });
  assert.equal(r.damage, 10);
  clearDefend(t);
  assert.equal(t.defending, false);
});

test('la défense de la cible est prise en compte par défaut', () => {
  const t = { def: 0, hp: 40 };
  startDefend(t);
  assert.equal(applyAttack({ atk: 21 }, t).damage, 10);
});

test('Lahama passe phase 2 sous 50% et speed double', () => {
  const boss = createLahama();
  assert.equal(boss.phase, 1);
  const half = Math.floor(boss.hpMax / 2);
  boss.hp = half;
  boss.onDamaged();
  assert.equal(boss.phase, 2);
  assert.ok(boss.speed >= boss.baseSpeed * 2);
});

test('Lahama : armure phase 1 (def haute) brisée en phase 2', () => {
  const boss = createLahama();
  const def1 = boss.def;
  applyAttack({ atk: 999 }, boss);
  assert.equal(boss.phase, 2);
  assert.ok(boss.def < def1);
});

test('Lahama reste en phase 1 au-dessus de 50%', () => {
  const boss = createLahama();
  applyAttack({ atk: 30 }, boss);
  assert.equal(boss.phase, 1);
  assert.equal(boss.speed, boss.baseSpeed);
});

test('4 types d’ennemis du devis', () => {
  assert.deepEqual(Object.keys(ENEMY_KINDS).sort(), ['esprit', 'gardien', 'pillard', 'scorpion']);
  const e = createEnemy('pillard', 0);
  assert.equal(e.hp, e.hpMax);
  assert.equal(e.gauge, 0);
  assert.ok(e.xp > 0);
  assert.notEqual(createEnemy('pillard', 0).id, createEnemy('pillard', 1).id);
});

test('visee ignore la défense (x1.5)', () => {
  const t = { def: 40, hp: 100 };
  const r = applySkill({ atk: 20 }, t, 'visee');
  assert.equal(r.damage, 30);
  assert.equal(t.hp, 70);
});

test('soin_me soigne tous les alliés vivants (plafond hpMax)', () => {
  const a = { hp: 10, hpMax: 50 }, b = { hp: 45, hpMax: 50 }, ko = { hp: 0, hpMax: 50 };
  applySkill({ atk: 5 }, [a, b, ko], 'soin_me');
  assert.equal(a.hp, 35);
  assert.equal(b.hp, 50);
  assert.equal(ko.hp, 0);
});

test('taunt : l’ennemi cible le héros provocateur et celui-ci se défend', () => {
  const party = [{ id: 't', hp: 10 }, { id: 'n', hp: 10 }, { id: 'b', hp: 10 }];
  applySkill(party[0], party[0], 'taunt');
  assert.equal(party[0].defending, true);
  const act = enemyChooseAction({ atk: 5 }, party, () => 0.99);
  assert.equal(act.target, party[0]);
});

test('enemyChooseAction ignore les héros KO', () => {
  const party = [{ id: 't', hp: 0 }, { id: 'n', hp: 10 }];
  for (const r of [0, 0.5, 0.99]) {
    assert.equal(enemyChooseAction({}, party, () => r).target.id, 'n');
  }
});

test('noms complets des compétences (source unique pour menu et journal)', async () => {
  const { SKILLS } = await import('../src/core/combat.js');
  assert.deepEqual(Object.keys(SKILLS).sort(), ['soin_me', 'taunt', 'visee']);
  assert.equal(SKILLS.soin_me.name, 'Soin des me d’Enki');
  // Le libellé du menu doit tenir dans un bouton de 480 px (police 20 px ≈ 0,55 em/caractère, marge 40 px).
  for (const s of Object.values(SKILLS)) assert.ok(`Compétence : ${s.name}`.length * 20 * 0.55 <= 440, s.name);
});

test('Lahama phase 1 : une attaque normale compte (Tishra niv. 2 ≥ 8, Balum niv. 2 ≥ 12)', () => {
  assert.ok(applyAttack({ atk: 15 }, createLahama()).damage >= 8);
  assert.ok(applyAttack({ atk: 19 }, createLahama()).damage >= 12);
});

test('Visée reste forte mais pas écrasante face à une attaque normale (≤ 2× sur Lahama)', () => {
  const visee = applySkill({ atk: 19 }, createLahama(), 'visee').damage;
  const normal = applyAttack({ atk: 19 }, createLahama()).damage;
  assert.ok(visee > normal && visee <= 2 * normal, `${visee} vs ${normal}`);
});
