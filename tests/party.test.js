import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParty, gainXp, XP_LEVELS } from '../src/core/party.js';

test('trio Tishra / Nerû / Balum niveau 1 sans compétence', () => {
  const p = createParty();
  assert.deepEqual(p.map((m) => m.name), ['Tishra', 'Nerû', 'Balum']);
  assert.deepEqual(p.map((m) => m.role), ['tank', 'mage', 'dps']);
  for (const m of p) {
    assert.equal(m.level, 1);
    assert.equal(m.hp, m.hpMax);
    assert.deepEqual(m.skills, []);
  }
});

test('XP jusqu’au niveau 2 : +stats et débloque la compétence du héros', () => {
  const [tishra, neru, balum] = createParty();
  const atk = balum.atk, hpMax = tishra.hpMax;
  assert.deepEqual(gainXp(balum, XP_LEVELS[1]), { levelsGained: 1 });
  assert.equal(balum.level, 2);
  assert.ok(balum.atk > atk);
  assert.deepEqual(balum.skills, ['visee']);
  gainXp(tishra, XP_LEVELS[1]);
  assert.ok(tishra.hpMax > hpMax);
  assert.deepEqual(tishra.skills, ['taunt']);
  gainXp(neru, XP_LEVELS[1]);
  assert.deepEqual(neru.skills, ['soin_me']);
});

test('XP partielle : pas de niveau', () => {
  const [t] = createParty();
  assert.deepEqual(gainXp(t, XP_LEVELS[1] - 1), { levelsGained: 0 });
  assert.equal(t.level, 1);
});

test('plafonne au niveau 3 ; compétence non dupliquée', () => {
  const [t] = createParty();
  assert.deepEqual(gainXp(t, 10000), { levelsGained: 2 });
  assert.equal(t.level, 3);
  gainXp(t, 10000);
  assert.equal(t.level, 3);
  assert.deepEqual(t.skills, ['taunt']);
});

test('un héros KO ne gagne pas d’XP', () => {
  const [t] = createParty();
  t.hp = 0;
  gainXp(t, 1000);
  assert.equal(t.xp, 0);
});
