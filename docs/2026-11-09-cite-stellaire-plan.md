# Cité Stellaire — Plan d’implémentation (Chapitre 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **Devis source :** `docs/2026-11-09-cite-stellaire-design.md` (approuvé par Pascal, 9 nov 2026 ~16h05 America/Toronto, avec ATB/jauges).  
> **Commit/push/GitHub/publication :** **INTERDITS** pour ce plan — tout reste local sous `/workspace/games/cite-stellaire/`. Remplacer tout « commit » habituel par un **checkpoint local** (fichiers + tests verts).

**Goal :** Livrer un Chapitre 1 jouable (~20–30 min) : exploration isométrique Eridu (4 zones), combat ATB Attente/Actif, boss Lahama 2 phases, sauvegarde `localStorage`, HTML autonome en `file://`.

**Architecture :** Logique pure (`src/core/`) sans Phaser — testée en TDD (`node --test`). Couche Phaser 3 (`src/phaser/`) pour scènes, rendu iso, UI et contrôles. Build → `dist/` (ou racine) avec `phaser.min.js` vendored + `index.html` jouable sans serveur.

**Tech Stack :** JavaScript ESM, Phaser 3 (fichier local), `node --test` + `assert`, placeholders canvas/géométrie, éventuellement esbuild pour un bundle unique (optionnel si scripts locaux suffisent en `file://`).

## Global Constraints

- Portée = **Chapitre 1 seulement** (devis) ; chapitres 2–6 hors périmètre.
- Combat = **ATB** (approche B) : jauges alliés + ennemis ; **Attente** défaut ; **Actif** dans réglages.
- Trio **Tishra / Nerû / Balum** ; quête « **Rapporter la tablette du destin fendu** » ; PNJ **Dumuzi-abzu**.
- Note titre : mythe mésopotamien ≠ fiction SF (pas de « Anunnaki aliens » comme fait).
- Aucun élément protégé type Final Fantasy (noms, musiques, cristaux, mascottes).
- Contrôles **clavier + tactile** ; preuves navigateur incluant **largeur 360**.
- Médias Créa/SUNO/Voix = placeholders géométriques jusqu’à livraison ; pack précis listé en fin de plan.
- Racine travail : `/workspace/games/cite-stellaire/` uniquement.

---

## Structure de fichiers (cible)

```
/workspace/games/cite-stellaire/
  README.md
  GAME.md
  docs/2026-11-09-cite-stellaire-design.md
  docs/2026-11-09-cite-stellaire-plan.md
  package.json                 # type:module, scripts test/build
  index.html                   # entrée file:// (post-build ou source)
  vendor/phaser.min.js
  src/core/
    atb.js                     # moteur jauges
    combat.js                  # actions, dégâts, défense, phases Lahama
    party.js                   # héros, XP, niveaux 1–3, compétences
    inventory.js               # objets + clé de quête
    quest.js                   # états quête + énigme 3 symboles
    save.js                    # sérialisation + API localStorage (façade)
  src/phaser/
    main.js
    scenes/BootScene.js
    scenes/TitleScene.js
    scenes/ExploreScene.js
    scenes/BattleScene.js
    scenes/EndingScene.js
    ui/Hud.js
    ui/TouchControls.js
    ui/AtbBars.js
  assets/placeholders/         # formes générées ou PNG simples
  tests/
    atb.test.js
    combat.test.js
    party.test.js
    inventory.test.js
    quest.test.js
    save.test.js
```

---

### Task 1: Scaffold local + runner de tests

**Files:**
- Create: `package.json`, `tests/smoke.test.js`
- Create: dossiers `src/core/`, `src/phaser/`, `tests/`, `vendor/`, `assets/placeholders/`

**Interfaces:**
- Consumes: —  
- Produces: `npm test` → `node --test tests/**/*.test.js`

- [ ] **Step 1: Écrire le test fumée qui échoue**

```js
// tests/smoke.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('scaffold ok', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 2: Créer `package.json`**

```json
{
  "name": "cite-stellaire",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/**/*.test.js",
    "build": "node scripts/build.mjs"
  }
}
```

- [ ] **Step 3: Lancer les tests**

Run: `cd /workspace/games/cite-stellaire && npm test`  
Expected: PASS (smoke).

- [ ] **Step 4: Checkpoint local** — structure de dossiers présente ; pas de git.

---

### Task 2: Moteur ATB (TDD)

**Files:**
- Create: `src/core/atb.js`
- Test: `tests/atb.test.js`

**Interfaces:**
- Produces:
  - `createFighter({ id, speed, gaugeMax? })` → `{ id, speed, gauge, gaugeMax, ready }`
  - `tick(fighters, dtMs, { frozen })` → met à jour jauges si `!frozen` ; `ready` si `gauge >= gaugeMax`
  - `consume(fighter)` → remet `gauge` à 0, `ready` false
  - `setSpeed(fighter, speed)`

- [ ] **Step 1: Tests qui échouent**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFighter, tick, consume, setSpeed } from '../src/core/atb.js';

test('jauge se remplit selon speed', () => {
  const a = createFighter({ id: 'a', speed: 50, gaugeMax: 100 });
  tick([a], 1000, { frozen: false });
  assert.ok(a.gauge > 0);
  assert.equal(a.ready, false);
});

test('ready quand pleine ; consume remet à 0', () => {
  const a = createFighter({ id: 'a', speed: 100, gaugeMax: 100 });
  tick([a], 2000, { frozen: false });
  assert.equal(a.ready, true);
  consume(a);
  assert.equal(a.gauge, 0);
  assert.equal(a.ready, false);
});

test('frozen = Attente : aucune jauge n’avance', () => {
  const a = createFighter({ id: 'a', speed: 100, gaugeMax: 100 });
  tick([a], 5000, { frozen: true });
  assert.equal(a.gauge, 0);
});

test('ennemis aussi sur jauge ; speed plus haute remplit plus vite', () => {
  const slow = createFighter({ id: 's', speed: 20, gaugeMax: 100 });
  const fast = createFighter({ id: 'f', speed: 80, gaugeMax: 100 });
  tick([slow, fast], 500, { frozen: false });
  assert.ok(fast.gauge > slow.gauge);
});

test('setSpeed accélère (phase rage Lahama)', () => {
  const b = createFighter({ id: 'boss', speed: 40, gaugeMax: 100 });
  setSpeed(b, 80);
  tick([b], 500, { frozen: false });
  const g1 = b.gauge;
  const b2 = createFighter({ id: 'boss2', speed: 40, gaugeMax: 100 });
  tick([b2], 500, { frozen: false });
  assert.ok(g1 > b2.gauge);
});
```

- [ ] **Step 2: Run — FAIL** (`Cannot find module`)

- [ ] **Step 3: Implémenter `src/core/atb.js`** — `gauge += speed * (dtMs/1000)` plafonné à `gaugeMax` ; si `frozen`, no-op.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Checkpoint local**

---

### Task 3: Dégâts, actions, Lahama 2 phases (TDD)

**Files:**
- Create: `src/core/combat.js`
- Test: `tests/combat.test.js`

**Interfaces:**
- Consumes: fighters ATB  
- Produces:
  - `applyAttack(attacker, target, { defending })` → `{ damage }`
  - `applySkill(user, target, skillId)`  
  - `applyItem(user, target, itemId)`  
  - `startDefend(fighter)` / `clearDefend(fighter)`  
  - `createLahama()` → boss avec `phase: 1|2`, `onDamaged` passe en phase 2 sous 50% PV et appelle accélération speed  
  - `enemyChooseAction(enemy, party)` → action simple (attaque / skill)

Formule ch.1 (fixe) : `damage = max(1, atk - def/2)` ; si `defending`, dégâts × 0.5 (arrondi bas).

- [ ] **Step 1: Tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAttack, startDefend, clearDefend, createLahama
} from '../src/core/combat.js';

test('attaque inflige au moins 1', () => {
  const r = applyAttack({ atk: 10 }, { def: 100, hp: 50 }, { defending: false });
  assert.equal(r.damage, 1);
});

test('défense réduit les dégâts de moitié', () => {
  const t = { def: 0, hp: 40 };
  startDefend(t);
  const r = applyAttack({ atk: 20 }, t, { defending: true });
  assert.equal(r.damage, 10);
  clearDefend(t);
});

test('Lahama passe phase 2 sous 50% et speed double', () => {
  const boss = createLahama();
  assert.equal(boss.phase, 1);
  const half = Math.floor(boss.hpMax / 2);
  boss.hp = half;
  boss.onDamaged();
  assert.equal(boss.phase, 2);
  assert.ok(boss.speed >= boss.baseSpeed * 2);
});
```

- [ ] **Step 2–4:** FAIL → implémenter → PASS → checkpoint

---

### Task 4: Party XP / niveaux / compétences (TDD)

**Files:**
- Create: `src/core/party.js`
- Test: `tests/party.test.js`

**Interfaces:**
- Produces: `createParty()` → Tishra (tank), Nerû (mage), Balum (dps) niveau 1 ; `gainXp(member, amount)` ; niveaux **1→3 max** ; à chaque niveau : +stats + débloque **1 compétence** (`taunt` / `soin_me` / `visee`).

- [ ] **Step 1: Tests** — création trio ; XP jusqu’au niveau 2 débloque skill ; plafonne à 3.

- [ ] **Step 2–4:** FAIL → implémenter → PASS → checkpoint

---

### Task 5: Inventaire (TDD)

**Files:**
- Create: `src/core/inventory.js`
- Test: `tests/inventory.test.js`

**Interfaces:**
- Produces: `createInventory()` avec jusqu’à 3 `potion` + slot `questKey` ; `addItem` / `usePotion(target)` soigne +30 PV (cap hpMax) ; `hasQuestKey` / `takeQuestKey`.

- [ ] Tests → impl → PASS → checkpoint

---

### Task 6: Quête + énigme 3 symboles (TDD)

**Files:**
- Create: `src/core/quest.js`
- Test: `tests/quest.test.js`

**Interfaces:**
- Produces:
  - États : `NOT_STARTED | ACCEPTED | TABLET_HELD | COMPLETED`
  - `acceptFromDumuzi()`, `pickupTablet()`, `returnTablet()`  
  - Énigme temple : `createPuzzle(['eau','etoile','roseau'])` ; `press(symbol)` ; `solved` si ordre exact ; `reset` si erreur

- [ ] Tests ordre correct / incorrect / quête bout-en-bout → impl → PASS → checkpoint

---

### Task 7: Sauvegarde localStorage (TDD + façade)

**Files:**
- Create: `src/core/save.js`
- Test: `tests/save.test.js`

**Interfaces:**
- Produces: `serialize(state)` / `deserialize(json)` purs ; `saveTo(storage, key, state)` / `loadFrom(storage, key)` où `storage` = `{ getItem, setItem }` (mock en test, `localStorage` en jeu).  
- Contenu : zoneId, party, inventory, quest, puzzle, settings `{ atbMode: 'wait'|'active' }`, checkpointId.

- [ ] Tests round-trip + clé absente → `null` → impl → PASS → checkpoint  
- Points de save jeu : début de zone + avant boss (câblés en Task 10–11).

---

### Task 8: Vendor Phaser + coquille HTML file://

**Files:**
- Create: `index.html`, `src/phaser/main.js`, `src/phaser/scenes/BootScene.js`
- Add: `vendor/phaser.min.js` (télécharger Phaser 3 officiel localement, **pas** de CDN runtime requis)

**Interfaces:**
- Produces: ouverture `file:///workspace/games/cite-stellaire/index.html` affiche canvas noir + texte « Boot OK ».

- [ ] **Step 1:** Copier Phaser 3 minifié dans `vendor/phaser.min.js` (wget/curl depuis release officielle vers le disque local).

- [ ] **Step 2:** `index.html` charge `vendor/phaser.min.js` puis `src/phaser/main.js` en `<script type="module">` **ou** bundle unique via `scripts/build.mjs` si modules ESM bloqués en `file://` (préférer build → un seul `dist/index.html` + `dist/game.js` + `dist/vendor/phaser.min.js`).

- [ ] **Step 3:** Preuve navigateur : canvas visible, pas d’erreur console CORS.

- [ ] **Step 4: Checkpoint local**

---

### Task 9: TitleScene — note mythe / fiction + réglages ATB

**Files:**
- Create: `src/phaser/scenes/TitleScene.js`
- Modify: `src/phaser/main.js` (enregistrer scènes)

- [ ] Afficher titre *Cité Stellaire*, bouton Jouer, bouton Réglages (Attente/Actif).  
- [ ] Note fixe visible : « Cadre mésopotamien et mythes Anunna documentés ; toute lecture extraterrestre est de la **fiction**, pas un fait historique. »  
- [ ] Persister `atbMode` via façade save.  
- [ ] Preuve : lecture note + bascule mode avant de lancer.

---

### Task 10: ExploreScene — 4 zones iso + HUD + contrôles

**Files:**
- Create: `src/phaser/scenes/ExploreScene.js`, `src/phaser/ui/Hud.js`, `src/phaser/ui/TouchControls.js`
- Create: placeholders géométriques (rects/losanges) pour sol, eau, murs

**Zones :** `quais` → `marche` → `cour` → `sanctuaire`  
- Rencontres 1–2 sur quais (déclenche BattleScene).  
- Marché : dialogue Dumuzi-abzu → `acceptFromDumuzi`.  
- Cour : énigme 3 symboles (boutons UI).  
- Sanctuaire : save auto avant boss + lance combat Lahama.  
- HUD : objectif quête + mini-carte (4 pastilles) + PV équipe.  
- Clavier : flèches/ZQSD, Entrée/Espace interagir, Esc menu.  
- Tactile : pad virtuel + bouton Action.

- [ ] Preuve : traverser les 4 zones au clavier ; même parcours au tactile (DevTools 360px).

---

### Task 11: BattleScene — ATB visible Attente/Actif + ennemis

**Files:**
- Create: `src/phaser/scenes/BattleScene.js`, `src/phaser/ui/AtbBars.js`

- [ ] Brancher `tick` chaque frame ; si menu ouvert et `atbMode==='wait'` → `frozen:true`.  
- [ ] Jauges visibles alliés **et** ennemis.  
- [ ] Menus Attaque / Compétence / Objet / Défense (clavier + boutons tactiles).  
- [ ] Victoire → XP (`gainXp`) + retour Explore ; défaite → reload checkpoint save.  
- [ ] Tutoriel optionnel au marché : 1 pillard.  
- [ ] Preuve : mode Attente = jauges figées pendant menu ; mode Actif = elles avancent ; smoke 360px.

---

### Task 12: Boss Lahama + EndingScene

**Files:**
- Create: `src/phaser/scenes/EndingScene.js`
- Modify: `BattleScene.js` (flag boss)

- [ ] Phase 1 armure (def haute) ; ≤50% PV → phase 2 (`setSpeed` ×2), feedback visuel (teinte rouge).  
- [ ] Victoire → `pickupTablet` si besoin + `returnTablet` via cutscene texte → artefact stellaire **non expliqué**.  
- [ ] EndingScene : résumé ch.1 + rappel mythe≠fiction + « Fin du chapitre 1 ».  
- [ ] Preuve : boss vaincu au moins une fois ; fin atteinte.

---

### Task 13: Build file:// + preuves navigateur finales

**Files:**
- Create: `scripts/build.mjs` (copie/bundle vers `dist/` si utilisé)
- Modify: `README.md`, `GAME.md` (état → jouable ch.1 quand fait)

**Preuves obligatoires (checklist) :**
- [ ] Parcours complet ch.1 ≤ 30 min (quais→marché→cour→boss→fin).  
- [ ] Sauvegarde / reprise après rechargement `file://`.  
- [ ] Jauges visibles + mode Attente vérifié.  
- [ ] Clavier + tactile OK.  
- [ ] Fenêtre **360×640** (ou largeur 360) : HUD et menus utilisables.  
- [ ] Aucune dépendance réseau runtime (Phaser local).  
- [ ] Checkpoint local final — **pas** de push/publication.

---

### Task 14: Pack médias précis à demander (Créa / SUNO / Voix)

**Ne pas générer ici** — documenter la commande exacte pour agents médias.

#### Créa (visuels)
| Asset | Spec |
|-------|------|
| Tileset iso Eridu | 128×64 losange ; atlas PNG ; tuiles : sol brique, canal turquoise, digue, mur temple, porte, roseau (min. 12 tuiles) |
| Héros ×3 | Spritesheet 32×48 (ou 48×48) ; frames : idle×2, walk×4, cast×2, hit×1 ; palette lapis/ocre/or |
| Ennemis ×4 | 48×48 ; idle×2 + attack×2 chacun |
| Boss Lahama | 96×96 ; idle×2, attack×2, rage×2 |
| Portraits ×3 | 96×96 |
| UI | coin cadre, pastilles mini-carte, icônes Attaque/Compétence/Objet/Défense 32×32 |
| Fond titre | 1280×720 concept-compatible |

#### SUNO (musique)
| Piste | Durée | Usage |
|-------|-------|--------|
| Exploration Eridu | **90–120 s**, bouclable, instrumental, ~90–110 BPM | ExploreScene |
| Tension temple / boss | **60–90 s**, bouclable, plus sombre | Cour + Battle boss |

#### Voix (SFX)
| SFX | Durée | Note |
|-----|-------|------|
| Pas | 0,15–0,25 s | bouclable léger |
| Coup / hit | 0,2–0,4 s | |
| Sort *me* | 0,4–0,8 s | pas de voix humaine |
| Victoire | 1,0–1,5 s | |
| Porte / symbole | 0,3–0,5 s | |
| UI select | 0,05–0,1 s | |

Fichiers cibles prévus : `assets/audio/`, `assets/sprites/` (remplacent placeholders sans changer les clés Phaser).

---

## Couverture devis → tâches

| Exigence devis | Task |
|----------------|------|
| ATB jauges + Attente/Actif | 2, 9, 11 |
| 4 zones Eridu + quête + énigme | 6, 10 |
| Ennemis + Lahama 2 phases | 3, 11, 12 |
| XP 1–3, inventaire, save | 4, 5, 7, 10 |
| Titre mythe/fiction | 9, 12 |
| Clavier + tactile + 360 | 10, 11, 13 |
| HTML file:// autonome | 8, 13 |
| Placeholders puis pack médias | 10, 14 |
| Pas FF / pas publication | Global + 13 |

## Estimation

**~18–28 h** (≈ 4–6 demi-journées) : ~8 h core TDD, ~10–14 h Phaser/UI/contrôles, ~2–4 h preuves navigateur + polish placeholders.

## Hors plan

Chapitres 2–6, GitHub Pages, dépôt distant, médias finaux (seulement la liste Task 14), craft, multi, cloud.
