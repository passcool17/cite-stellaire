// Déroulement d'un combat ATB, indépendant de Phaser.
import { tick, consume } from './atb.js';
import { applyAttack, applySkill, startDefend, clearDefend, enemyChooseAction, SKILLS } from './combat.js';
import { usePotion } from './inventory.js';

const alive = (f) => f.hp > 0;

export function createBattle({ party, enemies, inventory, atbMode = 'wait', rng = Math.random }) {
  for (const p of party) Object.assign(p, { gauge: 0, gaugeMax: 100, ready: false, defending: false, taunting: false });
  return {
    party, enemies, inventory, atbMode, rng, log: [], events: [], outcome: null,
    xpReward: enemies.reduce((s, e) => s + e.xp, 0),
  };
}

function checkOutcome(b) {
  if (!b.enemies.some(alive)) b.outcome = 'victory';
  else if (!b.party.some(alive)) b.outcome = 'defeat';
}

function say(b, line) {
  b.log.push(line);
  if (b.log.length > 30) b.log.shift();
}

// events : file consommée par la scène (sons, flash, animations) ;
// { type: 'hit' | 'spell' | 'rage', targetId, actorId?, pose?: 'attack' | 'cast' }.
function hit(b, target, before, text, actor, pose = 'attack') {
  say(b, text);
  b.events.push({ type: 'hit', targetId: target.id, actorId: actor.id, pose });
  if (target.boss && before.phase === 1 && target.phase === 2) {
    say(b, `${target.name} entre en rage : sa jauge accélère !`);
    b.events.push({ type: 'rage', targetId: target.id });
  }
}

export function update(b, dtMs, { menuOpen }) {
  if (b.outcome) return;
  tick([...b.party, ...b.enemies], dtMs, { frozen: b.atbMode === 'wait' && menuOpen });
  for (const e of b.enemies) {
    if (!alive(e) || !e.ready || b.outcome) continue;
    const { target } = enemyChooseAction(e, b.party, b.rng);
    const { damage } = applyAttack(e, target);
    hit(b, target, {}, `${e.name} frappe ${target.name} : -${damage} PV`, e);
    consume(e);
    checkOutcome(b);
  }
}

export const readyAllies = (b) => (b.outcome ? [] : b.party.filter((p) => alive(p) && p.ready));

export function act(b, actorId, { type, targetId }) {
  const actor = b.party.find((p) => p.id === actorId);
  if (!actor || !alive(actor) || !actor.ready || b.outcome) return { ok: false, message: 'Pas prêt.' };
  const enemy = b.enemies.find((e) => e.id === targetId && alive(e));
  const ally = b.party.find((p) => p.id === targetId);
  const skill = actor.skills[0];
  const fail = (message) => ({ ok: false, message });

  if ((type === 'attack' || (type === 'skill' && skill === 'visee')) && !enemy) return fail('Choisis un ennemi.');
  if (type === 'skill' && !skill) return fail(`${actor.name} n’a pas encore de compétence (niveau 2).`);
  if (type === 'item' && (b.inventory.potions <= 0 || !ally || !alive(ally) || ally.hp >= ally.hpMax)) {
    return fail('Potion impossible (aucune, KO ou PV pleins).');
  }

  clearDefend(actor);
  actor.taunting = false;
  if (type === 'attack') {
    const before = { phase: enemy.phase };
    const { damage } = applyAttack(actor, enemy);
    hit(b, enemy, before, `${actor.name} attaque ${enemy.name} : -${damage} PV`, actor);
  } else if (type === 'skill' && skill === 'visee') {
    const before = { phase: enemy.phase };
    const { damage } = applySkill(actor, enemy, 'visee');
    hit(b, enemy, before, `${actor.name} — Visée sur ${enemy.name} : -${damage} PV`, actor, 'cast');
  } else if (type === 'skill') {
    const { healed } = applySkill(actor, skill === 'soin_me' ? b.party : actor, skill);
    b.events.push({ type: 'spell', targetId: actor.id, actorId: actor.id, pose: 'cast' });
    say(b, `${actor.name} utilise ${SKILLS[skill].name}${skill === 'soin_me' ? ` : +${healed} PV à l’équipe` : ' : attire les coups et se met en défense'}.`);
  } else if (type === 'item') {
    const healed = usePotion(b.inventory, ally);
    b.events.push({ type: 'spell', targetId: ally.id, actorId: actor.id, pose: 'cast' });
    say(b, `${actor.name} donne une potion à ${ally.name} : +${healed} PV`);
  } else if (type === 'defend') {
    startDefend(actor);
    say(b, `${actor.name} se met en défense.`);
  } else return fail('Action inconnue.');

  consume(actor);
  checkOutcome(b);
  return { ok: true };
}
