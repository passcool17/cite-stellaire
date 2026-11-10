// Parcours de bout en bout dans Chrome headless (facultatif, hors `npm test`) :
//   PUPPETEER=/chemin/vers/puppeteer-core OUT=verif node scripts/e2e-browser.mjs [fichier.html] [largeur] [hauteur] [touch]
// Joue le chapitre 1 au clavier (chemins calculés par la même BFS que les tests), capture des écrans dans $OUT.
import { mkdirSync } from 'node:fs';
import { pathTo } from '../tests/helpers.js';
import { ZONES } from '../src/core/world.js';

const { default: puppeteer } = await import(process.env.PUPPETEER ?? 'puppeteer-core');
const FILE = process.argv[2] ?? new URL('../dist/Cite-Stellaire-ch1-v3-final.html', import.meta.url).pathname;
const WIDTH = Number(process.argv[3] ?? 1280);
const HEIGHT = Number(process.argv[4] ?? 720);
const TOUCH = process.argv[5] === 'touch';
const OUT = process.env.OUT ?? '/tmp/cs-e2e';
const TAG = `${WIDTH}x${HEIGHT}${TOUCH ? '-tactile' : ''}`;
const PREFIX = process.env.PREFIX ?? 'v3d';
mkdirSync(OUT, { recursive: true });
const KEY = { '0,-1': 'ArrowUp', '1,0': 'ArrowRight', '0,1': 'ArrowDown', '-1,0': 'ArrowLeft' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`file://${FILE}${TOUCH ? '?touch=1' : ''}`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await wait(1500);
const shot = (name) => page.screenshot({ path: `${OUT}/${PREFIX}-${TAG}-${name}.png` });
const state = () => page.evaluate(() => {
  const { game, session } = window.__citeStellaire;
  const active = game.scene.getScenes(true).map((s) => s.sys.settings.key);
  const battle = game.scene.getScene('Battle');
  return { active, g: session.game, mode: battle?.mode, audio: game.sound.context?.state, sfx: game.cache.audio.getKeys() };
});
const press = async (k, ms = 230) => { await page.keyboard.press(k); await wait(ms); };
// À l'arrivée dans une zone : capture normale + grille G, positions des 3 héros, calque avant (profondeur, opacité).
const zoneReport = {};
async function arrive(name) {
  await wait(600);
  await shot(name);
  await press('g', 400); await shot(`${name}-grille-G`); await press('g', 300);
  zoneReport[(await state()).g.zoneId] = await page.evaluate(() => {
    const sc = window.__citeStellaire.game.scene.getScene('Explore');
    const heroes = sc.heroes.map((h) => [Math.round(h.x), Math.round(h.y)]);
    return {
      heroes, distinct: new Set(heroes.map(String)).size,
      fg: sc.fg ? { key: sc.fg.texture.key, depth: sc.fg.depth, alpha: sc.fg.alpha, aboveHeroes: sc.heroes.every((h) => h.depth < sc.fg.depth) } : null,
      glows: Object.keys(sc.glows), sprites: Object.keys(sc.objSprites),
    };
  });
}

await shot('01-titre');
await press('Enter', 800); // Nouvelle partie (premier geste : débloque l'AudioContext)
const report = { audioAfterFirstKey: (await state()).audio, sfxKeys: (await state()).sfx };

async function walk(target, adjacent) {
  const { g } = await state();
  const dirs = pathTo(g, target, { adjacent });
  if (!dirs) throw new Error(`pas de chemin vers ${JSON.stringify(target)} dans ${g.zoneId}`);
  for (const d of dirs) await press(KEY[d.join(',')]);
  if (adjacent) {
    const { g: g2 } = await state();
    await press(KEY[[Math.sign(target.x - g2.pos.x), Math.sign(target.y - g2.pos.y)].join(',')]);
  }
}

const shots = {};
async function fightUntilDone(tag) {
  let actions = 0;
  for (let i = 0; i < 2000; i++) {
    const s = await state();
    if (!s.active.includes('Battle')) return actions;
    if (s.mode === 'command') {
      await press('Enter', 120); await page.keyboard.press('Enter'); actions++;
      if (tag === 'quais1' && actions === 1) { await wait(200); await shot('03c-combat-attaque'); } // élan + frame d'attaque
      else await wait(120);
      if (tag === 'lahama' && actions === 2) await shot('06-boss');
    } else await wait(100);
    if (tag === 'lahama' && !shots.rage) {
      const phase = await page.evaluate(() => window.__citeStellaire.game.scene.getScene('Battle')?.b?.enemies[0]?.phase);
      if (phase === 2) { shots.rage = true; await wait(700); await shot('06b-boss-rage'); }
    }
  }
  throw new Error('combat trop long');
}

async function talk(id) {
  const zone = ZONES[(await state()).g.zoneId];
  await walk(zone.objects.find((o) => o.id === id), true);
  await press('Enter', 500);
}

async function fight(id) {
  await talk(id);
  if ((await state()).active.includes('Battle') && id === 'quais1') await shot('03-combat');
  const actions = await fightUntilDone(id);
  await wait(2500);
  return actions;
}

await arrive('02-quais');
await fight('quais1');
await fight('quais2');
await walk(ZONES.quais.exit, false); await arrive('03b-marche');
await talk('dumuzi'); for (let i = 0; i < 4; i++) await press('Enter', 200);
report.potionsAfterDumuzi = (await state()).g.inventory.potions;

await fight('tuto');
await walk(ZONES.marche.exit, false); await arrive('04-cour');
await talk('inscription'); await press('Enter');
for (const s of ['eau', 'etoile', 'roseau']) {
  await talk(`pierre-${s}`);
  if (s === 'eau') { await press('Enter'); report.afterDoubleEau = (await state()).g.puzzle.input; }
}
report.puzzleSolved = (await state()).g.puzzle.solved;
await shot('04b-cour-socles-allumes');
await fight('cour1');
report.hudAfterCourFight = await page.evaluate(() => { const sc = window.__citeStellaire.game.scene.getScene('Explore'); return { msgVisible: sc.msgText.visible, msg: sc.msgText.text }; });
await walk(ZONES.cour.exit, false); await arrive('05-sanctuaire');
await page.reload(); await wait(1500); await press('Enter', 1000); // Continuer
report.resumedZone = (await state()).g.zoneId;
report.bossActions = await fight('lahama');
for (let i = 0; i < 30 && !(await state()).active.includes('Ending'); i++) {
  if ((await state()).active.includes('Battle')) report.bossActions += await fightUntilDone('lahama');
  else if ((await state()).g.zoneId === 'sanctuaire' && (await state()).active.includes('Explore')) report.bossActions += await fight('lahama');
  await wait(500);
}
await wait(500);
await shot('07-fin');
report.ending = (await state()).active.includes('Ending');
report.skillLabelWidths = await page.evaluate(() => {
  const sc = window.__citeStellaire.game.scene.getScene('Title');
  return ['Provocation', 'Soin des me d’Enki', 'Visée'].map((n) => sc.add.text(0, 0, `Compétence : ${n}`, { fontFamily: 'Georgia, serif', fontSize: '20px' }).width);
});
report.zones = zoneReport;
report.errors = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
console.log(JSON.stringify(report, null, 1));
await browser.close();
