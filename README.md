# Cité Stellaire — Chapitre 1

RPG façon Final Fantasy (Eridu, mythologie mésopotamienne, combat ATB) en Phaser 3, livré en un seul fichier HTML autonome.

**Jouer :** https://passcool17.github.io/cite-stellaire/ (`index.html` = build v3-final).

Œuvre de fiction. Construire : `npm install && npm test && npm run build` → `dist/Cite-Stellaire-ch1-v3-final.html`.

## Historique : v2 et suivantes

RPG navigateur original (Eridu) — exploration isométrique, combat **ATB** (jauges de temps), trio fictif Tishra / Nerû / Balum.
Cadre mésopotamien et mythes des Anunna documentés ; toute lecture extraterrestre est de la **fiction**, pas un fait historique.

## Jouer

Ouvrir `dist/Cite-Stellaire-ch1-v2.html` directement (`file://`), sans serveur ni réseau : Phaser 3.90.0, les médias (data URI) et le jeu sont intégrés dans ce seul fichier (~2,1 Mo).
`dist/Cite-Stellaire-ch1-prototype.html` = prototype v1 (placeholders, sans son), conservé tel quel.

## Contrôles

| Entrée | Exploration | Combat / menus |
|--------|-------------|----------------|
| ↑ / Z / W | avancer vers le **haut-droite** (↗) | entrée précédente |
| → / D | **bas-droite** (↘) | entrée suivante / cible suivante |
| ↓ / S | **bas-gauche** (↙) | entrée suivante |
| ← / Q / A | **haut-gauche** (↖) | entrée précédente / cible précédente |
| Entrée / Espace | interagir avec la case **en face** (petit point jaune) ; faire défiler un dialogue | valider |
| Échap | menu pause (mode ATB, volume des effets, muet, retour au titre) | retour du choix de cible |
| Tactile | pad en losange ↖↗↙↘ (maintenir pour marcher), bouton **Action**, bouton **Menu** | toucher les boutons ; toucher un ennemi / la ligne d'un allié pour le cibler |

## Développement

```
npm test        # node --test : logique pure + parcours complet simulé + médias + build
npm run build   # → dist/Cite-Stellaire-ch1-v2.html (reproductible)
# facultatif : parcours complet dans Chrome headless, captures dans /tmp/cs-e2e/
PUPPETEER=<chemin vers puppeteer-core> node scripts/e2e-browser.mjs [fichier.html] [largeur]
```

- `src/core/` : logique pure sans Phaser (ATB, combat, Lahama, équipe/XP, inventaire, quête/énigme, sauvegarde, monde/cartes, déroulé de combat).
- `src/phaser/` : scènes Boot / Title / Explore / Battle / Ending, `ui.js` (boutons, panneaux encadrés, barres, menu clavier), `assets.js` (chargement des médias, placeholders, animations), `session.js` (localStorage, réglages, sons/musique).
- `scripts/build.mjs` : esbuild (IIFE) + `vendor/phaser.min.js` + `window.CS_MEDIA` (médias de `assets/media/` en data URI, cf. `scripts/media.mjs`) inline dans un HTML unique. `window.__citeStellaire` expose le jeu pour les vérifications automatisées.
- Dépôt git **local uniquement** (aucun remote, aucune publication).

## Médias

Copiés dans `assets/media/` (le build ne lit que ce dossier) ; la clé Phaser = nom du fichier sans extension.

- **Créa** (`pack-ch1`, manifest copié en `manifest-crea.json`) : `tileset-eridu` (12 frames nommées du manifest), `hero-*` (192×192, frames 48×48 : idle, walk), `enemy-*` (96×96, frames 48×48 : idle), `boss-lahama` (192×288, frames 96×96 : idle, rage), `portrait-*`, `icon-*`, `ui-cadre-coin` (coins miroités), `ui-minimap-*`, `fond-titre` (converti en JPEG q4, 207 Ko au lieu de 1,6 Mo). Pixel art en nearest-neighbor (sauf le fond-titre).
- **Voix** (MP3) : `sfx-step` ← pas_brique, `sfx-hit` ← coup_impact, `sfx-spell` ← sort_magique, `sfx-victory` ← victoire, `sfx-door` ← porte_pierre, `sfx-select` ← selection_ui.
- **Musique** : clés `music-eridu` (quais, marché) et `music-temple` (cour, sanctuaire, combat de Lahama). Déposer `assets/media/music-eridu.mp3` / `music-temple.mp3` puis `npm run build` : lecture en boucle à 30 % ; sans fichier, rien n'est joué.
- Toute clé sans fichier reçoit un placeholder géométrique de même taille (ex. Dumuzi-abzu, pierres, inscription : pas dans le pack).

## Docs

- Devis : `docs/2026-11-09-cite-stellaire-design.md` · Plan : `docs/2026-11-09-cite-stellaire-plan.md` · Notes joueur et limites : `GAME.md`

## v3-moteur : fonds peints et calage de la grille

- Build : `npm run build` → `dist/Cite-Stellaire-ch1-v3-moteur.html` (paysage 1280×720, FIT ; message « tourne ton téléphone » en portrait). Le prototype et la v2 restent intacts (SHA vérifié par `tests/build.test.js`).
- Fonds : `assets/media-peint/zoneN-<nom>.jpg` (1920×1080) remplace le fond uni de la zone ; calque optionnel `zoneN-<nom>-avant.png` dessiné au-dessus des héros. Zone 1 = vraie peinture `zone1-quais` ; zones 2–4 provisoires (couleur unie + tuiles).
- Grille de marche invisible : carte logique dans `src/core/world.js`, calage dans `src/core/layout.js` (`origin` = centre de la case (0,0) en pixels du fond 1920×1080, `tile` = losange).
- Zone 1 : grille 8×13 tirée des polygones Créa `assets/calage/zone1-zones.json` (case marchable ⇔ centre dans un polygone ; sortie dans le rectangle de sortie ; apparition à moins d'une demi-case du point suggéré). `tests/layout.test.js` le vérifie.
- Recaler en jeu : touche **G** (grille, coordonnées de case et du fond sous la souris), **I/J/K/L** déplacent l'origine (±5, Maj ±1), **U/O** changent la taille du losange ; la valeur à recopier dans `layout.js` s'affiche et part dans la console.

## v3 : les 4 scènes peintes

- Build : `npm run build` → `dist/Cite-Stellaire-ch1-v3.html` (≈ 4,2 Mo, test ≤ 4,5 Mo). v3-moteur, v2 et prototype figés (SHA vérifiés par `tests/build.test.js`).
- Nouvelle livraison Créa : `python3 scripts/prepare-peint.py [dossier-pack]` → fonds JPEG q85 en 1280×720 (taille d'affichage), calques avant WebP q85 avec alpha, masques d'alpha (`assets/calage/zoneN-avant-masque.json`), copie des `*-zones.json`. Les sprites du dossier `sprites/` de Créa ne sont pas repris.
- Calage (même méthode pour les 4 zones) : `assets/calage/ajustements.json` (taille du losange, apparition, rectangles retirés — étals, jardins, canaux, médaillons —, couloir vers la sortie, sortie, position des objets, en pixels du fond 1920×1080), puis `node scripts/calage.mjs --write` régénère `src/core/calage-data.js` (cartes, origines, objets). Les tests vérifient que ce fichier est à jour, que chaque case est sur le sol peint, que la sortie est dans le rectangle Créa, qu'aucune case ne met un héros sous le HUD et que le calque avant ne couvre pas plus de la moitié d'un héros sur une case de passage obligatoire.
- En jeu, **G** affiche la grille ; les touches de réglage servent à repérer les valeurs, à reporter ensuite dans `ajustements.json`.

### v3-persos
`python3 scripts/prepare-persos.py` (pack Créa → assets/media-persos), puis `npm test && npm run build` → `dist/Cite-Stellaire-ch1-v3-persos.html`. Voir GAME.md § v3-persos.

### v3-final
Mêmes commandes ; sortie `dist/Cite-Stellaire-ch1-v3-final.html`. Parcours headless : `node scripts/e2e-browser.mjs dist/Cite-Stellaire-ch1-v3-final.html 1280 720` (captures `verif/v3d-*`). Version jouable en ligne : https://passcool17.github.io/cite-stellaire/
