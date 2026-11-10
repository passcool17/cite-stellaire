// Règles de combat du chapitre 1 : dégâts, défense, compétences, ennemis, boss Lahama.
import { createFighter, setSpeed } from './atb.js';

export const ENEMY_KINDS = {
  pillard: { name: 'Pillard des digues', hpMax: 30, atk: 12, def: 4, speed: 22, xp: 10 },
  esprit: { name: 'Esprit des roseaux', hpMax: 26, atk: 14, def: 2, speed: 30, xp: 12 },
  scorpion: { name: 'Scorpion des briques', hpMax: 40, atk: 15, def: 10, speed: 20, xp: 12 },
  gardien: { name: 'Gardien de seuil', hpMax: 70, atk: 18, def: 12, speed: 24, xp: 25 },
};

export const SKILLS = {
  taunt: { name: 'Provocation' },
  soin_me: { name: 'Soin des me d’Enki' }, // les « me » : pouvoirs divins de civilisation (mythe sumérien)
  visee: { name: 'Visée' },
};

export function createEnemy(kind, index) {
  const k = ENEMY_KINDS[kind];
  return createFighter({ id: `${kind}-${index}`, kind, ...k, hp: k.hpMax });
}

function hurt(target, damage) {
  target.hp = Math.max(0, target.hp - damage);
  target.onDamaged?.();
  return { damage };
}

export function applyAttack(attacker, target, { defending = target.defending } = {}) {
  let damage = Math.max(1, attacker.atk - Math.floor(target.def / 2));
  if (defending) damage = Math.max(1, Math.floor(damage / 2));
  return hurt(target, damage);
}

// target : un ennemi (visee), la liste des alliés (soin_me) ou le lanceur (taunt).
export function applySkill(user, target, skillId) {
  if (skillId === 'visee') return hurt(target, Math.floor(user.atk * 1.5));
  if (skillId === 'soin_me') {
    let healed = 0;
    for (const a of target) {
      if (a.hp <= 0) continue;
      const h = Math.min(25, a.hpMax - a.hp);
      a.hp += h;
      healed += h;
    }
    return { healed };
  }
  if (skillId === 'taunt') {
    user.taunting = true;
    startDefend(user);
    return {};
  }
  throw new Error(`compétence inconnue : ${skillId}`);
}

export function startDefend(f) { f.defending = true; }
export function clearDefend(f) { f.defending = false; }

export function createLahama() {
  const boss = createFighter({
    id: 'lahama', kind: 'lahama', name: 'Lahama faussé', boss: true,
    hpMax: 150, hp: 150, atk: 22, def: 10, speed: 26, baseSpeed: 26, phase: 1, xp: 0,
  });
  boss.onDamaged = () => {
    if (boss.phase === 1 && boss.hp <= boss.hpMax / 2) {
      boss.phase = 2;
      boss.def = 4;
      setSpeed(boss, boss.baseSpeed * 2);
    }
  };
  return boss;
}

export function enemyChooseAction(enemy, party, rng = Math.random) {
  const alive = party.filter((p) => p.hp > 0);
  const target = alive.find((p) => p.taunting) ?? alive[Math.floor(rng() * alive.length)];
  return { type: 'attack', target };
}
