// Outils de test : storage mémoire, déplacement BFS, IA de combat simple.
import { ZONES, move, objectsIn } from '../src/core/world.js';
import { createBattle, update, readyAllies, act as actRaw } from '../src/core/battle.js';

export const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Chemin (liste de directions) vers une case cible ou adjacente à une cible, avec les vraies règles de `move`.
export function pathTo(game, goal, { adjacent }) {
  const zone = ZONES[game.zoneId];
  const blocked = new Set(objectsIn(game).map((o) => `${o.x},${o.y}`));
  const start = `${game.pos.x},${game.pos.y}`;
  const prev = new Map([[start, null]]);
  const queue = [[game.pos.x, game.pos.y]];
  const isGoal = (x, y) => adjacent ? Math.abs(x - goal.x) + Math.abs(y - goal.y) === 1 : x === goal.x && y === goal.y;
  while (queue.length) {
    const [x, y] = queue.shift();
    if (isGoal(x, y)) {
      const dirs = [];
      for (let k = `${x},${y}`; prev.get(k); k = prev.get(k).from) dirs.unshift(prev.get(k).dir);
      return dirs;
    }
    for (const d of DIRS) {
      const nx = x + d[0], ny = y + d[1], k = `${nx},${ny}`;
      const ch = zone.map[ny]?.[nx];
      if (prev.has(k) || !ch || !'.E'.includes(ch) || blocked.has(k)) continue;
      if (ch === 'E' && !(nx === goal.x && ny === goal.y)) continue;
      prev.set(k, { from: `${x},${y}`, dir: d });
      queue.push([nx, ny]);
    }
  }
  return null;
}

export function walk(game, dirs) {
  let last;
  for (const [dx, dy] of dirs) last = move(game, dx, dy);
  return last;
}

export function walkToObject(game, id) {
  const obj = objectsIn(game).find((o) => o.id === id);
  if (!obj) throw new Error(`objet ${id} absent de ${game.zoneId}`);
  const dirs = pathTo(game, obj, { adjacent: true });
  if (!dirs) throw new Error(`objet ${id} inaccessible`);
  walk(game, dirs);
  move(game, Math.sign(obj.x - game.pos.x), Math.sign(obj.y - game.pos.y)); // se tourner vers l'objet
}

export function walkToExit(game) {
  const dirs = pathTo(game, ZONES[game.zoneId].exit, { adjacent: false });
  if (!dirs) throw new Error(`sortie de ${game.zoneId} inaccessible`);
  return walk(game, dirs);
}

// IA simple (skills:false = attaques normales + potions seulement) : soigne si un allié < 40 %, sinon compétence offensive / attaque sur l'ennemi le plus faible.
export function autoFight(game, enemies, { atbMode = 'wait', maxMs = 20 * 60 * 1000, skills = true } = {}) {
  const b = createBattle({ party: game.party, enemies, inventory: game.inventory, atbMode, rng: mulberry(7) });
  b.heroActions = 0;
  const act = (...args) => { if (actRaw(...args).ok) b.heroActions += 1; };
  for (let t = 0; t < maxMs && !b.outcome; t += 100) {
    const ready = readyAllies(b);
    update(b, 100, { menuOpen: ready.length > 0 });
    for (const h of readyAllies(b)) {
      const target = b.enemies.filter((e) => e.hp > 0).sort((a, c) => a.hp - c.hp)[0];
      const hurt = b.party.filter((p) => p.hp > 0 && p.hp < p.hpMax * 0.4);
      if (skills && hurt.length && h.skills[0] === 'soin_me') act(b, h.id, { type: 'skill' });
      else if (hurt.length && b.inventory.potions > 0) act(b, h.id, { type: 'item', targetId: hurt[0].id });
      else if (skills && h.skills[0] === 'visee') act(b, h.id, { type: 'skill', targetId: target?.id });
      else act(b, h.id, { type: 'attack', targetId: target?.id });
    }
  }
  return b;
}

export function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cases libres voisines d'un objet (sol, sans objet) : là où le héros peut se tenir pour lui faire face.
export function freeNeighbors(game, id) {
  const obj = objectsIn(game).find((o) => o.id === id);
  const taken = new Set(objectsIn(game).map((o) => `${o.x},${o.y}`));
  return DIRS.map(([dx, dy]) => ({ x: obj.x - dx, y: obj.y - dy, dx, dy }))
    .filter((c) => ZONES[game.zoneId].map[c.y]?.[c.x] === '.' && !taken.has(`${c.x},${c.y}`));
}

// Place le héros sur une case libre voisine de l'objet et le tourne vers lui (le pas est bloqué par l'objet).
export function faceObject(game, id, which = 0) {
  const c = freeNeighbors(game, id)[which];
  if (!c) throw new Error(`aucune case libre à côté de ${id}`);
  game.pos = { x: c.x, y: c.y };
  move(game, c.dx, c.dy);
  return c;
}
