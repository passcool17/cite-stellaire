// Calage des grilles de marche sur les fonds peints (même méthode pour les 4 zones).
// Entrées : polygones Créa (assets/calage/*-zones.json) + ajustements (assets/calage/ajustements.json).
// Sortie  : src/core/calage-data.js (cartes, origines, apparitions, sorties, positions des objets).
// Règle   : case marchable ⇔ centre dans un polygone Créa et hors des rectangles « blocked », ou listé dans « extra ».
// La grille est alignée pour qu'un centre de case tombe sur l'apparition. Usage : node scripts/calage.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const CAL_DIR = new URL('assets/calage/', ROOT);
export const OUT = new URL('src/core/calage-data.js', ROOT);
export const ZONE_IDS = ['quais', 'marche', 'cour', 'sanctuaire'];

export const inPoly = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
export const inRect = ([rx, ry, rw, rh], x, y) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;

export const readJson = (name) => JSON.parse(readFileSync(new URL(name, CAL_DIR), 'utf8'));
export const ajustements = () => readJson('ajustements.json');

export function propose(cal, adj) {
  const w = adj.tile, h = w / 2, [sx, sy] = adj.spawn;
  const P = (x, y) => [sx + ((x - y) * w) / 2, sy + ((x + y) * h) / 2];
  const toRel = ([px, py], what) => {
    const u = (px - sx) / (w / 2), v = (py - sy) / (h / 2);
    const x = (u + v) / 2, y = (v - u) / 2;
    if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error(`${what} [${px},${py}] hors grille (pas de ${w / 2}×${h / 2} depuis l'apparition)`);
    return { x, y };
  };
  const blocked = (px, py) => adj.blocked.some((r) => inRect(r, px, py));
  const cells = new Map();
  const R = 30;
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) {
    const [px, py] = P(x, y);
    if (cal.walkable_polygons.some((p) => inPoly(p.points, px, py)) && !blocked(px, py)) cells.set(`${x},${y}`, { x, y });
  }
  for (const p of adj.extra) { const c = toRel(p, 'extra'); cells.set(`${c.x},${c.y}`, c); }
  const exit = adj.exit ? toRel(adj.exit, 'exit') : null;
  const objects = Object.fromEntries(Object.entries(adj.objects).map(([id, p]) => [id, toRel(p, id)]));
  for (const c of [{ x: 0, y: 0 }, ...Object.values(objects)]) cells.set(`${c.x},${c.y}`, c); // objets et apparition posés sur du sol
  // On ne garde que le sol relié à l'apparition (4-voisinage) : pas d'îlots inaccessibles.
  const seen = new Set(['0,0']), queue = [{ x: 0, y: 0 }];
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (cells.has(k) && !seen.has(k)) { seen.add(k); queue.push(cells.get(k)); }
    }
  }
  for (const k of [...cells.keys()]) if (!seen.has(k)) cells.delete(k);
  const all = [...cells.values(), ...(exit ? [exit] : [])];
  const minX = Math.min(...all.map((c) => c.x)), maxX = Math.max(...all.map((c) => c.x));
  const minY = Math.min(...all.map((c) => c.y)), maxY = Math.max(...all.map((c) => c.y));
  const map = [];
  for (let y = minY; y <= maxY; y++) {
    let r = '';
    for (let x = minX; x <= maxX; x++) r += exit && exit.x === x && exit.y === y ? 'E' : cells.has(`${x},${y}`) ? '.' : '#';
    map.push(r);
  }
  const g = (c) => ({ x: c.x - minX, y: c.y - minY });
  const [ox, oy] = P(minX, minY);
  return {
    map, origin: { x: ox, y: oy }, tile: { w, h }, spawn: g({ x: 0, y: 0 }), exit: exit && g(exit),
    objects: Object.fromEntries(Object.entries(objects).map(([id, c]) => [id, g(c)])),
    corridor: adj.extra.map((p) => g(toRel(p, 'extra'))), painted: adj.painted ?? [],
  };
}

export function generate() {
  const adj = ajustements();
  const data = Object.fromEntries(ZONE_IDS.map((id) => [id, propose(readJson(adj[id].zones), adj[id])]));
  return `// GÉNÉRÉ par scripts/calage.mjs depuis assets/calage/ — ne pas éditer à la main.\n// Recaler : modifier assets/calage/ajustements.json puis \`node scripts/calage.mjs --write\`.\nexport const CALAGE = ${JSON.stringify(data, null, 1)};\n`;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const src = generate();
  if (process.argv.includes('--write')) { writeFileSync(OUT, src); console.log('écrit', OUT.pathname); }
  else console.log(src);
}
