// Moteur ATB : chaque combattant a une jauge qui se remplit selon sa vitesse.
export function createFighter({ gaugeMax = 100, ...props }) {
  return { ...props, gauge: 0, gaugeMax, ready: false };
}

export function tick(fighters, dtMs, { frozen }) {
  if (frozen) return;
  for (const f of fighters) {
    if (f.hp !== undefined && f.hp <= 0) continue;
    f.gauge = Math.min(f.gaugeMax, f.gauge + f.speed * (dtMs / 1000));
    f.ready = f.gauge >= f.gaugeMax;
  }
}

export function consume(fighter) {
  fighter.gauge = 0;
  fighter.ready = false;
}

export function setSpeed(fighter, speed) {
  fighter.speed = speed;
}
