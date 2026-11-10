// Trio fictif, XP et niveaux 1→3. Le niveau 2 débloque la compétence du héros.
export const XP_LEVELS = [0, 30, 80]; // XP cumulée requise pour les niveaux 1, 2, 3

const HEROES = [
  { id: 'tishra', name: 'Tishra', role: 'tank', hpMax: 70, atk: 12, def: 10, speed: 22, skill: 'taunt', grow: { hpMax: 12, atk: 3, def: 2 } },
  { id: 'neru', name: 'Nerû', role: 'mage', hpMax: 45, atk: 8, def: 4, speed: 28, skill: 'soin_me', grow: { hpMax: 8, atk: 2, def: 1 } },
  { id: 'balum', name: 'Balum', role: 'dps', hpMax: 55, atk: 15, def: 6, speed: 34, skill: 'visee', grow: { hpMax: 10, atk: 4, def: 1 } },
];

export function createParty() {
  return HEROES.map(({ grow, ...h }) => ({ ...h, hp: h.hpMax, level: 1, xp: 0, skills: [] }));
}

export function gainXp(member, amount) {
  if (member.hp <= 0) return { levelsGained: 0 };
  member.xp += amount;
  const grow = HEROES.find((h) => h.id === member.id).grow;
  let levelsGained = 0;
  while (member.level < XP_LEVELS.length && member.xp >= XP_LEVELS[member.level]) {
    member.level += 1;
    levelsGained += 1;
    for (const [stat, v] of Object.entries(grow)) member[stat] += v;
    member.hp += grow.hpMax;
    if (!member.skills.includes(member.skill)) member.skills.push(member.skill);
  }
  return { levelsGained };
}
