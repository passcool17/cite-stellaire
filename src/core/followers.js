// File des suiveurs : chaque suiveur prend la case que celui qui le précède vient de quitter.
export const createTrail = (pos, n = 2) => Array.from({ length: n }, () => ({ ...pos }));
export const stepTrail = (trail, leaderPrev) => [{ ...leaderPrev }, ...trail].slice(0, trail.length);

// Arrivée dans une zone : les suiveurs se placent en file derrière le meneur (puis sur les côtés), sur des cases libres.
// isFree(x, y) dit si un suiveur peut s'y tenir ; sans place, un suiveur reste sur la case précédente de la file.
export function spreadTrail(isFree, pos, facing = { dx: 0, dy: -1 }, n = 2) {
  const back = { dx: -facing.dx, dy: -facing.dy };
  const order = [back, { dx: back.dy, dy: back.dx }, { dx: -back.dy, dy: -back.dx }, facing];
  const trail = [], used = new Set([`${pos.x},${pos.y}`]);
  let from = pos;
  for (let i = 0; i < n; i++) {
    const next = order.map((d) => ({ x: from.x + d.dx, y: from.y + d.dy }))
      .find((c) => isFree(c.x, c.y) && !used.has(`${c.x},${c.y}`));
    const c = next ?? { ...from };
    used.add(`${c.x},${c.y}`);
    trail.push(c);
    from = c;
  }
  return trail;
}
