# Cité Stellaire — Notes de jeu (état réel, v2, 9 nov 2026)

## État

**Chapitre 1 v2 jouable** (`dist/Cite-Stellaire-ch1-v2.html`) : visuels du pack Créa, 6 effets sonores Voix, pas de musique. Logique testée (`npm test`) ; parcours complet rejoué automatiquement dans Chrome headless (540 et 360 px de large), sans erreur console.

## Parcours (≈ 10–20 min)

Une étiquette « Action : … » s'affiche au-dessus de l'objet en face du héros.

1. **Quais & canaux** — deux groupes visibles : *Pillards* (passage étroit au centre) et *Pillard et esprit* (devant la sortie est). La sortie (losange doré, bord droit) reste fermée tant qu'ils sont là.
2. **Marché des scribes** — parler au grand prêtre **Dumuzi-abzu** (silhouette blanche, haut du marché) : quête « Rapporter la tablette du destin fendu », indice de l'énigme, potions rechargées (il les recharge à chaque visite). Pillard d'entraînement facultatif (en bas à droite). Sortie à l'est.
3. **Cour du temple (E-abzu)** — lire l'inscription (en bas à gauche), puis activer les pierres dans l'ordre **eau (bleue, gauche) → étoile (dorée, centre) → roseau (verte, droite)**. Une erreur les éteint (le message nomme la pierre pressée) ; re-presser une pierre déjà allumée est sans effet. Vaincre le **Gardien de seuil** (+ scorpion) près de la porte nord, puis entrer.
4. **Sanctuaire intérieur** — sauvegarde automatique, puis **Lahama faussé** au fond (150 PV). Phase 1 : armure (défense 10 ; la *Visée* de Balum l'ignore). Sous 50 % PV : **rage** (animation dédiée, teinte rouge, secousse), jauge 2× plus rapide, armure brisée (défense 4). Combat visé : 6–9 actions de héros avec compétences, ~11–15 aux attaques normales seules.
5. **Fin** — la tablette revient à Dumuzi-abzu ; un disque « à la lumière sans soleil » reste inexpliqué ; rappel mythe ≠ fiction.

## Systèmes

- **ATB** : jauges pour alliés et ennemis selon la vitesse. **Attente** (défaut) : tout se fige pendant qu'un héros choisit. **Actif** : le temps continue. Réglable à l'écran titre et dans le menu pause (mémorisé).
- **Actions** : Attaque, Compétence, Objet (potion +30 PV, max 3), Défense (dégâts ÷2 jusqu'au prochain tour du héros).
- **Niveaux 1→3** (30 et 80 XP). Le niveau 2 débloque : Tishra *Provocation* (attire les coups + défense), Nerû *Soin des me d’Enki* (+25 PV à toute l'équipe ; les *me* sont les pouvoirs divins du mythe sumérien), Balum *Visée* (×1,5, ignore la défense).
- **Sons** : pas, coups, sorts/potions, victoire, portes/pierres, sélection de menu. Menu pause : volume des effets (0–100 %), Muet (mémorisés). Le son démarre au premier geste (déblocage WebAudio de Phaser).
- **Sauvegarde** `localStorage` à l'entrée de chaque zone (équipe soignée) — donc aussi juste avant le boss. Défaite → reprise au dernier point. « Continuer » au titre. Sauvegarde effacée à la fin du chapitre.

## Limites connues

- Pas de musique (clés prêtes) ; Dumuzi-abzu, les 3 pierres et l'inscription restent des placeholders (absents du pack).
- Animations utilisées : idle/walk des héros, idle des ennemis, idle/rage du boss ; cast/hit/attack du pack non branchés (flash blanc à l'impact à la place).
- Pas de retour vers une zone précédente ; progression en ligne droite.
- Les combats gagnés depuis le dernier point de sauvegarde sont perdus si on quitte avant la zone suivante.
- Compétences sans coût (pas de PM) ; une seule compétence par héros ; ennemis : attaque simple uniquement.
- Directions iso : les flèches suivent les axes de la grille (↑ = haut-droite), pas l'écran.
- Si `localStorage` est bloqué par le navigateur en `file://`, la partie fonctionne mais sans reprise après rechargement.

## Prochaines idées (hors ch.1)

Uruk et la course aux *me* ; Nippur et les décrets ; profondeur de l'Abzu ; arc du déluge ; « ciel lié » — uniquement après validation du ch.1.

## État v3-moteur (zone 1 peinte)
- Quais : fond = peinture validée (zone1-quais), grille 8×13 calée sur les polygones Créa ; pillards en (3,4) et (5,1), sortie (7,0) sur la passerelle de droite, apparition (3,6) au centre de la place.
- Limites connues : polygones Créa estimés à la main (bords de canaux et marches ambigus) ; le quai bas-gauche passe sous les médaillons de l'équipe ; pas encore de calque avant (Y-sort seul).

## État v3 (4 scènes peintes)
- Les 4 zones ont leur peinture + calque avant ; grilles calées sur les polygones Créa, mêmes règles, objets et verrous.
- Cour : les 3 socles (vasque = eau, stèle à l'étoile, stèle au roseau) et l'inscription (relief du mur) sont les éléments peints ; un halo au pied s'allume en bleu quand la pierre est activée. La sortie nord passe par l'arche puis l'escalier de la ziggourat.
- Les suiveurs se placent en file derrière le meneur dès l'arrivée.
- Le calque avant est toujours devant les héros ; il s'estompe (45 %) si le meneur passe derrière.

## v3-persos — personnages peints (Créa, pack-ch1-peint)

- `python3 scripts/prepare-persos.py` lit `manifest.json` du pack et produit `assets/media-persos/` : planches **x2 réduites à la taille d'affichage** (frame 128 px héros/ennemis/PNJ, 224 px boss = frame × display_scale × 1280/1920), WebP q85 alpha ; portraits WebP q90 ; cadres dorés (`cadre-minimap`, `cadre-objectif-frise`, `cadre-objectif-noeud`) ; `persos.json` (frames, ancrage pieds, animations, frames suspectes).
- Échelle : héros ≈ 108 px de haut à 1280×720 (référence Pascal ≈ 105 px), ancrés par les pieds (origine 0.5, 184/192 ; boss 188/192). Combat : ×1.2 (boss ×1.15).
- Animations : idle/walk haut et bas, miroir gauche/droite (`core/poses.js` walkPose) ; attack/cast/hit en combat (événements `actorId` + `pose`), pose tenue 280 ms, fente ±36 px ; Lahama `rage` en phase 2 ; Dumuzi en idle.
- Détection automatique des défauts de découpe (silhouette touchant un bord latéral → `suspects` dans persos.json) ; le test exige zéro suspect.

## v3-final — corrections Créa réintégrées

- Pillard (frame 2) et Balum (frame 16) corrigés par Créa : frames du manifest jouées telles quelles, plus aucun contournement.
- Bandeau d'objectif = vrai 9-slice Créa (`cadre-objectif.png`, marges 94/90 px, échelle 0,5 ; `nineSlice()` dans core/layout.js), 508×104 ; l'objectif tient sur une ligne (police réduite de 20 à 14 px si besoin).
- Mini-carte : cadre Créa or opaque recadré sur l'or (390×355, affiché 180×164), intérieur transparent mesuré par prepare-persos.py ; la carte est centrée dans l'intérieur (`miniMapBox()`), le cadre passe par-dessus les cases.
- Livrable : `dist/Cite-Stellaire-ch1-v3-final.html` (publié aussi en `index.html` sur GitHub Pages).

## État et prochaines idées

État : chapitre 1 jouable de bout en bout (4 zones peintes, énigme des pierres, boss Lahama avec rage), clavier et tactile, sauvegarde locale, HTML autonome < 4,5 Mo.

Prochaines idées :
- Ennemis tournés vers le groupe en combat (miroir) et contraste de Tishra sur fonds sombres.
- Sprites gauche/droite dédiés plutôt que le miroir ; cycles de marche plus marqués.
- Test de mise en page des médaillons en mode tactile.
- Chapitre 2 : nouvelle zone, nouvel ennemi, compétences supplémentaires.
