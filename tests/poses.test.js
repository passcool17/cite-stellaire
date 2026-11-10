// Choix des animations (exploration et combat), indépendant de Phaser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkPose, battlePoses, POSE_ONCE } from '../src/core/poses.js';

test('marche iso : bas/haut + miroir pour gauche/droite (4 directions de la grille)', () => {
  // dx+1 → écran bas-droite ; dy+1 → bas-gauche ; dy-1 → haut-droite ; dx-1 → haut-gauche.
  assert.deepEqual(walkPose({ dx: 1, dy: 0 }), { dir: 'down', flipX: true });
  assert.deepEqual(walkPose({ dx: 0, dy: 1 }), { dir: 'down', flipX: false });
  assert.deepEqual(walkPose({ dx: 0, dy: -1 }), { dir: 'up', flipX: false });
  assert.deepEqual(walkPose({ dx: -1, dy: 0 }), { dir: 'up', flipX: true });
});

test('combat : le lanceur prend sa pose, la cible touchée prend « hit »', () => {
  assert.deepEqual(battlePoses({ type: 'hit', actorId: 'tishra', targetId: 'pillard-0', pose: 'attack' }),
    [{ id: 'tishra', pose: 'attack' }, { id: 'pillard-0', pose: 'hit' }]);
  assert.deepEqual(battlePoses({ type: 'spell', actorId: 'neru', targetId: 'neru', pose: 'cast' }), [{ id: 'neru', pose: 'cast' }]);
  assert.deepEqual(battlePoses({ type: 'spell', actorId: 'neru', targetId: 'balum', pose: 'cast' }), [{ id: 'neru', pose: 'cast' }]);
  assert.deepEqual(battlePoses({ type: 'rage', targetId: 'lahama' }), [{ id: 'lahama', pose: 'rage' }]);
});

test('poses jouées une fois puis retour au repos ; la rage boucle', () => {
  assert.deepEqual([...POSE_ONCE].sort(), ['attack', 'cast', 'hit']);
});
