// Chapitre 1 : cartes des 4 zones d'Eridu, déplacements, interactions et progression.
// Légende carte : '.' sol, '~' eau, '#' mur, '"' roseaux, 'E' sortie.
import { createParty, gainXp } from './party.js';
import { createInventory, addItem, takeQuestKey, MAX_POTIONS } from './inventory.js';
import { CALAGE } from './calage-data.js';
import { QUEST, createQuest, acceptFromDumuzi, pickupTablet, returnTablet, createPuzzle, press } from './quest.js';

export const SOLUTION = ['eau', 'etoile', 'roseau'];
const SYMBOL_NAMES = { eau: 'l’eau', etoile: 'l’étoile', roseau: 'le roseau' };

// Cartes, apparitions, sorties et positions des objets : calées sur les fonds peints (src/core/calage-data.js, généré).
// Ici restent les règles : identité des objets, combats, verrous.
const placed = (zoneId, objects) => objects.map((o) => ({ ...o, ...CALAGE[zoneId].objects[o.id] }));
const grid = (zoneId) => ({ spawn: CALAGE[zoneId].spawn, exit: CALAGE[zoneId].exit, map: CALAGE[zoneId].map });

export const ZONES = {
  quais: {
    name: 'Quais & canaux d’Eridu', next: 'marche', ...grid('quais'),
    objects: placed('quais', [
      { id: 'quais1', type: 'encounter', label: 'Pillards', enemies: ['pillard', 'pillard'] },
      { id: 'quais2', type: 'encounter', label: 'Pillard et esprit', enemies: ['pillard', 'esprit'] },
    ]),
    locked: (g) => (g.cleared.quais1 && g.cleared.quais2 ? null : 'Des pillards bloquent encore les quais.'),
  },
  marche: {
    name: 'Marché des scribes', next: 'cour', ...grid('marche'),
    objects: placed('marche', [
      { id: 'dumuzi', type: 'npc', label: 'Dumuzi-abzu' },
      { id: 'tuto', type: 'encounter', label: 'Pillard (entraînement)', enemies: ['pillard'] },
    ]),
    locked: (g) => (g.quest.state === QUEST.NOT_STARTED ? 'Parle d’abord au grand prêtre Dumuzi-abzu.' : null),
  },
  cour: {
    name: 'Cour du temple (E-abzu)', next: 'sanctuaire', ...grid('cour'),
    objects: placed('cour', [
      { id: 'pierre-eau', type: 'stone', symbol: 'eau', label: 'Pierre de l’eau' },
      { id: 'pierre-etoile', type: 'stone', symbol: 'etoile', label: 'Pierre de l’étoile' },
      { id: 'pierre-roseau', type: 'stone', symbol: 'roseau', label: 'Pierre du roseau' },
      { id: 'inscription', type: 'sign', label: 'Inscription' },
      { id: 'cour1', type: 'encounter', label: 'Gardien de seuil', enemies: ['gardien', 'scorpion'] },
    ]),
    locked: (g) => {
      if (!g.puzzle.solved) return 'Le seuil est scellé : active les trois pierres dans le bon ordre.';
      return g.cleared.cour1 ? null : 'Le Gardien de seuil garde la porte.';
    },
  },
  sanctuaire: {
    name: 'Sanctuaire intérieur', next: null, ...grid('sanctuaire'),
    objects: placed('sanctuaire', [{ id: 'lahama', type: 'boss', label: 'Lahama faussé', enemies: ['lahama'] }]),
    locked: () => null,
  },
};
export const ZONE_ORDER = ['quais', 'marche', 'cour', 'sanctuaire'];

export function createGame(settings = {}) {
  const g = {
    zoneId: 'quais', pos: null, party: createParty(), inventory: createInventory(), quest: createQuest(),
    puzzle: createPuzzle(SOLUTION), settings: { atbMode: 'wait', ...settings }, checkpointId: null, cleared: {}, artefact: false,
  };
  enterZone(g, 'quais');
  return g;
}

export function enterZone(g, zoneId) {
  g.zoneId = zoneId;
  g.pos = { ...ZONES[zoneId].spawn };
  g.facing = { dx: 0, dy: -1 };
  g.checkpointId = zoneId;
  g.puzzle.input = [];
  for (const p of g.party) p.hp = p.hpMax;
  return { type: 'zone', zoneId };
}

export const objectsIn = (g) => ZONES[g.zoneId].objects.filter((o) => !g.cleared[o.id]);

export function move(g, dx, dy) {
  const zone = ZONES[g.zoneId];
  const x = g.pos.x + dx, y = g.pos.y + dy;
  g.facing = { dx, dy };
  const ch = zone.map[y]?.[x];
  if (ch === 'E') {
    const message = zone.locked(g);
    return message ? { moved: false, event: { type: 'blocked', message } } : { moved: true, event: enterZone(g, zone.next) };
  }
  if (ch !== '.' || objectsIn(g).some((o) => o.x === x && o.y === y)) return { moved: false };
  g.pos = { x, y };
  return { moved: true };
}

const DUMUZI_FIRST = [
  'Dumuzi-abzu : Des pillards ont volé la tablette du destin fendu dans l’E-abzu, le temple d’Enki.',
  'Ses signes viennent « d’en haut » : même nos scribes ne savent pas les lire.',
  'Le seuil du sanctuaire s’ouvre par trois pierres : l’eau de l’Abzu, puis l’étoile d’An, enfin le roseau du scribe.',
  'Prenez ces potions. La cour du temple est à l’est du marché.',
];

export function facingObject(g) {
  const { dx, dy } = g.facing;
  return objectsIn(g).find((o) => o.x === g.pos.x + dx && o.y === g.pos.y + dy) ?? null;
}

export function interact(g) {
  const o = facingObject(g);
  if (!o) return null;
  if (o.type === 'encounter' || o.type === 'boss') {
    return { type: 'battle', encounterId: o.id, enemies: o.enemies, boss: o.type === 'boss', label: o.label };
  }
  if (o.type === 'npc') {
    const first = acceptFromDumuzi(g.quest);
    g.inventory.potions = MAX_POTIONS;
    return { type: 'dialog', lines: first ? DUMUZI_FIRST : ['Dumuzi-abzu : L’eau, l’étoile, le roseau. Vos potions sont rechargées.'] };
  }
  if (o.type === 'sign') {
    return { type: 'dialog', lines: ['Inscription : « D’abord l’eau douce de l’Abzu, ensuite l’étoile d’An, enfin le roseau qui écrit. »'] };
  }
  const result = press(g.puzzle, o.symbol);
  const message = {
    progress: `La pierre de ${SYMBOL_NAMES[o.symbol]} s’illumine (${g.puzzle.input.length}/3).`,
    already: `La pierre de ${SYMBOL_NAMES[o.symbol]} brille déjà (${g.puzzle.input.length}/3).`,
    reset: `Pierre de ${SYMBOL_NAMES[o.symbol]} : mauvais ordre, les pierres s’éteignent.`,
    solved: 'Les trois pierres brillent : le seuil du sanctuaire s’ouvre.',
  }[result];
  return { type: 'puzzle', result, symbol: o.symbol, message };
}

export function resolveBattle(g, { encounterId, outcome, xpReward }) {
  if (outcome !== 'victory') return { type: 'defeat' };
  g.cleared[encounterId] = true;
  for (const p of g.party) p.hp = Math.max(1, p.hp);
  const levelUps = g.party.filter((p) => gainXp(p, xpReward).levelsGained > 0).map((p) => p.name);
  if (encounterId === 'lahama') {
    pickupTablet(g.quest);
    addItem(g.inventory, 'tablette');
    return { type: 'ending' };
  }
  return { type: 'victory', levelUps };
}

export function completeChapter(g) {
  returnTablet(g.quest);
  takeQuestKey(g.inventory);
  g.artefact = true;
  return [
    'Lahama faussé s’effondre. La tablette du destin fendu est à vous.',
    'De retour à l’E-abzu, Dumuzi-abzu reçoit la tablette.',
    'Sous elle, un petit disque froid luit d’une lumière sans soleil. Personne ne sait l’expliquer.',
    '(Fiction : cet artefact est inventé ; il n’a aucun fondement historique.)',
  ];
}

export function objective(g) {
  const z = g.zoneId;
  if (z === 'quais') return g.cleared.quais1 && g.cleared.quais2 ? 'Rejoindre le marché (sortie est)' : 'Chasser les pillards des quais';
  if (z === 'marche') return g.quest.state === QUEST.NOT_STARTED ? 'Parler à Dumuzi-abzu au marché' : 'Aller à la cour du temple (sortie est)';
  if (z === 'cour') {
    if (!g.puzzle.solved) return 'Activer les 3 pierres dans l’ordre (lire l’inscription)';
    return g.cleared.cour1 ? 'Entrer dans le sanctuaire (porte nord)' : 'Vaincre le Gardien de seuil';
  }
  return g.quest.state === QUEST.COMPLETED ? 'Chapitre 1 terminé' : 'Affronter Lahama faussé et reprendre la tablette';
}
