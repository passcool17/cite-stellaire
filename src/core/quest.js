// Quête « Rapporter la tablette du destin fendu » + énigme des 3 symboles.
export const QUEST = {
  NOT_STARTED: 'NOT_STARTED', ACCEPTED: 'ACCEPTED', TABLET_HELD: 'TABLET_HELD', COMPLETED: 'COMPLETED',
};

export const createQuest = () => ({ state: QUEST.NOT_STARTED });

function advance(q, from, to) {
  if (q.state !== from) return false;
  q.state = to;
  return true;
}

export const acceptFromDumuzi = (q) => advance(q, QUEST.NOT_STARTED, QUEST.ACCEPTED);
export const pickupTablet = (q) => advance(q, QUEST.ACCEPTED, QUEST.TABLET_HELD);
export const returnTablet = (q) => advance(q, QUEST.TABLET_HELD, QUEST.COMPLETED);

export const createPuzzle = (solution) => ({ solution, input: [], solved: false });

export function press(p, symbol) {
  if (p.solved) return 'solved';
  if (p.input.includes(symbol)) return 'already'; // pierre déjà allumée : double appui sans effet
  if (p.solution[p.input.length] !== symbol) {
    p.input = [];
    return 'reset';
  }
  p.input.push(symbol);
  p.solved = p.input.length === p.solution.length;
  return p.solved ? 'solved' : 'progress';
}
