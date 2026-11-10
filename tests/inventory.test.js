import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInventory, addItem, usePotion, hasQuestKey, takeQuestKey, MAX_POTIONS
} from '../src/core/inventory.js';

test('3 potions au départ, pas de clé de quête', () => {
  const inv = createInventory();
  assert.equal(inv.potions, 3);
  assert.equal(MAX_POTIONS, 3);
  assert.equal(hasQuestKey(inv), false);
});

test('potions plafonnées à 3', () => {
  const inv = createInventory();
  assert.equal(addItem(inv, 'potion'), false);
  inv.potions = 1;
  assert.equal(addItem(inv, 'potion'), true);
  assert.equal(inv.potions, 2);
});

test('usePotion soigne +30 PV plafonné et consomme', () => {
  const inv = createInventory();
  const t = { hp: 10, hpMax: 100 };
  assert.equal(usePotion(inv, t), 30);
  assert.equal(t.hp, 40);
  t.hp = 90;
  assert.equal(usePotion(inv, t), 10);
  assert.equal(t.hp, 100);
  assert.equal(inv.potions, 1);
});

test('usePotion refusé sans potion, sur héros KO ou à PV pleins', () => {
  const inv = createInventory();
  assert.equal(usePotion(inv, { hp: 0, hpMax: 50 }), false);
  assert.equal(usePotion(inv, { hp: 50, hpMax: 50 }), false);
  inv.potions = 0;
  assert.equal(usePotion(inv, { hp: 5, hpMax: 50 }), false);
});

test('clé de quête : ajout / possession / retrait', () => {
  const inv = createInventory();
  addItem(inv, 'tablette');
  assert.equal(hasQuestKey(inv), true);
  assert.equal(takeQuestKey(inv), 'tablette');
  assert.equal(hasQuestKey(inv), false);
});
