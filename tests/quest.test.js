import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUEST, createQuest, acceptFromDumuzi, pickupTablet, returnTablet, createPuzzle, press
} from '../src/core/quest.js';

test('quête bout-en-bout', () => {
  const q = createQuest();
  assert.equal(q.state, QUEST.NOT_STARTED);
  assert.equal(acceptFromDumuzi(q), true);
  assert.equal(q.state, QUEST.ACCEPTED);
  assert.equal(pickupTablet(q), true);
  assert.equal(q.state, QUEST.TABLET_HELD);
  assert.equal(returnTablet(q), true);
  assert.equal(q.state, QUEST.COMPLETED);
});

test('transitions hors ordre refusées', () => {
  const q = createQuest();
  assert.equal(pickupTablet(q), false);
  assert.equal(returnTablet(q), false);
  acceptFromDumuzi(q);
  assert.equal(acceptFromDumuzi(q), false);
  assert.equal(returnTablet(q), false);
  assert.equal(q.state, QUEST.ACCEPTED);
});

test('énigme : ordre exact eau, etoile, roseau → résolue', () => {
  const p = createPuzzle(['eau', 'etoile', 'roseau']);
  assert.equal(press(p, 'eau'), 'progress');
  assert.equal(press(p, 'etoile'), 'progress');
  assert.equal(press(p, 'roseau'), 'solved');
  assert.equal(p.solved, true);
});

test('énigme : erreur → reset', () => {
  const p = createPuzzle(['eau', 'etoile', 'roseau']);
  press(p, 'eau');
  assert.equal(press(p, 'roseau'), 'reset');
  assert.deepEqual(p.input, []);
  assert.equal(p.solved, false);
  assert.equal(press(p, 'eau'), 'progress');
});

test('énigme résolue reste résolue', () => {
  const p = createPuzzle(['eau']);
  press(p, 'eau');
  assert.equal(press(p, 'roseau'), 'solved');
});

test('re-presser une pierre déjà allumée ne réinitialise pas (double Entrée / double toucher)', () => {
  const p = createPuzzle(['eau', 'etoile', 'roseau']);
  press(p, 'eau');
  assert.equal(press(p, 'eau'), 'already');
  assert.deepEqual(p.input, ['eau']);
  press(p, 'etoile');
  assert.equal(press(p, 'roseau'), 'solved');
});

test('la séquence bleue → dorée → verte résout depuis tout état atteignable', () => {
  const S = ['eau', 'etoile', 'roseau'];
  const states = [[], ['eau'], ['eau', 'etoile'], ['etoile'], ['roseau'], ['eau', 'roseau'], ['eau', 'etoile', 'eau']];
  for (const before of states) {
    const p = createPuzzle(S);
    for (const s of before) press(p, s);
    for (const s of S) press(p, s);
    assert.equal(p.solved, true, `après ${before.join(',') || 'rien'}`);
  }
});
