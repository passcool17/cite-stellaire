import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFighter, tick, consume, setSpeed } from '../src/core/atb.js';

test('jauge se remplit selon speed', () => {
  const a = createFighter({ id: 'a', speed: 50, gaugeMax: 100 });
  tick([a], 1000, { frozen: false });
  assert.equal(a.gauge, 50);
  assert.equal(a.ready, false);
});

test('ready quand pleine ; consume remet à 0', () => {
  const a = createFighter({ id: 'a', speed: 100, gaugeMax: 100 });
  tick([a], 2000, { frozen: false });
  assert.equal(a.gauge, 100);
  assert.equal(a.ready, true);
  consume(a);
  assert.equal(a.gauge, 0);
  assert.equal(a.ready, false);
});

test('frozen = Attente : aucune jauge n’avance', () => {
  const a = createFighter({ id: 'a', speed: 100, gaugeMax: 100 });
  tick([a], 5000, { frozen: true });
  assert.equal(a.gauge, 0);
});

test('ennemis aussi sur jauge ; speed plus haute remplit plus vite', () => {
  const slow = createFighter({ id: 's', speed: 20, gaugeMax: 100 });
  const fast = createFighter({ id: 'f', speed: 80, gaugeMax: 100 });
  tick([slow, fast], 500, { frozen: false });
  assert.ok(fast.gauge > slow.gauge);
});

test('setSpeed accélère (phase rage Lahama)', () => {
  const b = createFighter({ id: 'boss', speed: 40, gaugeMax: 100 });
  setSpeed(b, 80);
  tick([b], 500, { frozen: false });
  assert.equal(b.gauge, 40);
});

test('un combattant KO (hp 0) ne remplit pas sa jauge', () => {
  const a = createFighter({ id: 'a', speed: 100 });
  a.hp = 0;
  tick([a], 1000, { frozen: false });
  assert.equal(a.gauge, 0);
});

test('createFighter conserve les autres propriétés', () => {
  const a = createFighter({ id: 'a', speed: 10, hp: 30, atk: 5 });
  assert.equal(a.hp, 30);
  assert.equal(a.atk, 5);
  assert.equal(a.gaugeMax, 100);
});
