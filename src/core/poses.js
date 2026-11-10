// Choix des animations, indépendant de Phaser.
// Grille iso : dx+1 → écran bas-droite, dy+1 → bas-gauche, dy-1 → haut-droite, dx-1 → haut-gauche.
// Les feuilles Créa n'ont que « bas » et « haut » : la droite/gauche s'obtient par miroir horizontal.
export function walkPose({ dx, dy }) {
  if (dx > 0) return { dir: 'down', flipX: true };
  if (dy > 0) return { dir: 'down', flipX: false };
  if (dx < 0) return { dir: 'up', flipX: true };
  return { dir: 'up', flipX: false };
}

// Poses jouées une fois puis retour au repos (la rage du boss boucle).
export const POSE_ONCE = new Set(['attack', 'cast', 'hit']);

// Événement de combat (battle.js) → poses à jouer : le lanceur prend sa pose, la cible frappée prend « hit ».
export function battlePoses(ev) {
  if (ev.type === 'rage') return [{ id: ev.targetId, pose: 'rage' }];
  const out = ev.actorId && ev.pose ? [{ id: ev.actorId, pose: ev.pose }] : [];
  if (ev.type === 'hit') out.push({ id: ev.targetId, pose: 'hit' });
  return out;
}
